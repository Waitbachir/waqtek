const ROLE_ALIASES = {
    ADMIN: ['ADMIN', 'admin'],
    MANAGER: ['MANAGER', 'manager', 'enterprise'],
    WAQTEK_TEAM: ['WAQTEK_TEAM', 'waqtek_team', 'waqtek'],
    USER: ['USER', 'user', 'client', 'CLIENT'],
    PUBLIC: ['PUBLIC', 'public']
};

const ROLE_PERMISSIONS = {
    ADMIN: [
        'auth:me:read',
        'admin:users:read',
        'admin:users:role:update',
        'dashboard:admin:read',
        'stats:read',
        'establishments:read',
        'establishments:write',
        'establishments:delete',
        'queues:read',
        'queues:write',
        'queues:delete',
        'tickets:read',
        'tickets:create',
        'tickets:update',
        'tickets:delete',
        'videos:read',
        'videos:write',
        'subscriptions:read',
        'subscriptions:write',
        'subscriptions:delete',
        'push:write',
        'display:read'
    ],
    MANAGER: [
        'auth:me:read',
        'dashboard:manager:read',
        'stats:read',
        'establishments:read',
        'establishments:write',
        'queues:read',
        'queues:write',
        'tickets:read',
        'tickets:create',
        'tickets:update',
        'videos:read',
        'videos:write',
        'subscriptions:read',
        'subscriptions:write',
        'push:write',
        'display:read'
    ],
    WAQTEK_TEAM: [
        'auth:me:read',
        'waqtek:backoffice:read',
        'waqtek:backoffice:write',
        'stats:read',
        'establishments:read',
        'establishments:write',
        'queues:read',
        'queues:write',
        'videos:read'
    ],
    USER: ['auth:me:read'],
    PUBLIC: []
};

export function normalizeRole(role) {
    if (!role) return null;
    const raw = String(role).trim();
    if (!raw) return null;

    const canonical = Object.entries(ROLE_ALIASES).find(([, aliases]) =>
        aliases.some((alias) => alias.toLowerCase() === raw.toLowerCase())
    );

    return canonical?.[0] || raw.toUpperCase();
}

export function getPermissionsForRole(role) {
    const normalized = normalizeRole(role);
    return [...(ROLE_PERMISSIONS[normalized] || ROLE_PERMISSIONS.PUBLIC)];
}

export function hasPermission(role, permission) {
    if (!permission) return false;
    const list = getPermissionsForRole(role);
    return list.includes(permission);
}

export function isAdminRole(role) {
    return normalizeRole(role) === 'ADMIN';
}
