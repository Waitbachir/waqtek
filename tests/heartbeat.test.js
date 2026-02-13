import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.USE_FAKE_SUPABASE = 'true';

const { signIotRequest } = await import('../backend/core/crypto.util.js');
const Device = (await import('../backend/models/device.model.js')).default;
const IotController = (await import('../backend/controllers/iot.controller.js')).default;
const { verifyDeviceSignature } = await import('../backend/middlewares/verifyDeviceSignature.js');
const { validateRequest } = await import('../backend/middlewares/validateRequest.js');
const { schemas } = await import('../backend/core/validation.schemas.js');

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

test('IoT heartbeat signed request updates device heartbeat metadata', async () => {
    const deviceId = `esp32-heartbeat-${Date.now()}`;
    const secret = 'hb-secret-key';
    const path = '/api/iot/devices/heartbeat';
    const timestamp = Date.now().toString();
    const body = {
        uptime_ms: 654321,
        fw_version: '1.0.7',
        free_heap: 120000,
        status: 'OK',
        ip: '192.168.1.44'
    };

    await Device.create({
        device_id: deviceId,
        secret_key: secret,
        establishment_id: 'est-heartbeat',
        active: true
    });

    const req = {
        headers: {
            'x-device-id': deviceId,
            'x-signature-timestamp': timestamp,
            'x-signature': signIotRequest({
                deviceId,
                timestamp,
                method: 'POST',
                path,
                body,
                secretKey: secret
            })
        },
        method: 'POST',
        originalUrl: `${path}?trace=1`,
        body
    };

    const res = createMockRes();
    let nextCalled = false;

    await verifyDeviceSignature(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);

    await IotController.reportHeartbeat(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.payload?.data?.device_id, deviceId);
    assert.equal(res.payload?.data?.heartbeat_count, 1);

    const updated = await Device.findByDeviceId(deviceId);
    assert.equal(updated.last_uptime_ms, 654321);
    assert.equal(updated.last_fw_version, '1.0.7');
    assert.equal(updated.last_status, 'OK');
    assert.equal(updated.last_ip, '192.168.1.44');
    assert.equal(typeof updated.last_heartbeat_at, 'string');
});

test('heartbeat payload validation rejects malformed body', () => {
    const middleware = validateRequest(schemas.iotHeartbeat);
    const req = {
        body: {
            uptime_ms: -10,
            fw_version: '',
            status: 'BAD_STATUS'
        },
        params: {},
        query: {}
    };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.error, 'VALIDATION_ERROR');
});

