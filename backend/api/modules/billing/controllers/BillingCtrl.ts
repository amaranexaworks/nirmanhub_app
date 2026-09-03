/** BillingCtrl — plans, current subscription, subscribe. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/BillingMdl');

/** Split the pipe-delimited benefits string into an array for the client. */
function shapePlan(p: any) {
  return { ...p, benefits: p.benefits_tx ? String(p.benefits_tx).split('|') : [] };
}

exports.plansCtrl = async function (req: any, res: any) {
  const fnm = 'plansCtrl';
  try {
    const rows = await Mdl.plansMdl(req);
    return df.formatSucessRes(req, res, rows.map(shapePlan), cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.currentCtrl = async function (req: any, res: any) {
  const fnm = 'currentCtrl';
  try {
    const rows = await Mdl.currentMdl(req.user.id, req);
    const current = rows[0] || { plan_cd: 'free', cycle_cd: 'monthly', sts_cd: 'active' };
    return df.formatSucessRes(req, res, current, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.subscribeCtrl = async function (req: any, res: any) {
  const fnm = 'subscribeCtrl';
  const d = req.body.data || req.body;
  const plan = ['free', 'pro'].includes(d.plan) ? d.plan : null;
  const cycle = ['monthly', 'yearly'].includes(d.cycle) ? d.cycle : 'monthly';
  if (!plan) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'plan must be free or pro' });
  try {
    const out = await Mdl.subscribeMdl(req.user.id, plan, cycle, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Subscription updated' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
