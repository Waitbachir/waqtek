import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const StatsController = (await import('../backend/controllers/stats.controller.js')).default;
const supabase = (await import('../backend/services/supabase.service.js')).default;

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

test('stats revenue daily returns structured JSON', async () => {
    const ticket = await supabase.insert('tickets', {
        establishment_id: 'est-100',
        queue_id: 'q-1',
        number: '1',
        client_id: 'c-1',
        status: 'served',
        created_at: '2026-02-10T10:00:00.000Z'
    });

    await supabase.insert('transactions', {
        transaction_id: 'tx-1',
        device_id: 'dev-1',
        amount: 120,
        status: 'CONFIRMED',
        ticket_id: ticket.id,
        created_at: '2026-02-10T10:05:00.000Z'
    });

    const req = {
        user: { role: 'manager', id: 'u-1' },
        tenant: { isAdmin: false, establishmentIds: ['est-100'] },
        query: {
            start: '2026-02-01T00:00:00.000Z',
            end: '2026-02-28T23:59:59.999Z'
        }
    };
    const res = createMockRes();

    await StatsController.getRevenueDaily(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.success, true);
    assert.equal(Array.isArray(res.payload.data), true);
    assert.equal(typeof res.payload.totals.revenue, 'number');
});

test('stats vip count returns number', async () => {
    const req = {
        user: { role: 'manager', id: 'u-1' },
        tenant: { isAdmin: false, establishmentIds: ['est-100'] },
        query: {
            start: '2026-02-01T00:00:00.000Z',
            end: '2026-02-28T23:59:59.999Z'
        }
    };
    const res = createMockRes();

    await StatsController.getVipCount(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(typeof res.payload.total_vip_tickets, 'number');
    assert.equal(typeof res.payload.total_revenue, 'number');
});
