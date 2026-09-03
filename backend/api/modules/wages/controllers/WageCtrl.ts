/** WageCtrl — wage payments, adjustments, audit. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const WageMdl = require('../models/WageMdl');

exports.listPaymentsCtrl = async function (req: any, res: any) {
  const fnm = 'listPaymentsCtrl';
  try {
    const rows = await WageMdl.listPaymentsMdl({ projectId: req.query.projectId, workerId: req.query.workerId }, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createPaymentCtrl = async function (req: any, res: any) {
  const fnm = 'createPaymentCtrl';
  const d = req.body.data || req.body;
  if (d.amount == null) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount is required' });
  try {
    const out = await WageMdl.createPaymentMdl(req.user, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Payment recorded' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createAdjustmentCtrl = async function (req: any, res: any) {
  const fnm = 'createAdjustmentCtrl';
  const d = req.body.data || req.body;
  if (!d.kind || d.amount == null) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'kind and amount are required' });
  try {
    const out = await WageMdl.createAdjustmentMdl(req.user, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Adjustment recorded' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.listAdjustmentsCtrl = async function (req: any, res: any) {
  const fnm = 'listAdjustmentsCtrl';
  try { return df.formatSucessRes(req, res, await WageMdl.listAdjustmentsMdl(req.query.projectId || null, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.auditCtrl = async function (req: any, res: any) {
  const fnm = 'auditCtrl';
  try { return df.formatSucessRes(req, res, await WageMdl.auditMdl(Math.min(Number(req.query.limit) || 100, 500), req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
