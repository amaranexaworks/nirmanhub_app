/**
 * Session + JWT token configuration. Mirrors WMS `config/session.config.js`.
 *
 * Model: express-session (persisted in Postgres via connect-pg-simple) holds the
 * authoritative login state; a short-lived RS256 JWT is regenerated FROM that
 * session on each request when close to expiry. There are no refresh tokens —
 * the session IS the refresh mechanism.
 */
export {};
const env = require('./loadEnv');

const TIME = {
  MINUTE: 60000,
  HOUR: 3600000,
  FOUR_HOURS: 14400000,
  DAY: 86400000,
  TEN_DAYS: 864000000,
};

module.exports = {
  session: {
    // false = a new login kills other sessions for the same user
    allowConcurrentLogins: true,
    // false = don't rewrite the session row on every request. connect-pg-simple
    // supports touch(), so `rolling` still extends expiry for cookie-bearing
    // clients without the write amplification that `resave:true` caused (a DB
    // UPDATE per request — a real bottleneck under concurrency).
    resave: false,
    saveUninitialized: false,
    rolling: true,          // reset expiry countdown on activity
    maxAge: TIME.FOUR_HOURS,       // web sign-out timeout
    mobileMaxAge: TIME.TEN_DAYS,   // mobile clients stay signed in longer
    touchAfter: 4 * TIME.MINUTE,   // extend DB session at most this often
    pruneInterval: 900,            // 15m — expired-session cleanup cadence
    secret: env.session.secret,
    cookieName: `nirmaan.${env.APP_ENV}.sid`,
    cookie: {
      secure: env.isProd,   // true over HTTPS in production
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: TIME.FOUR_HOURS,
    },
    pgStore: {
      tableName: env.session.table,
      schemaName: env.db.schema,
      createTableIfMissing: true,
      pruneSessionInterval: 900,
    },
  },

  token: {
    // JWTs regenerate from the active session; no refresh tokens.
    expiresIn: env.jwt.expiresIn,
    algorithm: 'RS256' as const,
    audience: env.jwt.audience,
    subject: 'user',
    keyId: '1',
    jwtId: '1',
    privateKeyPassphrase: env.jwt.passphrase,
    refresh: {
      enabled: true,
      bufferTime: 5 * TIME.MINUTE,   // refresh proactively if expiry within this window
      lastValidJwtTTL: TIME.MINUTE,  // accept the previous token briefly (race absorption)
    },
  },

  TIME,

  getSessionMaxAge(clientType: string) {
    return clientType === 'mobile' ? this.session.mobileMaxAge : this.session.maxAge;
  },

  shouldRefreshToken(tokenExp: number) {
    if (!this.token.refresh.enabled) return false;
    return tokenExp * 1000 - Date.now() <= this.token.refresh.bufferTime;
  },

  isTokenExpired(tokenExp: number) {
    return Date.now() >= tokenExp * 1000;
  },

  get jwtOptions() {
    return {
      algorithm: this.token.algorithm,
      keyid: this.token.keyId,
      expiresIn: this.token.expiresIn,
      audience: this.token.audience,
      jwtid: this.token.jwtId,
      subject: this.token.subject,
    };
  },
};
