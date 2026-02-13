function normalize(value) {
    if (value === null || typeof value === 'undefined') return '';
    return String(value).trim();
}

function queryFingerprint(req, ignoreKeys = []) {
    const ignored = new Set(ignoreKeys.map((k) => String(k)));
    const query = req.query || {};
    const entries = Object.entries(query)
        .filter(([key, value]) => !ignored.has(key) && typeof value !== 'undefined')
        .map(([key, value]) => [normalize(key), normalize(value)])
        .sort(([a], [b]) => a.localeCompare(b));

    if (entries.length === 0) return 'none';
    return entries.map(([k, v]) => `${k}=${v}`).join('&');
}

function tenantScope(req) {
    const isAdmin = req.user?.role === 'admin';
    if (isAdmin) return 'admin:all';

    const ids = (req.tenant?.establishmentIds || [])
        .map((id) => normalize(id))
        .filter(Boolean)
        .sort();

    return `tenant:${ids.join(',')}`;
}

export function dailyStatsCacheKey(req) {
    const start = normalize(req.query?.start);
    const end = normalize(req.query?.end);
    const est = normalize(req.query?.establishment_id || req.query?.establishmentId);
    return `stats:daily:${tenantScope(req)}:est:${est || 'all'}:start:${start || '-'}:end:${end || '-'}`;
}

export function monthlyStatsCacheKey(req) {
    const start = normalize(req.query?.start);
    const end = normalize(req.query?.end);
    const est = normalize(req.query?.establishment_id || req.query?.establishmentId);
    return `stats:monthly:${tenantScope(req)}:est:${est || 'all'}:start:${start || '-'}:end:${end || '-'}`;
}

export function vipStatsCacheKey(req) {
    const start = normalize(req.query?.start);
    const end = normalize(req.query?.end);
    const est = normalize(req.query?.establishment_id || req.query?.establishmentId);
    return `stats:vip:${tenantScope(req)}:est:${est || 'all'}:start:${start || '-'}:end:${end || '-'}`;
}

export function queueStatsCacheKey(req) {
    const queueId = normalize(req.params?.queueId);
    return `stats:queue:${tenantScope(req)}:queue:${queueId || '-'}`;
}

export function establishmentStatsCacheKey(req) {
    const estId = normalize(req.params?.estId);
    return `stats:establishment:${tenantScope(req)}:est:${estId || '-'}`;
}

export function dashboardStatsCacheKey(req) {
    return `stats:dashboard:${tenantScope(req)}`;
}

export function activeQueuesCacheKey(req) {
    const est = normalize(req.query?.establishment_id || req.query?.establishmentId);
    return `queues:active:${tenantScope(req)}:est:${est || 'all'}`;
}

export function ticketsListCacheKey(req) {
    return `tickets:list:${tenantScope(req)}:q:${queryFingerprint(req)}`;
}

export function ticketsByQueueCacheKey(req) {
    const queueId = normalize(req.params?.queueId);
    return `tickets:queue:${tenantScope(req)}:queue:${queueId || '-'}:q:${queryFingerprint(req)}`;
}

export function ticketByIdCacheKey(req) {
    const id = normalize(req.params?.id);
    return `tickets:id:${tenantScope(req)}:id:${id || '-'}`;
}

export function establishmentsListCacheKey(req) {
    return `establishments:list:${tenantScope(req)}`;
}

export function queuesByEstablishmentCacheKey(req) {
    const estId = normalize(req.params?.estId);
    return `queues:establishment:${tenantScope(req)}:est:${estId || '-'}:q:${queryFingerprint(req)}`;
}

export function publicQueuesByEstablishmentCacheKey(req) {
    const estId = normalize(req.params?.estId);
    return `queues:public:establishment:${estId || '-'}:q:${queryFingerprint(req)}`;
}

export function videosByEstablishmentCacheKey(req) {
    const estId = normalize(req.params?.establishmentId);
    return `videos:establishment:${tenantScope(req)}:est:${estId || '-'}`;
}

export function videoByIdCacheKey(req) {
    const id = normalize(req.params?.id);
    return `videos:id:${tenantScope(req)}:id:${id || '-'}`;
}
