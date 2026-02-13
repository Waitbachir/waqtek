import test from 'node:test';
import assert from 'node:assert/strict';

const {
    getRateLimitConfig,
    DEFAULT_RATE_LIMIT_MAX,
    DEFAULT_RATE_LIMIT_WINDOW_MS
} = await import('../backend/middlewares/security.middleware.js');
const errorHandlerModule = await import('../backend/middlewares/error.middleware.js');
const errorHandler = errorHandlerModule.default;
const { notFoundHandler } = errorHandlerModule;

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

test('security middleware defaults to 100 req/min', () => {
    const cfg = getRateLimitConfig({});
    assert.equal(cfg.max, DEFAULT_RATE_LIMIT_MAX);
    assert.equal(cfg.windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS);
    assert.equal(cfg.max, 100);
    assert.equal(cfg.windowMs, 60_000);
});

test('errorHandler masks 500 details in production', () => {
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
        const req = { originalUrl: '/api/x', method: 'GET' };
        const res = createMockRes();
        const err = new Error('sensitive internals');
        errorHandler(err, req, res, () => {});

        assert.equal(res.statusCode, 500);
        assert.equal(res.payload.error, 'INTERNAL_SERVER_ERROR');
        assert.equal(res.payload.message, 'Internal Server Error');
        assert.equal(Object.prototype.hasOwnProperty.call(res.payload, 'stack'), false);
    } finally {
        process.env.NODE_ENV = prevEnv;
    }
});

test('notFoundHandler returns 404 payload', () => {
    const req = { originalUrl: '/api/unknown', method: 'GET' };
    const res = createMockRes();

    notFoundHandler(req, res);

    assert.equal(res.statusCode, 404);
    assert.equal(res.payload.error, 'NOT_FOUND');
});

