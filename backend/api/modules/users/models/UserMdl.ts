/**
 * UserMdl — profile reads/writes for the users module.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.getProfileMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT usr_id, mbl_nm, dsply_nm, fst_nm, lst_nm, eml_tx, avtr_url_tx, kyc_tier_cd,
           pncd_tx, cty_nm, lat, lng, hdln_tx, bio_tx, day_rate_am, srvc_rds_km,
           rtng_nm, rtng_cnt, lng_cd_tx, actv_rle_id
    FROM ${schema}.usr_lst_t WHERE usr_id = $1 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/**
 * Patch profile fields. Only whitelisted columns are updatable; the column list
 * is built dynamically but values are always bound as parameters.
 */
exports.updateProfileMdl = function (usr_id: number, patch: any, req?: any) {
  const allowed: Record<string, string> = {
    dsply_nm: 'dsply_nm', fst_nm: 'fst_nm', lst_nm: 'lst_nm', eml_tx: 'eml_tx',
    avtr_url_tx: 'avtr_url_tx', pncd_tx: 'pncd_tx', cty_nm: 'cty_nm', lat: 'lat', lng: 'lng',
    hdln_tx: 'hdln_tx', bio_tx: 'bio_tx', day_rate_am: 'day_rate_am',
    srvc_rds_km: 'srvc_rds_km', lng_cd_tx: 'lng_cd_tx',
  };
  const sets: string[] = [];
  const params: any[] = [usr_id];
  for (const [key, col] of Object.entries(allowed)) {
    if (patch[key] !== undefined) {
      params.push(patch[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) return exports.getProfileMdl(usr_id, req);
  const QRY = `
    UPDATE ${schema}.usr_lst_t SET ${sets.join(', ')}, u_ts = now()
    WHERE usr_id = $1
    RETURNING usr_id, dsply_nm, eml_tx, avtr_url_tx, pncd_tx, cty_nm, hdln_tx, bio_tx,
              day_rate_am, srvc_rds_km, lng_cd_tx`;
  return dbutil.execQuery(sqldb.AppPool, QRY, params, cntxtDtls, req);
};

exports.getSkillsMdl = function (usr_id: number, req?: any) {
  const QRY = `SELECT skll_tx FROM ${schema}.usr_skll_rel_t WHERE usr_id = $1 AND a_in = 1 ORDER BY skll_tx`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

exports.addSkillMdl = function (usr_id: number, skll_tx: string, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_skll_rel_t (usr_id, skll_tx) VALUES ($1, $2)
    ON CONFLICT (usr_id, skll_tx) DO UPDATE SET a_in = 1 RETURNING skll_tx`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, skll_tx], cntxtDtls, req);
};

/** Fetch the stored password hash (+ whether one is set) for the logged-in user. */
exports.getPasswordHashMdl = function (usr_id: number, req?: any) {
  const QRY = `SELECT usr_id, pwd_tx FROM ${schema}.usr_lst_t WHERE usr_id = $1 AND a_in = 1 LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Set a new password hash for the logged-in user. */
exports.updatePasswordMdl = function (usr_id: number, pwd_tx: string, req?: any) {
  const QRY = `
    UPDATE ${schema}.usr_lst_t
    SET pwd_tx = $2, auth_prvdr_cd = 'password', u_ts = now()
    WHERE usr_id = $1
    RETURNING usr_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, pwd_tx], cntxtDtls, req);
};
