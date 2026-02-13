import * as Sentry from '@sentry/node';
import logger from './logger.js';

let sentryEnabled = false;

export function initMonitoring() {
    const dsn = String(process.env.SENTRY_DSN || '').trim();
    if (!dsn) {
        logger.info('Monitoring initialized without Sentry DSN');
        sentryEnabled = false;
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1)
    });

    sentryEnabled = true;
    logger.info('Sentry monitoring initialized');
}

export function captureError(error, context = {}) {
    if (sentryEnabled) {
        Sentry.captureException(error, { extra: context });
    }
}

export function captureMessage(message, context = {}) {
    if (sentryEnabled) {
        Sentry.captureMessage(message, { level: 'warning', extra: context });
    }
}

export function isSentryEnabled() {
    return sentryEnabled;
}
