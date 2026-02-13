import crypto from 'crypto';

function stableStringify(value) {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
}

function buildSigningPayload({ deviceId, timestamp, method, path, body }) {
    return [
        String(deviceId || '').trim(),
        String(timestamp || '').trim(),
        String(method || '').toUpperCase(),
        String(path || '').trim(),
        stableStringify(body ?? {})
    ].join('.');
}

export function signIotRequest({ deviceId, timestamp, method, path, body, secretKey }) {
    const signingPayload = buildSigningPayload({ deviceId, timestamp, method, path, body });
    return crypto
        .createHmac('sha256', String(secretKey || ''))
        .update(signingPayload)
        .digest('hex');
}

export function signIotBody({ body, secretKey }) {
    const payload = stableStringify(body ?? {});
    return crypto
        .createHmac('sha256', String(secretKey || ''))
        .update(payload)
        .digest('hex');
}

export function verifyIotSignature({ providedSignature, expectedSignature }) {
    const provided = Buffer.from(String(providedSignature || ''), 'utf8');
    const expected = Buffer.from(String(expectedSignature || ''), 'utf8');

    if (provided.length === 0 || provided.length !== expected.length) {
        return false;
    }

    return crypto.timingSafeEqual(provided, expected);
}

export function generateSecretKey(size = 32) {
    return crypto.randomBytes(size).toString('hex');
}

export function isTimestampFresh(timestamp, toleranceMs = 5 * 60 * 1000) {
    const parsed = Number(timestamp);
    if (!Number.isFinite(parsed)) return false;
    return Math.abs(Date.now() - parsed) <= toleranceMs;
}
