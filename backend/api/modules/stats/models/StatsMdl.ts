/**
 * StatsMdl — public platform aggregates (no PII), used for social proof.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Total active registered users (every signup account). */
exports.getUserCountMdl = function (req?: any) {
  const QRY = `SELECT count(*)::int AS total FROM ${schema}.usr_lst_t WHERE a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

/**
 * Owner-scoped dashboard aggregates for the contractor/orchestrator home.
 * All figures are computed live from the workforce + wage tables for the
 * caller's own sites — no hardcoded numbers.
 */
exports.getOrchestratorStatsMdl = function (ownr: number, req?: any) {
  const QRY = `
    SELECT
      (SELECT count(*)::int FROM ${schema}.wf_prjct_lst_t WHERE ownr_usr_id = $1 AND a_in = 1) AS sites,
      (SELECT count(*)::int FROM ${schema}.wf_workr_lst_t w
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = w.prjct_id
         WHERE p.ownr_usr_id = $1 AND w.a_in = 1) AS workers,
      (SELECT count(*)::int FROM ${schema}.wf_atndnc_t a
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = a.prjct_id
         WHERE p.ownr_usr_id = $1 AND a.atndnc_dt = CURRENT_DATE AND a.sts_cd = 'P') AS present_today,
      (SELECT count(DISTINCT a.workr_id)::int FROM ${schema}.wf_atndnc_t a
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = a.prjct_id
         WHERE p.ownr_usr_id = $1 AND a.atndnc_dt >= date_trunc('week', CURRENT_DATE) AND a.sts_cd = 'P') AS workers_week,
      (SELECT COALESCE(SUM(w.day_rate_am), 0)::numeric FROM ${schema}.wf_atndnc_t a
         JOIN ${schema}.wf_workr_lst_t w ON w.workr_id = a.workr_id
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = a.prjct_id
         WHERE p.ownr_usr_id = $1 AND a.atndnc_dt >= date_trunc('week', CURRENT_DATE) AND a.sts_cd = 'P') AS accrued_week,
      (SELECT COALESCE(SUM(pm.amt_am), 0)::numeric FROM ${schema}.wage_pymnt_lst_t pm
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = pm.prjct_id
         WHERE p.ownr_usr_id = $1 AND pm.crtd_ts >= date_trunc('week', CURRENT_DATE)) AS paid_week,
      (SELECT COALESCE(SUM(e.amt_am), 0)::numeric FROM ${schema}.wf_expns_t e
         JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = e.prjct_id
         WHERE p.ownr_usr_id = $1 AND e.expns_dt >= date_trunc('month', CURRENT_DATE)) AS spend_month`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [ownr], cntxtDtls, req);
};

/** Per-site present/total counts for today (owner-scoped), for the attendance snapshot. */
exports.getSiteAttendanceMdl = function (ownr: number, req?: any) {
  const QRY = `
    SELECT p.prjct_id, p.nm_tx AS site,
      (SELECT count(*)::int FROM ${schema}.wf_workr_lst_t w WHERE w.prjct_id = p.prjct_id AND w.a_in = 1) AS total,
      (SELECT count(*)::int FROM ${schema}.wf_atndnc_t a WHERE a.prjct_id = p.prjct_id AND a.atndnc_dt = CURRENT_DATE AND a.sts_cd = 'P') AS present
    FROM ${schema}.wf_prjct_lst_t p
    WHERE p.ownr_usr_id = $1 AND p.a_in = 1
    ORDER BY p.nm_tx LIMIT 6`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [ownr], cntxtDtls, req);
};
