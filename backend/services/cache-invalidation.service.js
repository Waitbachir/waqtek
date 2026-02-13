import cacheService from '../core/cache.service.js';

class CacheInvalidationService {
    async invalidateOnTicketMutation() {
        // Coarse invalidation ensures consistency across tenants/scopes.
        await cacheService.delByPrefix('stats:');
        await cacheService.delByPrefix('tickets:');
        await cacheService.delByPrefix('queues:active:');
    }
}

export default new CacheInvalidationService();
