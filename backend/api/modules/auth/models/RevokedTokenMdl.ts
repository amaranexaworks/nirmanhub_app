/**
 * RevokedTokenMdl — a JWT denylist for real, server-side logout / token revocation.
 *
 * Why this exists: JWTs are self-contained, so a stolen or logged-out token would
 * otherwise stay valid until it expires. On logout / role-switch we record the
 * token's unique `jti` here; `authenticate()` rejects any token whose jti is
 * listed. Rows are keyed by jti and carry the token's own expiry — once the token
 * would have expired anyway the row is useless and gets pruned. Works for every
 * client (web cookie OR mobile bearer-only) because it never depends on a session
 * cookie being present.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Create the denylist table if it doesn't exist (called once at startup). */
exports.ensureTableMdl = async function () {
  const QRY = `
    CREATE TABLE IF NOT EXISTS ${schema}.revoked_token_t (
      jti      text PRIMARY KEY,
      usr_id   bigint,
      exp_ts   timestamptz NOT NULL,
      i_ts     timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS revoked_token_exp_ix ON ${schema}.revoked_token_t (exp_ts);`;
  return sqldb.AppPool.query(QRY);
};

/**
 * Add a token to the denylist. `expUnix` is the JWT `exp` claim (seconds); the row
 * self-expires at that point. Idempotent — re-revoking the same jti is a no-op.
 */
exports.revokeMdl = function (jti: string, usr_id: number | null, expUnix: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.revoked_token_t (jti, usr_id, exp_ts)
    VALUES ($1, $2, to_timestamp($3))
    ON CONFLICT (jti) DO NOTHING`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [jti, usr_id || null, expUnix || 0], cntxtDtls, req);
};

/** True if the jti is on the denylist and not yet past its own expiry. */
exports.isRevokedMdl = async function (jti: string, req?: any) {
  if (!jti) return false;
  const QRY = `SELECT 1 FROM ${schema}.revoked_token_t WHERE jti = $1 AND exp_ts > now() LIMIT 1`;
  const rows = await dbutil.execQuery(sqldb.AppPool, QRY, [jti], cntxtDtls, req);
  return !!(rows && rows.length);
};

/** Delete denylist rows whose tokens have already expired (housekeeping). */
exports.pruneExpiredMdl = function () {
  const QRY = `DELETE FROM ${schema}.revoked_token_t WHERE exp_ts <= now()`;
  return sqldb.AppPool.query(QRY);
};
