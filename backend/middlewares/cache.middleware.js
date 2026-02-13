import cacheService from '../core/cache.service.js';

export function cacheResponse({ ttlSeconds = 300, keyBuilder }) {
    return async (req, res, next) => {
        try {
            if (req.method !== 'GET' || typeof keyBuilder !== 'function') {
                return next();
            }

            const key = keyBuilder(req);
            if (!key) return next();

            const cached = await cacheService.get(key);
            if (cached) {
                const payload = JSON.parse(cached);
                return res.status(200).json(payload);
            }

            const originalJson = res.json.bind(res);
            res.json = async (body) => {
                try {
                    await cacheService.set(key, JSON.stringify(body), ttlSeconds);
                } catch (_) {}
                return originalJson(body);
            };

            return next();
        } catch (_) {
            return next();
        }
    };
}

