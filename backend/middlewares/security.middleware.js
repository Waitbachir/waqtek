import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const DEFAULT_RATE_LIMIT_MAX = 100;

export function getRateLimitConfig(env = process.env) {
  return {
    windowMs: Number(env.RATE_LIMIT_WINDOW_MS || DEFAULT_RATE_LIMIT_WINDOW_MS),
    max: Number(env.RATE_LIMIT_MAX || DEFAULT_RATE_LIMIT_MAX),
    standardHeaders: true,
    legacyHeaders: false
  };
}

export function createGlobalLimiter(env = process.env) {
  return rateLimit(getRateLimitConfig(env));
}

const securityMiddleware = (app) => {
  app.use(helmet());
  app.use(cors());
  app.use(createGlobalLimiter());
};

export { securityMiddleware };
export default securityMiddleware;
