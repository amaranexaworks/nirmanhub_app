/**
 * CORS configuration. Allows the configured origins plus Capacitor's native
 * origins, and exposes the credential + custom auth header the client needs.
 */
export {};
const env = require('./loadEnv');

const origins: string[] = env.cors.origins;
const allowAll = origins.includes('*');

module.exports = {
  origin(origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) {
    // Non-browser clients (curl, native shells) send no Origin — allow them.
    if (!origin || allowAll || origins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token', 'x-client-type'],
  exposedHeaders: ['x-access-token'],
};
