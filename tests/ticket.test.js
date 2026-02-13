import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const Queue = (await import('../backend/models/queue.model.js')).default;
const Ticket = (await import('../backend/models/ticket.model.js')).default;
const TicketsController = (await import('../backend/controllers/tickets.controller.js')).default;
const esp32Service = (await import('../backend/services/esp32.service.js')).default;

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

test('TicketsController.create creates a ticket for public flow', async () => {
    const queue = await Queue.create({
        establishmentid: 'est-pub-1',
        name: 'Queue Public',
        type: 'standard',
        description: 'public queue'
    });

    const req = {
        body: {
            queueId: queue.id,
            clientId: '123e4567-e89b-12d3-a456-426614174001'
        }
    };
    const res = createMockRes();

    await TicketsController.create(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.payload.message.includes('Ticket'), true);
    assert.ok(res.payload.ticket?.id);
});

test('TicketsController.create rejects duplicate active ticket for same client+queue', async () => {
    const queue = await Queue.create({
        establishmentid: 'est-pub-2',
        name: 'Queue Public 2',
        type: 'standard',
        description: 'public queue 2'
    });

    const clientId = '123e4567-e89b-12d3-a456-426614174002';

    await Ticket.create({
        queueId: queue.id,
        establishmentId: queue.establishmentid,
        clientId,
        number: '1',
        status: 'waiting'
    });

    const req = {
        body: {
            queueId: queue.id,
            clientId
        }
    };
    const res = createMockRes();

    await TicketsController.create(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.payload.error, 'TICKET_ALREADY_EXISTS');
});

test('TicketsController.createPosPublic returns 502 when ESP32 send fails', async () => {
    const originalProcess = esp32Service.processVipPaymentWithTicket;
    const originalFlag = process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
    const queue = await Queue.create({
        establishmentid: 'est-pos-1',
        name: 'Queue POS 1',
        type: 'standard',
        description: 'pos queue 1'
    });

    try {
        process.env.ESP32_VIP_REQUIRE_PRECONFIRM = 'true';
        esp32Service.processVipPaymentWithTicket = async () => ({
            confirmed: false,
            status: 'FAILED',
            error: 'ESP32_SEND_FAILED',
            transaction_id: 'tx-send-failed-1',
            esp32: { sent: false, status: 404, error: 'Not Found' }
        });

        const req = {
            body: {
                queueId: queue.id,
                remoteAccess: true,
                device_id: 'esp32-pos-1'
            }
        };
        const res = createMockRes();

        await TicketsController.createPosPublic(req, res);

        assert.equal(res.statusCode, 502);
        assert.equal(res.payload.error, 'ESP32_SEND_FAILED');
    } finally {
        esp32Service.processVipPaymentWithTicket = originalProcess;
        if (typeof originalFlag === 'undefined') {
            delete process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
        } else {
            process.env.ESP32_VIP_REQUIRE_PRECONFIRM = originalFlag;
        }
    }
});

test('TicketsController.createPosPublic returns timeout code when payment confirmation expires', async () => {
    const originalProcess = esp32Service.processVipPaymentWithTicket;
    const originalFlag = process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
    const queue = await Queue.create({
        establishmentid: 'est-pos-2',
        name: 'Queue POS 2',
        type: 'standard',
        description: 'pos queue 2'
    });

    try {
        process.env.ESP32_VIP_REQUIRE_PRECONFIRM = 'true';
        esp32Service.processVipPaymentWithTicket = async () => ({
            confirmed: false,
            status: 'FAILED',
            error: 'PAYMENT_NOT_CONFIRMED',
            transaction_id: 'tx-timeout-1',
            confirmation: { status: 'PENDING', reason: 'confirmation_timeout' }
        });

        const req = {
            body: {
                queueId: queue.id,
                remoteAccess: true,
                device_id: 'esp32-pos-2'
            }
        };
        const res = createMockRes();

        await TicketsController.createPosPublic(req, res);

        assert.equal(res.statusCode, 402);
        assert.equal(res.payload.error, 'PAYMENT_CONFIRMATION_TIMEOUT');
    } finally {
        esp32Service.processVipPaymentWithTicket = originalProcess;
        if (typeof originalFlag === 'undefined') {
            delete process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
        } else {
            process.env.ESP32_VIP_REQUIRE_PRECONFIRM = originalFlag;
        }
    }
});

test('TicketsController.createPosPublic (default mode) creates ticket then sends VIP to ESP32', async () => {
    const originalVip = esp32Service.functionVIP;
    const originalFlag = process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
    const queue = await Queue.create({
        establishmentid: 'est-pos-3',
        name: 'Queue POS 3',
        type: 'standard',
        description: 'pos queue 3'
    });

    try {
        delete process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
        let sentPayload = null;
        esp32Service.functionVIP = async (payload) => {
            sentPayload = payload;
            return { sent: true, status: 200, data: { ok: true } };
        };

        const req = {
            body: {
                queueId: queue.id,
                remoteAccess: true,
                device_id: 'esp32-pos-3'
            }
        };
        const res = createMockRes();

        await TicketsController.createPosPublic(req, res);

        assert.equal(res.statusCode, 201);
        assert.equal(res.payload.remoteAccess, true);
        assert.equal(res.payload.paymentRequired, true);
        assert.ok(res.payload.ticket?.id);
        assert.equal(sentPayload?.id_ticket, res.payload.ticket.id);
    } finally {
        esp32Service.functionVIP = originalVip;
        if (typeof originalFlag === 'undefined') {
            delete process.env.ESP32_VIP_REQUIRE_PRECONFIRM;
        } else {
            process.env.ESP32_VIP_REQUIRE_PRECONFIRM = originalFlag;
        }
    }
});
