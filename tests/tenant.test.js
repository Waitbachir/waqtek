import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const { validateTenant } = await import('../backend/middlewares/validateTenant.js');
const Establishment = (await import('../backend/models/establishment.model.js')).default;
const Queue = (await import('../backend/models/queue.model.js')).default;
const Ticket = (await import('../backend/models/ticket.model.js')).default;
const QueuesController = (await import('../backend/controllers/queues.controller.js')).default;
const TicketsController = (await import('../backend/controllers/tickets.controller.js')).default;

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

test('validateTenant injects tenant ids for non-admin', async () => {
    const est = await Establishment.create({ name: 'Tenant A', manager_id: 'manager-A' });

    const req = {
        user: { id: 'manager-A', role: 'manager' },
        params: {},
        query: {},
        body: {}
    };
    const res = createMockRes();

    let nextCalled = false;
    await validateTenant(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.tenant);
    assert.equal(req.tenant.isAdmin, false);
    assert.ok(req.tenant.establishmentIds.includes(String(est.id)));
});

test('validateTenant blocks mismatched establishment_id', async () => {
    await Establishment.create({ name: 'Tenant B', manager_id: 'manager-B' });

    const req = {
        user: { id: 'manager-C', role: 'manager' },
        params: {},
        query: {},
        body: { establishment_id: '9999' }
    };
    const res = createMockRes();

    let nextCalled = false;
    await validateTenant(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.error, 'TENANT_MISMATCH');
});

test('TicketsController.create blocks queue from another tenant', async () => {
    const ownerEst = await Establishment.create({ name: 'Owner', manager_id: 'owner-1' });
    const foreignEst = await Establishment.create({ name: 'Foreign', manager_id: 'owner-2' });

    await Queue.create({
        establishmentid: foreignEst.id,
        name: 'Queue Foreign',
        type: 'standard',
        description: 'queue'
    });

    const req = {
        user: { id: 'owner-1', role: 'manager' },
        tenant: { isAdmin: false, establishmentIds: [String(ownerEst.id)] },
        body: {
            queueId: 1,
            clientId: '123e4567-e89b-12d3-a456-426614174000'
        }
    };

    const res = createMockRes();
    await TicketsController.create(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.error, 'Acces refuse (tenant)');
});

test('QueuesController.getAll only returns tenant establishments queues', async () => {
    const estA = await Establishment.create({ name: 'Tenant A2', manager_id: 'owner-A2' });
    const estB = await Establishment.create({ name: 'Tenant B2', manager_id: 'owner-B2' });

    await Queue.create({ establishmentid: estA.id, name: 'A Queue', type: 'standard', description: '' });
    await Queue.create({ establishmentid: estB.id, name: 'B Queue', type: 'standard', description: '' });

    const req = {
        user: { id: 'owner-A2', role: 'manager' },
        tenant: {
            isAdmin: false,
            establishmentIds: [String(estA.id)],
            canAccessEstablishmentId: (id) => String(id) === String(estA.id)
        }
    };
    const res = createMockRes();

    await QueuesController.getAll(req, res);

    assert.equal(res.statusCode, 200);
    const queues = res.payload?.queues || [];
    assert.equal(Array.isArray(queues), true);
    assert.equal(
        queues.every((q) => String(q.establishmentid ?? q.establishment_id ?? q.establishmentId) === String(estA.id)),
        true
    );
});

test('TicketsController.getById blocks reading ticket from another tenant', async () => {
    const estA = await Establishment.create({ name: 'Tenant A3', manager_id: 'owner-A3' });
    const estB = await Establishment.create({ name: 'Tenant B3', manager_id: 'owner-B3' });

    const queueA = await Queue.create({ establishmentid: estA.id, name: 'Queue A3', type: 'standard', description: '' });
    const queueB = await Queue.create({ establishmentid: estB.id, name: 'Queue B3', type: 'standard', description: '' });

    const ownTicket = await Ticket.create({
        queueId: queueA.id,
        establishmentId: estA.id,
        clientId: '123e4567-e89b-12d3-a456-426614174010',
        number: '1',
        status: 'waiting'
    });
    const foreignTicket = await Ticket.create({
        queueId: queueB.id,
        establishmentId: estB.id,
        clientId: '123e4567-e89b-12d3-a456-426614174011',
        number: '1',
        status: 'waiting'
    });

    const reqOwn = {
        user: { id: 'owner-A3', role: 'manager' },
        tenant: {
            isAdmin: false,
            establishmentIds: [String(estA.id)],
            canAccessEstablishmentId: (id) => String(id) === String(estA.id)
        },
        params: { id: String(ownTicket.id) }
    };
    const resOwn = createMockRes();
    await TicketsController.getById(reqOwn, resOwn);
    assert.equal(resOwn.statusCode, 200);

    const reqForeign = {
        user: { id: 'owner-A3', role: 'manager' },
        tenant: {
            isAdmin: false,
            establishmentIds: [String(estA.id)],
            canAccessEstablishmentId: (id) => String(id) === String(estA.id)
        },
        params: { id: String(foreignTicket.id) }
    };
    const resForeign = createMockRes();
    await TicketsController.getById(reqForeign, resForeign);
    assert.equal(resForeign.statusCode, 403);
    assert.equal(resForeign.payload.error, 'Acces refuse (tenant)');
});
