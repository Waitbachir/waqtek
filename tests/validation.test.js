import test from 'node:test';
import assert from 'node:assert/strict';

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

test('validateRequest rejects invalid auth login payload', () => {
    const middleware = validateRequest(schemas.authLogin);
    const req = { body: { email: 'bad', password: '123' }, params: {}, query: {} };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 400);
    assert.equal(res.payload.error, 'VALIDATION_ERROR');
});

test('validateRequest accepts valid stats range query', () => {
    const middleware = validateRequest(schemas.statsRangeQuery);
    const req = {
        body: {},
        params: {},
        query: {
            start: '2026-02-01T00:00:00.000Z',
            end: '2026-02-10T23:59:59.999Z'
        }
    };
    const res = createMockRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
});
