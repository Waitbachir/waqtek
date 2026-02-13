import Establishment from '../models/establishment.model.js';

function toStringId(value) {
    if (value === null || typeof value === 'undefined') return null;
    const str = String(value).trim();
    return str ? str : null;
}

function extractRequestedEstablishmentIds(req) {
    const candidates = [
        req.params?.estId,
        req.params?.establishmentId,
        req.body?.establishment_id,
        req.body?.establishmentId,
        req.body?.establishmentid,
        req.query?.establishment_id,
        req.query?.establishmentId
    ];

    return [...new Set(candidates.map(toStringId).filter(Boolean))];
}

function canAccessEstablishmentId(tenant, establishmentId) {
    if (!tenant || tenant.isAdmin) return true;
    const normalized = toStringId(establishmentId);
    if (!normalized) return false;
    return (tenant.establishmentIds || []).includes(normalized);
}

function filterRowsByEstablishment(tenant, rows = [], resolver) {
    const list = Array.isArray(rows) ? rows : [];
    if (!tenant || tenant.isAdmin) return list;

    return list.filter((row) => {
        const id = resolver ? resolver(row) : (row?.establishment_id ?? row?.establishmentId ?? row?.establishmentid);
        return canAccessEstablishmentId(tenant, id);
    });
}

export async function validateTenant(req, res, next) {
    try {
        const isAdmin = req.user?.role === 'admin';
        if (isAdmin) {
            const tenant = { isAdmin: true, establishmentIds: [] };
            req.tenant = {
                ...tenant,
                canAccessEstablishmentId: () => true,
                filterByEstablishment: (rows) => (Array.isArray(rows) ? rows : [])
            };
            return next();
        }

        const managerId = req.user?.id;
        if (!managerId) {
            return res.status(401).json({ error: 'UNAUTHENTICATED' });
        }

        const establishments = await Establishment.getByManagerId(managerId);
        const establishmentIds = (Array.isArray(establishments) ? establishments : [])
            .map((est) => toStringId(est.id))
            .filter(Boolean);

        const tenant = { isAdmin: false, establishmentIds };
        req.tenant = {
            ...tenant,
            canAccessEstablishmentId: (id) => canAccessEstablishmentId(tenant, id),
            filterByEstablishment: (rows, resolver) => filterRowsByEstablishment(tenant, rows, resolver)
        };

        const requestedIds = extractRequestedEstablishmentIds(req);
        const hasTenantMismatch = requestedIds.some((id) => !canAccessEstablishmentId(tenant, id));

        if (hasTenantMismatch) {
            return res.status(403).json({
                error: 'TENANT_MISMATCH',
                message: 'Cet établissement n\'appartient pas au tenant authentifie'
            });
        }

        return next();
    } catch (error) {
        return res.status(500).json({
            error: 'TENANT_VALIDATION_ERROR',
            message: error.message || 'Erreur validation tenant'
        });
    }
}
