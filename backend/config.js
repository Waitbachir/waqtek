import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import logger from './core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

logger.info('Config loaded', {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  fakeSupabase: process.env.USE_FAKE_SUPABASE === 'true'
});
