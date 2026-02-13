// MUST load .env FIRST before anything else
import "./config.js";

import app from "./index.js";
import realtime from './services/realtime.service.js';
import logger from './core/logger.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  const hasSupabaseUrl = !!process.env.SUPABASE_URL;
  const hasServiceKey = !!(process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  logger.info('Backend started', {
    port: PORT,
    apiUrl: `http://localhost:${PORT}/api`,
    supabaseConfigured: hasSupabaseUrl,
    serviceKeyConfigured: hasServiceKey,
    jwtConfigured: !!process.env.JWT_SECRET
  });

  try {
    realtime.start(server);
    logger.info('Realtime service started');
  } catch (e) {
    logger.warn('Realtime service failed to start', { error: e.message || e });
  }
});

server.on('error', (error) => {
  logger.error('Server error', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
