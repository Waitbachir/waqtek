import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

const { createLongRequestMonitor } = await import('../backend/middlewares/monitoring.middleware.js');

function createMockReq(path = '/api/test') {
    return { method: 'GET', originalUrl: path };
}

function createMockRes(statusCode = 200) {
    const res = new EventEmitter();
    res.statusCode = statusCode;
    return res;
}

test('createLongRequestMonitor reports slow requests', async () => {
    const events = [];
    let nowValue = 1000;

    const monitor = createLongRequestMonitor({
        thresholdMs: 100,
        now: () => nowValue,
        onLongRequest: (payload) => events.push(payload)
    });

    const req = createMockReq('/api/slow');
    const res = createMockRes(200);

    monitor(req, res, () => {});
    nowValue = 1205;
    res.emit('finish');

    assert.equal(events.length, 1);
    assert.equal(events[0].path, '/api/slow');
    assert.equal(events[0].durationMs >= 205, true);
});

test('createLongRequestMonitor ignores fast requests', async () => {
    const events = [];
    let nowValue = 5000;

    const monitor = createLongRequestMonitor({
        thresholdMs: 300,
        now: () => nowValue,
        onLongRequest: (payload) => events.push(payload)
    });

    const req = createMockReq('/api/fast');
    const res = createMockRes(204);

    monitor(req, res, () => {});
    nowValue = 5200;
    res.emit('finish');

    assert.equal(events.length, 0);
});
