/** PassportMdl — the Nirmaan Digital ID / worker passport.
 *  A 6-digit code (usr_lst_t.psprt_cd_tx) resolves to a PUBLIC, verifiable profile:
 *  identity, active trade/role, skills, rating, KYC tier and experience signals
 *  aggregated from jobs. Reuses existing tables — no new data duplication. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Allocate (once) a unique 6-digit code for a user; returns the existing one if set. */
exports.ensureCodeMdl = async function (usr_id: number, req?: any): Promise<string> {
  const sel = `SELECT psprt_cd_tx FROM ${schema}.usr_lst_t WHERE usr_id = $1`;
  const cur = await dbutil.execQuery(sqldb.AppPool, sel, [usr_id], cntxtDtls, req);
  if (cur[0]?.psprt_cd_tx) return String(cur[0].psprt_cd_tx).trim();

  for (let i = 0; i < 25; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    try {
      const upd = `UPDATE ${schema}.usr_lst_t SET psprt_cd_tx = $1
                   WHERE usr_id = $2 AND psprt_cd_tx IS NULL RETURNING psprt_cd_tx`;
      const out = await dbutil.execQuery(sqldb.AppPool, upd, [code, usr_id], cntxtDtls, req);
      if (out.length) return code;
      const re = await dbutil.execQuery(sqldb.AppPool, sel, [usr_id], cntxtDtls, req);
      if (re[0]?.psprt_cd_tx) return String(re[0].psprt_cd_tx).trim();
    } catch (_e) { /* unique collision → retry with a new code */ }
  }
  throw new Error('Could not allocate a Nirmaan ID');
};

/** The public passport for a 6-digit code (verification / scan result). */
exports.byCodeMdl = function (code: string, req?: any) {
  const QRY = `
    SELECT u.usr_id, u.psprt_cd_tx, u.dsply_nm, u.hdln_tx, u.cty_nm, u.avtr_url_tx,
           u.kyc_tier_cd, u.rtng_nm, u.rtng_cnt, u.day_rate_am, u.i_ts AS member_since,
           r.rle_nm, r.rle_cd,
           COALESCE(ARRAY(SELECT s.skll_tx FROM ${schema}.usr_skll_rel_t s
                          WHERE s.usr_id = u.usr_id AND s.a_in = 1), '{}') AS skills,
           (SELECT count(*) FROM ${schema}.job_aplctn_t a
              WHERE a.aplcnt_usr_id = u.usr_id AND a.sts_cd = 'hired') AS jobs_hired,
           (SELECT count(*) FROM ${schema}.job_aplctn_t a
              WHERE a.aplcnt_usr_id = u.usr_id AND a.a_in = 1) AS jobs_applied
    FROM ${schema}.usr_lst_t u
    LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = u.actv_rle_id
    WHERE u.psprt_cd_tx = $1 AND u.a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [String(code).trim()], cntxtDtls, req);
};
