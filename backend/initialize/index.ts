/**
 * initialize/index — one-time startup checks. Verifies the DB is reachable and
 * the JWT keys exist before the server begins accepting traffic. Mirrors the
 * WMS `initialize/index.ts` orchestrator.
 */
export {};
const fs = require('fs');
const path = require('path');
const sqldb = require((global as any).appRoot + '/config/db.config');
const env = require((global as any).appRoot + '/config/loadEnv');
const RevokedTokenMdl = require((global as any).appRoot + '/api/modules/auth/models/RevokedTokenMdl');
const fileStorage = require((global as any).appRoot + '/utils/fileStorage.utils');

// Values that are fine as dev defaults but MUST be overridden in production.
// Booting prod with any of these is refused — they are effectively public.
const INSECURE_DEFAULTS: Array<{ label: string; value: string; bad: string[] }> = [
  { label: 'SESSION_SECRET', value: env.session.secret,
    bad: ['change-me-in-production', 'change-me-in-production-a-long-random-string'] },
  { label: 'JWT_PRIVATE_KEY_PASSPHRASE', value: env.jwt.passphrase, bad: ['nirmaan@secret'] },
  { label: 'PG_PASSWORD', value: env.db.password, bad: ['postgres', ''] },
];

/**
 * Fail-fast guard: in production, refuse to start with default secrets, a wildcard
 * CORS origin, dev OTP mode, or a too-short session secret. Better a loud crash on
 * deploy than a silent, insecure server serving real users.
 */
function assertProductionConfig() {
  if (!env.isProd) return;
  const problems: string[] = [];

  for (const s of INSECURE_DEFAULTS) {
    if (s.bad.includes((s.value || '').trim())) problems.push(`${s.label} is still a default/placeholder value`);
  }
  if ((env.session.secret || '').length < 32) problems.push('SESSION_SECRET must be at least 32 random characters');
  if (env.cors.origins.includes('*')) problems.push('CORS_ORIGINS must be an explicit allow-list (no "*") in production');
  if (env.otp.devMode) problems.push('OTP_DEV_MODE must be false in production (it exposes/​fixes the OTP)');
  if (!env.db.ssl) console.warn('⚠ PG_SSL is not enabled — enable TLS to the database if it is not on a private network.');
  // Horizontal scaling needs shared state. Without Redis, the rate-limit counter is
  // per-instance (so the login brute-force cap is effectively N× and resets on deploy).
  // A warning, not a hard fail, so a deliberate single-instance prod can still boot.
  if (!process.env.REDIS_URL) {
    console.warn('⚠ REDIS_URL is not set — rate limiting is per-instance. Set it before running more than one API instance behind a load balancer.');
  }

  if (problems.length) {
    console.error('✗ Insecure production configuration:');
    problems.forEach((p) => console.error(`   • ${p}`));
    throw new Error('Refusing to start with insecure production configuration. Fix the .env values above.');
  }
  console.log('✓ Production configuration checks passed');
}

exports.runStartupChecks = async function () {
  // 0) Production security configuration (secrets, CORS, OTP) — fail fast.
  assertProductionConfig();

  // 1) DB connectivity
  try {
    const r = await sqldb.AppPool.query('SELECT 1 AS ok');
    if (r.rows[0].ok !== 1) throw new Error('unexpected result');
    console.log('✓ Database reachable');
  } catch (e: any) {
    console.error('✗ Database not reachable:', e.message);
    console.error('  Check your .env PG_* settings and that Postgres is running.');
    throw e;
  }

  // 2) JWT keys — present AND decryptable with the configured passphrase. Checking
  //    the passphrase STRING isn't enough: if the key was generated with a different
  //    passphrase (e.g. rotated env but stale key file), signing silently fails at
  //    runtime. Load it here so a mismatch is a loud crash on boot, not a 500 later.
  const crypto = require('crypto');
  const sec = path.join((global as any).appRoot, 'security');
  const privPath = path.join(sec, 'private_key.pem');
  const hasKeys = fs.existsSync(privPath) && fs.existsSync(path.join(sec, 'public_key.pem'));
  if (!hasKeys) {
    console.error('✗ JWT keys missing in /security. Run `npm run keys`.');
    throw new Error('JWT keys missing');
  }
  try {
    crypto.createPrivateKey({ key: fs.readFileSync(privPath, 'utf8'), passphrase: env.jwt.passphrase });
  } catch {
    console.error('✗ JWT private key cannot be decrypted with JWT_PRIVATE_KEY_PASSPHRASE.');
    console.error('  The passphrase and the key file are out of sync. After rotating the');
    console.error('  passphrase, regenerate the keypair: `npm run keys -- --force`.');
    throw new Error('JWT private key / passphrase mismatch');
  }
  console.log('✓ JWT keys present and decryptable');

  // 3) Schema presence (warn only)
  try {
    const r = await sqldb.AppPool.query(
      `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'usr_lst_t'`,
      [sqldb.schema]
    );
    if (!r.rows[0].n) console.warn('⚠ Schema not migrated yet. Run `npm run db:migrate && npm run db:seed`.');
    else console.log('✓ Schema present');
  } catch { /* non-fatal */ }

  // 4) Token denylist table (real logout / revocation) + prune stale rows.
  try {
    await RevokedTokenMdl.ensureTableMdl();
    await RevokedTokenMdl.pruneExpiredMdl();
    console.log('✓ Token denylist ready');
  } catch (e: any) {
    console.error('✗ Could not initialise token denylist:', e.message);
    throw e;
  }

  // 4b) File storage directory (disk-backed uploads).
  try {
    await fileStorage.ensureBaseDir();
    console.log(`✓ Upload directory ready (${env.files.uploadDir})`);
  } catch (e: any) {
    console.error('✗ Could not create upload directory:', e.message);
    throw e;
  }

  // 5) In production, refuse to run with the seeded default admin password. The
  //    seed ships a well-known credential (phone 9999900000 / 'nirmaan123') for
  //    dev convenience; leaving it live in prod is a full account takeover.
  if (env.isProd) {
    try {
      const bcrypt = require('bcryptjs');
      const r = await sqldb.AppPool.query(
        `SELECT pwd_tx FROM ${sqldb.schema}.usr_lst_t WHERE mbl_nm = $1 LIMIT 1`, ['9999900000']
      );
      const hash = r.rows[0] && r.rows[0].pwd_tx;
      if (hash && await bcrypt.compare('nirmaan123', hash)) {
        throw new Error('Default admin still uses the seeded password. Change it before serving production traffic.');
      }
      console.log('✓ Default admin password check passed');
    } catch (e: any) {
      if (/seeded password/.test(e.message)) { console.error('✗', e.message); throw e; }
      // A query error here (e.g. no admin row yet) is non-fatal.
      console.warn('⚠ Admin password check skipped:', e.message);
    }
  }
};
