/**
 * Central environment loader. Imported first (in nodeapp.ts) so that every
 * subsequent `process.env` read is populated. Mirrors the WMS `config/loadEnv.ts`.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join((global as any).appRoot || process.cwd(), '.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  PORT: parseInt(process.env.PORT || '4300', 10),
  APP_ENV: process.env.APP_ENV || 'dev',

  db: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DATABASE || 'nirmaan',
    schema: process.env.PG_SCHEMA || 'nirmaan',
    // Per-instance pool. 15 was too low for a multi-tenant API where each request
    // may touch the pool 1–2× — it saturates under a login spike. Size this to your
    // Postgres max_connections ÷ number of API instances (leave headroom for admin).
    max: parseInt(process.env.PG_MAX_POOL || '30', 10),
    min: parseInt(process.env.PG_MIN_POOL || '2', 10),
    // Managed Postgres (RDS/Cloud SQL/Neon/…) requires TLS. Set PG_SSL=true in prod.
    ssl: (process.env.PG_SSL || 'false') === 'true',
  },

  session: {
    secret: process.env.SESSION_SECRET || 'change-me-in-production',
    table: process.env.SESSION_TABLE || 'user_session_t',
  },

  jwt: {
    passphrase: process.env.JWT_PRIVATE_KEY_PASSPHRASE || 'nirmaan@secret',
    audience: process.env.JWT_AUDIENCE || 'NIRMAAN_APP',
    expiresIn: process.env.JWT_EXPIRES_IN || '4h',
  },

  otp: {
    length: parseInt(process.env.OTP_LENGTH || '4', 10),
    ttlSeconds: parseInt(process.env.OTP_TTL_SECONDS || '300', 10),
    devMode: (process.env.OTP_DEV_MODE || 'true') === 'true',
    devFixed: process.env.OTP_DEV_FIXED || '1234',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
  },

  files: {
    // Base directory for uploaded files, laid out as <uploadDir>/YYYY/MM/<uuid>.<ext>.
    // Defaults to backend/uploads; point it at a mounted volume/disk in production.
    uploadDir: process.env.UPLOAD_DIR || path.join((global as any).appRoot || process.cwd(), 'uploads'),
    maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES || '10485760', 10),   // 10 MB
  },
};

module.exports = env;
export default env;
