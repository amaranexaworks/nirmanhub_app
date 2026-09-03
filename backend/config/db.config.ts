/**
 * PostgreSQL connection pool. Mirrors the WMS `config/db.config.js` pattern:
 * a single dedicated `pg.Pool`, default `search_path` set to the app schema,
 * keep-alive on, and pool errors swallowed (never crash the process).
 *
 * A second, small pool (`SessionPool`) is dedicated to connect-pg-simple so
 * session traffic never starves application queries — same convention as WMS.
 */
export {};
const { Pool } = require('pg');
const env = require('./loadEnv');

const commonPoolOpts = {
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,   // fail fast when the pool is saturated (don't hang)
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Bound how long any single query / idle-in-transaction can hold a connection.
  // Without these, one slow/stuck query can pin a pool slot and starve everyone.
  statement_timeout: 10000,                 // 10s hard cap per statement
  query_timeout: 12000,                     // client-side safety net
  idle_in_transaction_session_timeout: 15000,
  application_name: `nirmaan_api_${env.APP_ENV}`,
  // Default search_path so unqualified table names resolve to the app schema.
  options: `-c search_path=${env.db.schema},public`,
  // TLS to the database. Enabled via PG_SSL=true (required by most managed PG).
  // `rejectUnauthorized:false` accepts the provider's chain without a bundled CA;
  // set PG_SSL_CA and switch this to true if you pin the CA certificate.
  ssl: env.db.ssl ? { rejectUnauthorized: false } : undefined,
};

// Primary application pool.
const AppPool = new Pool({
  ...commonPoolOpts,
  max: env.db.max,
  min: env.db.min,
});

// Dedicated session-store pool (connect-pg-simple).
const SessionPool = new Pool({
  ...commonPoolOpts,
  max: 10,
  min: 2,
});

AppPool.on('error', (err: any) => {
  console.error('[AppPool] idle client error:', err.message, err.code || '');
});
SessionPool.on('error', (err: any) => {
  console.error('[SessionPool] idle client error:', err.message, err.code || '');
});

exports.AppPool = AppPool;
exports.SessionPool = SessionPool;
exports.schema = env.db.schema;
