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
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.tailwindcss.com",
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://fonts.googleapis.com"
        ],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com"],
        mediaSrc: ["'self'", "data:", "blob:", "https:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"]
      }
    }
  }));
  app.use(cors());
  app.use(createGlobalLimiter());
};

export { securityMiddleware };
export default securityMiddleware;
