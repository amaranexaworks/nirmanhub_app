/** CreditCtrl — materials-on-credit orders. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const CreditMdl = require('../models/CreditMdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  try { return df.formatSucessRes(req, res, await CreditMdl.listMdl(req.user.id, req.query.status || null, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = async function (req: any, res: any) {
  const fnm = 'createCtrl';
  const data = req.body.data || req.body;
  if (!data.items || !data.items.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'items are required' });
  try {
    const out = await CreditMdl.createMdl(req.user.id, data, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Credit order created' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.payCtrl = async function (req: any, res: any) {
  const fnm = 'payCtrl';
  try {
    const out = await CreditMdl.markPaidMdl(Number(req.params.id), req.user.id, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Order not found' });
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Marked paid' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
