/**
 * OtpMdl — one-time-password persistence for phone login.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Persist a freshly generated OTP with an absolute expiry. */
exports.createOtpMdl = function (mbl_nm: string, otp_cd: string, purpose_cd: string, ttlSeconds: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_otp_t (mbl_nm, otp_cd, purpose_cd, exp_ts)
    VALUES ($1, $2, $3, now() + ($4 || ' seconds')::interval)
    RETURNING otp_id, mbl_nm, exp_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm, otp_cd, purpose_cd, String(ttlSeconds)], cntxtDtls, req);
};

/** Fetch the latest unexpired, unverified OTP for a phone + purpose. */
exports.getActiveOtpMdl = function (mbl_nm: string, purpose_cd: string, req?: any) {
  const QRY = `
    SELECT otp_id, otp_cd, atmpt_cnt, exp_ts
    FROM ${schema}.usr_otp_t
    WHERE mbl_nm = $1 AND purpose_cd = $2 AND vrfd_in = 0 AND exp_ts > now()
    ORDER BY i_ts DESC
    LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm, purpose_cd], cntxtDtls, req);
};

/** Mark an OTP verified (consumed). */
exports.markVerifiedMdl = function (otp_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.usr_otp_t SET vrfd_in = 1 WHERE otp_id = $1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [otp_id], cntxtDtls, req);
};

/** Increment the attempt counter after a wrong code. */
exports.incrementAttemptMdl = function (otp_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.usr_otp_t SET atmpt_cnt = atmpt_cnt + 1 WHERE otp_id = $1 RETURNING atmpt_cnt`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [otp_id], cntxtDtls, req);
};
