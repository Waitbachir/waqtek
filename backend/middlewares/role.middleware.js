import { normalizeRole } from '../core/rbac.js';

export function requireRole(...roles) {
    const expectedRoles = roles.map((role) => normalizeRole(role)).filter(Boolean);

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'UNAUTHENTICATED' });
        }

        const actualRole = normalizeRole(req.user.normalizedRole || req.user.role);
        if (!actualRole || !expectedRoles.includes(actualRole)) {
            return res.status(403).json({ error: 'FORBIDDEN' });
        }

        return next();
    };
}
