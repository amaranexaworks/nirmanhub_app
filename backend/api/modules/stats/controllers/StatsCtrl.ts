/**
 * StatsCtrl — public platform stats.
 *   GET /stats/users/count → { total } total registered users
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const StatsMdl = require('../models/StatsMdl');

exports.userCountCtrl = async function (req: any, res: any) {
  const fnm = 'userCountCtrl';
  try {
    const rows = await StatsMdl.getUserCountMdl(req);
    const total = (rows && rows[0] && rows[0].total) || 0;
    return df.formatSucessRes(req, res, { total }, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};

/**
 * GET /stats/dashboard → live owner-scoped KPIs for the contractor home:
 * sites, workers, present today, this-week wage bill & pending pay, month spend,
 * and per-site attendance. All computed from the caller's own data.
 */
exports.dashboardCtrl = async function (req: any, res: any) {
  const fnm = 'dashboardCtrl';
  try {
    const ownr = req.user.id;
    const [agg] = await StatsMdl.getOrchestratorStatsMdl(ownr, req);
    const attendance = await StatsMdl.getSiteAttendanceMdl(ownr, req);
    const accrued = Number(agg?.accrued_week) || 0;
    const paid = Number(agg?.paid_week) || 0;
    const out = {
      sites: Number(agg?.sites) || 0,
      workers: Number(agg?.workers) || 0,
      presentToday: Number(agg?.present_today) || 0,
      workersThisWeek: Number(agg?.workers_week) || 0,
      wageBillWeek: accrued,
      pendingPay: Math.max(0, accrued - paid),
      spendMonth: Number(agg?.spend_month) || 0,
      attendance: (attendance || []).map((a: any) => ({
        site: a.site, present: Number(a.present) || 0, total: Number(a.total) || 0,
      })),
    };
    return df.formatSucessRes(req, res, out, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
