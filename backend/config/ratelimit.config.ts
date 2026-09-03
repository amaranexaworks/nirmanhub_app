/**
 * Rate limiting — the first line of defence against floods and brute-force.
 * Two tiers:
 *   globalLimiter — generous per-IP cap on the whole API (absorbs traffic spikes).
 *   authLimiter   — strict cap on login/register (blocks credential-stuffing).
 *
 * At true scale (millions of requests) this belongs at the edge (nginx / WAF /
 * API gateway) too, and the store should be Redis so the limit is shared across
 * all API instances. In-memory here is per-instance; swap `store` for a Redis
 * store when running more than one node.
 */
export {};
const rateLimit = require('express-rate-limit');
const env = require('./loadEnv');

function jsonTooMany(_req: any, res: any) {
  return res.status(429).json({
    status: 429,
    success: false,
    message: 'Too many requests — please slow down and try again shortly.',
    code: 'RATE_LIMITED',
  });
}

// HORIZONTAL SCALING: the default express-rate-limit store is per-process memory, so
// with more than one API instance behind a load balancer the effective limit is N× and
// resets on every deploy. Set REDIS_URL to share the counter across ALL instances so the
// caps (esp. the login brute-force cap) are global. Single instance works without it.
function redact(url: string): string {
  try { const u = new URL(url); if (u.password) u.password = '***'; return u.toString(); } catch { return 'redis'; }
}
function makeStore() {
  if (!process.env.REDIS_URL) {
    console.log('[ratelimit] in-memory store (single instance). Set REDIS_URL to share limits across instances.');
    return undefined;
  }
  try {
    const { RedisStore } = require('rate-limit-redis');
    const { createClient } = require('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    // An unhandled 'error' event on the redis client would crash the process — swallow
    // and log so a blip in Redis degrades rate-limiting rather than taking the API down.
    client.on('error', (e: any) => console.error('[ratelimit] redis client error:', e.message));
    client.connect()
      .then(() => console.log('[ratelimit] Redis store active (shared across instances):', redact(process.env.REDIS_URL)))
      .catch((e: any) => console.error('[ratelimit] redis connect failed — limits will error until it recovers:', e.message));
    return new RedisStore({ sendCommand: (...args: string[]) => client.sendCommand(args) });
  } catch (e: any) {
    console.warn('[ratelimit] REDIS_URL set but rate-limit-redis/redis unavailable — falling back to in-memory (NOT safe across instances):', e.message);
    return undefined;
  }
}

const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler: jsonTooMany, store: makeStore() };

// Whole API: 300 requests / minute / IP. Skipped entirely in tests.
exports.globalLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: env.isProd ? 300 : 1000 });

// Login / register / social sign-in: 10 attempts / 15 min / IP.
exports.authLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: env.isProd ? 10 : 100 });

// Sensitive / expensive / abusable endpoints (file upload, KYC submit, broadcast):
// 20 / 15 min / IP. Tighter than global, looser than auth.
exports.sensitiveLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: env.isProd ? 20 : 200 });
