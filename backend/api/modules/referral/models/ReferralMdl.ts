/** ReferralMdl — a user's referrals (people who joined via their code) + reward totals. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Totals for the referrer's dashboard: how many joined, and total reward earned. */
exports.summaryMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT count(*)::int AS joined_cnt,
           COALESCE(sum(rewrd_am), 0) AS reward_am
    FROM ${schema}.rfrl_lst_t WHERE rfrr_usr_id = $1 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** The people this user referred, newest first. */
exports.listMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rfrl_id, r.rfrd_usr_id, u.dsply_nm, u.avtr_url_tx,
           r.rewrd_am, r.sts_cd, r.i_ts
    FROM ${schema}.rfrl_lst_t r
    JOIN ${schema}.usr_lst_t u ON u.usr_id = r.rfrd_usr_id
    WHERE r.rfrr_usr_id = $1 AND r.a_in = 1
    ORDER BY r.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Does this referrer id point at a real, active user? (validates a redeemed code.) */
exports.referrerExistsMdl = function (usr_id: number, req?: any) {
  const QRY = `SELECT 1 FROM ${schema}.usr_lst_t WHERE usr_id = $1 AND a_in = 1 LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Attribute a signup to a referrer. No-op if the user was already referred. */
exports.redeemMdl = function (referrer_id: number, referred_id: number, reward: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.rfrl_lst_t (rfrr_usr_id, rfrd_usr_id, rewrd_am, sts_cd)
    VALUES ($1, $2, $3, 'joined')
    ON CONFLICT (rfrd_usr_id) DO NOTHING
    RETURNING rfrl_id, rfrr_usr_id, rfrd_usr_id, rewrd_am`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [referrer_id, referred_id, reward], cntxtDtls, req);
};
