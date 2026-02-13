import logger from '../core/logger.js';
import { captureError } from '../core/monitoring.js';

export function notFoundHandler(req, res) {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: 'Resource not found'
  });
}

export default function errorHandler(err, req, res, next) {
  const status = Number(err?.status || err?.statusCode || 500);
  logger.error('Unhandled error', {
    message: err?.message,
    stack: err?.stack,
    path: req?.originalUrl,
    method: req?.method,
    status
  });

  captureError(err, {
    path: req?.originalUrl,
    method: req?.method,
    status
  });

  const isServerError = status >= 500;
  const response = {
    error: isServerError ? 'INTERNAL_SERVER_ERROR' : (err?.error || 'REQUEST_ERROR'),
    message: isServerError ? 'Internal Server Error' : (err?.message || 'Request failed')
  };

  if (process.env.NODE_ENV !== 'production' && err?.stack) {
    response.stack = err.stack;
  }

  return res.status(status).json(response);
}
