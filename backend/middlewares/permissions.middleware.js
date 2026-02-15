import { normalizeRole } from '../core/rbac.js';

export function requirePermission(...permissions) {
    const expected = permissions.filter(Boolean);

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHENTICATED' });
        }

        if (!expected.length) {
            return next();
        }

        const granted = Array.isArray(req.permissions) ? req.permissions : [];
        const allowed = expected.some((permission) => granted.includes(permission));

        if (!allowed) {
            return res.status(403).json({
                error: 'FORBIDDEN',
                message: `Missing required permission (${expected.join(' | ')})`
            });
        }

        return next();
    };
}

export function requireNormalizedRole(...roles) {
    const normalizedRoles = roles.map((role) => normalizeRole(role)).filter(Boolean);

    return (req, res, next) => {
        const userRole = normalizeRole(req.user?.normalizedRole || req.user?.role);
        if (!userRole || !normalizedRoles.includes(userRole)) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }
        return next();
    };
}

