/** BillingMdl — subscription plans + user subscription. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

exports.plansMdl = (req?: any) => q(`
  SELECT plan_id, plan_cd, cycle_cd, price_am, benefits_tx
  FROM ${schema}.sbscrptn_plan_lst_t WHERE a_in = 1 ORDER BY price_am`, [], req);

/** The user's active subscription (defaults to free if none). */
exports.currentMdl = (usr_id: number, req?: any) => q(`
  SELECT plan_cd, cycle_cd, strt_ts, end_ts, sts_cd
  FROM ${schema}.usr_sbscrptn_t
  WHERE usr_id = $1 AND sts_cd = 'active'
  ORDER BY strt_ts DESC LIMIT 1`, [usr_id], req);

/** Subscribe: expire any active sub, then insert the new one. */
exports.subscribeMdl = function (usr_id: number, plan_cd: string, cycle_cd: string, req?: any) {
  const months = cycle_cd === 'yearly' ? 12 : 1;
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    await client.query(`UPDATE ${schema}.usr_sbscrptn_t SET sts_cd = 'expired' WHERE usr_id = $1 AND sts_cd = 'active'`, [usr_id]);
    const s = await client.query(`
      INSERT INTO ${schema}.usr_sbscrptn_t (usr_id, plan_cd, cycle_cd, end_ts)
      VALUES ($1,$2,$3, now() + make_interval(months => $4))
      RETURNING id, plan_cd, cycle_cd, strt_ts, end_ts, sts_cd`,
      [usr_id, plan_cd, cycle_cd, months]);
    return [s.rows[0]];
  });
};
