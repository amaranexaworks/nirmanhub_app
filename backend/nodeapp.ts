/**
 * nodeapp.ts — application entry point. Mirrors the WMS `nodeapp.ts` bootstrap:
 *   1. set global.appRoot   2. load env   3. security middleware
 *   4. body parsing         5. session (pg-backed)   6. mount /api routes
 *   7. error handlers       8. startup checks → listen
 */
export {};
import * as path from 'path';

// 1) global app root — every `require(global.appRoot + '/...')` resolves off this.
(global as any).appRoot = __dirname;

// 2) environment
const env = require('./config/loadEnv');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const corsConfig = require('./config/cors.config');
const { globalLimiter, authLimiter, sensitiveLimiter } = require('./config/ratelimit.config');
const { buildSessionMiddleware } = require('./initialize/session.init');
const { runStartupChecks } = require('./initialize');
const apiRoutes = require('./api/routes/apiRoutes');
const sqldb = require('./config/db.config');

const app = express();
app.set('trust proxy', 1);   // required so rate-limit/keys use the real client IP behind a proxy/LB

// 3) security — helmet sets secure response headers. HSTS is made explicit so
// browsers pin HTTPS for a year (only meaningful once served over TLS). CSP is a
// no-op for a pure JSON API, so it's left at helmet's default.
app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use(cors(corsConfig));
app.use(compression());

// 3b) request access log — method, path, status, duration, client IP. Sensitive query
// params (tokens/signatures) are redacted and Authorization headers are never logged.
// Skips the health check to cut noise. Gives an audit/incident trail (there was none).
app.use((req: any, res: any, next: any) => {
  if (req.path === '/api/health' || req.path === '/health') return next();
  const start = Date.now();
  res.on('finish', () => {
    const path = String(req.originalUrl || req.url).replace(/([?&])(token|fsig|sig|id_token|password)=[^&]*/gi, '$1$2=***');
    console.log(`${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms ${req.ip || '-'}`);
  });
  next();
});

// 4) parsing — only /files/upload carries a large (base64) body; everything else is
// tiny. So the big limit is scoped to that one route and the GLOBAL limit is kept low
// to blunt memory-amplification floods (a 12mb body on every endpoint is a cheap DoS).
// body-parser skips a request whose body was already parsed, so the global parsers
// below no-op for /files/upload. (Swap to multipart/object-storage in prod.)
app.use('/api/files/upload', bodyParser.json({ limit: '12mb' }));
app.use(bodyParser.json({ limit: '256kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '256kb' }));
app.use(cookieParser());

// 5) session (Postgres-backed). Built lazily so DB config is ready first.
app.use(buildSessionMiddleware());

// 6) rate limiting — global cap + a strict cap on credential endpoints + a medium
// cap on sensitive/expensive ones (uploads, KYC submit, broadcast).
app.use('/api', globalLimiter);
app.use(['/api/auth/login', '/api/auth/register', '/api/auth/social'], authLimiter);
app.use(['/api/files/upload', '/api/kyc/submit', '/api/admin/broadcast'], sensitiveLimiter);

// 7) routes
app.get('/', (_req: any, res: any) => res.json({ service: 'nirmaan-backend', status: 'ok' }));
app.use('/api', apiRoutes);

// 8) 404 + error handler
app.use((_req: any, res: any) =>
  res.status(404).json({ status: 404, success: false, message: 'Route not found' }));

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('[unhandled]', err.message);
  res.status(err.status || 500).json({
    status: err.status || 500,
    success: false,
    message: env.isProd ? 'Internal server error' : err.message,
  });
});

// 9) process-level safety net — a stray rejection must never take the process down.
process.on('unhandledRejection', (reason: any) => {
  console.error('[unhandledRejection]', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('[uncaughtException]', err?.message || err);
  // An uncaught exception leaves state unknown; exit so the supervisor restarts us.
  if (env.isProd) shutdown('uncaughtException', 1);
});

let server: any;
async function shutdown(signal: string, code = 0) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  try {
    if (server) await new Promise((r) => server.close(r));   // stop accepting new connections
    await Promise.allSettled([sqldb.AppPool.end(), sqldb.SessionPool.end()]);
  } catch (e: any) {
    console.error('shutdown error:', e.message);
  } finally {
    process.exit(code);
  }
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 10) start
(async () => {
  try {
    await runStartupChecks();
    server = app.listen(env.PORT, () => {
      console.log(`\n🚀 Nirmaan backend listening on http://localhost:${env.PORT}`);
      console.log(`   API base: http://localhost:${env.PORT}/api   env: ${env.NODE_ENV}\n`);
    });
  } catch (e: any) {
    console.error('\n✗ Startup aborted:', e.message, '\n');
    process.exit(1);
  }
})();

module.exports = app;
