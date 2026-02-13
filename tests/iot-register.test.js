import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';
process.env.IOT_REGISTRATION_TOKEN = 'reg-token-test';

const IotController = (await import('../backend/controllers/iot.controller.js')).default;

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

test('registerDevice generates device_id and secret_key when device_id is omitted', async () => {
    const req = {
        headers: {
            'x-registration-token': 'reg-token-test'
        },
        body: {
            establishment_id: 'est-auto-1'
        }
    };
    const res = createMockRes();

    await IotController.registerDevice(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(typeof res.payload?.device?.device_id, 'string');
    assert.equal(res.payload?.device?.device_id.length > 5, true);
    assert.equal(typeof res.payload?.device?.secret_key, 'string');
    assert.equal(res.payload?.device?.status, 'DISABLED');
    assert.equal(res.payload?.device?.last_seen, null);
});

test('registerDevice rejects invalid registration token', async () => {
    const req = {
        headers: {
            'x-registration-token': 'wrong-token'
        },
        body: {
            establishment_id: 'est-auto-2'
        }
    };
    const res = createMockRes();

    await IotController.registerDevice(req, res);

    assert.equal(res.statusCode, 403);
    assert.equal(res.payload?.error, 'REGISTRATION_FORBIDDEN');
});

