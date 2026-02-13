import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const { signIotRequest, signIotBody } = await import('../backend/core/crypto.util.js');
const Device = (await import('../backend/models/device.model.js')).default;
const { verifyDeviceSignature } = await import('../backend/middlewares/verifyDeviceSignature.js');

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

test('signIotRequest should be deterministic', () => {
    const args = {
        deviceId: 'esp32-kiosk-1',
        timestamp: '1700000000000',
        method: 'POST',
        path: '/api/iot/payments/report',
        body: { ticket_id: '12', amount: 50 },
        secretKey: 'secret-123'
    };

    const first = signIotRequest(args);
    const second = signIotRequest({ ...args, body: { amount: 50, ticket_id: '12' } });

    assert.equal(first, second);
    assert.equal(typeof first, 'string');
    assert.equal(first.length, 64);
});

test('verifyDeviceSignature rejects unsigned requests', async () => {
    const req = {
        headers: {},
        method: 'POST',
        originalUrl: '/api/iot/payments/report',
        body: {}
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.error, 'UNSIGNED_REQUEST');
});

test('verifyDeviceSignature accepts valid HMAC signature', async () => {
    const deviceId = `esp32-${Date.now()}`;
    const secret = 'super-secret-device-key';

    await Device.create({
        device_id: deviceId,
        secret_key: secret,
        establishment_id: 'est-1',
        active: true
    });

    const body = {
        transaction_id: 'tx-100',
        ticket_id: 't-100',
        amount: 100,
        status: 'CONFIRMED'
    };
    const timestamp = Date.now().toString();

    const req = {
        headers: {
            'x-device-id': deviceId,
            'x-signature-timestamp': timestamp,
            'x-signature': signIotRequest({
                deviceId,
                timestamp,
                method: 'POST',
                path: '/api/iot/payments/report',
                body,
                secretKey: secret
            })
        },
        method: 'POST',
        originalUrl: '/api/iot/payments/report?trace=1',
        body
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
    assert.equal(req.device.device_id, deviceId);
});

test('verifyDeviceSignature rejects invalid signature', async () => {
    const deviceId = `esp32-bad-${Date.now()}`;

    await Device.create({
        device_id: deviceId,
        secret_key: 'expected-secret',
        establishment_id: 'est-2',
        active: true
    });

    const req = {
        headers: {
            'x-device-id': deviceId,
            'x-signature-timestamp': Date.now().toString(),
            'x-signature': 'invalid-signature'
        },
        method: 'POST',
        originalUrl: '/api/iot/payments/report',
        body: { transaction_id: 'tx-bad' }
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.payload.error, 'INVALID_SIGNATURE');
});

test('verifyDeviceSignature accepts body-only HMAC signature', async () => {
    const deviceId = `esp32-body-${Date.now()}`;
    const secret = 'body-secret-key';
    const body = {
        transaction_id: 'tx-body-1',
        ticket_id: 't-body-1',
        amount: 120,
        status: 'CONFIRMED'
    };

    await Device.create({
        device_id: deviceId,
        secret_key: secret,
        establishment_id: 'est-body',
        status: 'ACTIVE',
        active: true
    });

    const req = {
        headers: {
            'x-device-id': deviceId,
            'x-signature': signIotBody({ body, secretKey: secret })
        },
        method: 'POST',
        originalUrl: '/api/iot/payments/report',
        body
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);

    const updated = await Device.findByDeviceId(deviceId);
    assert.equal(typeof updated.last_seen, 'string');
});

test('verifyDeviceSignature rejects disabled device', async () => {
    const deviceId = `esp32-disabled-${Date.now()}`;
    const secret = 'disabled-secret';
    const body = { ping: true };

    await Device.create({
        device_id: deviceId,
        secret_key: secret,
        establishment_id: 'est-disabled',
        status: 'DISABLED',
        active: false
    });

    const req = {
        headers: {
            'x-device-id': deviceId,
            'x-signature': signIotBody({ body, secretKey: secret })
        },
        method: 'POST',
        originalUrl: '/api/iot/payments/report',
        body
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.payload.error, 'DEVICE_DISABLED');
});
