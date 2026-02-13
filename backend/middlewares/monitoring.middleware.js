import logger from '../core/logger.js';
import { captureMessage } from '../core/monitoring.js';

export function createLongRequestMonitor(options = {}) {
    const thresholdMs = Number(options.thresholdMs || process.env.LONG_REQUEST_THRESHOLD_MS || 1500);
    const now = options.now || (() => Date.now());
    const onLongRequest = options.onLongRequest || ((payload) => {
        logger.warn('Long request detected', payload);
        captureMessage('LONG_REQUEST', payload);
    });

    return (req, res, next) => {
        const startedAt = now();

        res.on('finish', () => {
            const durationMs = now() - startedAt;
            if (durationMs < thresholdMs) return;

            onLongRequest({
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs,
                thresholdMs
            });
        });

        return next();
    };
}

export const monitorLongRequests = createLongRequestMonitor();

export function createApiExecutionLogger(options = {}) {
    const nowIso = options.nowIso || (() => new Date().toISOString());
    const onLog = options.onLog || ((payload) => {
        logger.info('API_EXECUTION_TIME', payload);
    });

    return (req, res, next) => {
        const startedAt = process.hrtime.bigint();
        const timestamp = nowIso();
        let logged = false;

        const emit = () => {
            if (logged) return;
            logged = true;

            const endedAt = process.hrtime.bigint();
            const durationMs = Number(endedAt - startedAt) / 1_000_000;

            onLog({
                route: req.originalUrl || req.url || req.path || '',
                timestamp,
                durationMs: Number(durationMs.toFixed(2)),
                method: req.method,
                statusCode: res.statusCode
            });
        };

        res.on('finish', emit);
        res.on('close', emit);

        return next();
    };
}

export const logApiExecutionTime = createApiExecutionLogger();
