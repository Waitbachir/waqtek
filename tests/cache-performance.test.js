import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const cacheService = (await import('../backend/core/cache.service.js')).default;
const { cacheResponse } = await import('../backend/middlewares/cache.middleware.js');
const { dailyStatsCacheKey } = await import('../backend/core/cache.keys.js');
const cacheInvalidationService = (await import('../backend/services/cache-invalidation.service.js')).default;

function createMockRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.payload = body;
            return this;
        }
    };
}

test('cache middleware returns cached payload on second request', async () => {
    const middleware = cacheResponse({
        ttlSeconds: 300,
        keyBuilder: dailyStatsCacheKey
    });

    const reqBase = {
        method: 'GET',
        user: { role: 'manager' },
        tenant: { establishmentIds: ['est-1'] },
        query: {
            start: '2026-02-01T00:00:00.000Z',
            end: '2026-02-28T23:59:59.999Z'
        }
    };

    let handlerCalls = 0;

    const req1 = { ...reqBase };
    const res1 = createMockRes();
    await middleware(req1, res1, () => {
        handlerCalls += 1;
        return res1.json({ success: true, source: 'db' });
    });

    assert.equal(handlerCalls, 1);
    assert.equal(res1.payload.source, 'db');

    const req2 = { ...reqBase };
    const res2 = createMockRes();
    await middleware(req2, res2, () => {
        handlerCalls += 1;
        return res2.json({ success: true, source: 'db' });
    });

    assert.equal(handlerCalls, 1);
    assert.equal(res2.payload.source, 'db');
});

test('cache invalidation clears stats and active queues keys', async () => {
    await cacheService.set('stats:daily:test-1', JSON.stringify({ ok: true }), 300);
    await cacheService.set('queues:active:test-1', JSON.stringify({ ok: true }), 300);
    await cacheService.set('other:key', JSON.stringify({ ok: true }), 300);

    await cacheInvalidationService.invalidateOnTicketMutation();

    const statsAfter = await cacheService.get('stats:daily:test-1');
    const queuesAfter = await cacheService.get('queues:active:test-1');
    const otherAfter = await cacheService.get('other:key');

    assert.equal(statsAfter, null);
    assert.equal(queuesAfter, null);
    assert.equal(typeof otherAfter, 'string');

    await cacheService.del('other:key');
});

