import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import express from 'express';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

const User = (await import('../backend/models/user.model.js')).default;
const Establishment = (await import('../backend/models/establishment.model.js')).default;
const Queue = (await import('../backend/models/queue.model.js')).default;
const Ticket = (await import('../backend/models/ticket.model.js')).default;
const queuesRoutes = (await import('../backend/routes/queues.routes.js')).default;
const ManagerContextService = (await import('../backend/services/manager-context.service.js')).default;

function buildToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
    );
}

async function withServer(run) {
    const app = express();
    app.use(express.json());
    app.use('/queues', queuesRoutes);
    const server = app.listen(0);

    try {
        const address = server.address();
        const port = typeof address === 'object' && address ? address.port : 0;
        await run(port);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
}

test('GET /queues/:queueId/counters/available returns only free counters', async () => {
    ManagerContextService.__resetForTests();

    const manager = await User.create({
        email: `manager-free-${Date.now()}@example.com`,
        password: 'secret123',
        role: 'manager'
    });
    const est = await Establishment.create({
        name: 'Est Free Counters',
        manager_id: manager.id
    });
    const queue = await Queue.create({
        establishmentid: est.id,
        name: 'Queue A',
        type: 'standard',
        description: ''
    });

    const calledTicket = await Ticket.create({
        queueId: queue.id,
        establishmentId: est.id,
        clientId: '123e4567-e89b-12d3-a456-426614174222',
        number: '1',
        status: 'called'
    });
    await Ticket.update(calledTicket.id, { counter: 2 });

    const token = buildToken(manager);
    await withServer(async (port) => {
        const res = await fetch(`http://127.0.0.1:${port}/queues/${queue.id}/counters/available`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const payload = await res.json();

        assert.equal(res.status, 200);
        assert.equal(Array.isArray(payload.availableCounters), true);
        assert.equal(payload.availableCounters.includes(2), false);
        assert.equal(payload.availableCounters.includes(1), true);
    });
});

test('POST/GET /queues/manager/context stores and returns selected queue+counter', async () => {
    ManagerContextService.__resetForTests();

    const manager = await User.create({
        email: `manager-context-${Date.now()}@example.com`,
        password: 'secret123',
        role: 'manager'
    });
    const est = await Establishment.create({
        name: 'Est Context',
        manager_id: manager.id
    });
    const queue = await Queue.create({
        establishmentid: est.id,
        name: 'Queue B',
        type: 'standard',
        description: ''
    });

    const token = buildToken(manager);
    await withServer(async (port) => {
        const saveRes = await fetch(`http://127.0.0.1:${port}/queues/manager/context`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                queueId: queue.id,
                counter: 3
            })
        });
        const savePayload = await saveRes.json();
        assert.equal(saveRes.status, 200);
        assert.equal(savePayload.context.queueId, String(queue.id));
        assert.equal(savePayload.context.counter, 3);

        const getRes = await fetch(`http://127.0.0.1:${port}/queues/manager/context`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const getPayload = await getRes.json();
        assert.equal(getRes.status, 200);
        assert.equal(getPayload.context.queueId, String(queue.id));
        assert.equal(getPayload.context.counter, 3);
    });
});

test('POST /queues/manager/context rejects occupied counters', async () => {
    ManagerContextService.__resetForTests();

    const manager = await User.create({
        email: `manager-busy-${Date.now()}@example.com`,
        password: 'secret123',
        role: 'manager'
    });
    const est = await Establishment.create({
        name: 'Est Busy',
        manager_id: manager.id
    });
    const queue = await Queue.create({
        establishmentid: est.id,
        name: 'Queue C',
        type: 'standard',
        description: ''
    });

    const busyTicket = await Ticket.create({
        queueId: queue.id,
        establishmentId: est.id,
        clientId: '123e4567-e89b-12d3-a456-426614174333',
        number: '2',
        status: 'called'
    });
    await Ticket.update(busyTicket.id, { counter: 1 });

    const token = buildToken(manager);
    await withServer(async (port) => {
        const res = await fetch(`http://127.0.0.1:${port}/queues/manager/context`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                queueId: queue.id,
                counter: 1
            })
        });
        const payload = await res.json();
        assert.equal(res.status, 409);
        assert.equal(payload.error, 'COUNTER_OCCUPIED');
    });
});
