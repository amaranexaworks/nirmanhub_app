/** LendingCtrl — loan products + applications. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const LendingMdl = require('../models/LendingMdl');

exports.listProductsCtrl = async function (req: any, res: any) {
  const fnm = 'listProductsCtrl';
  try { return df.formatSucessRes(req, res, await LendingMdl.listProductsMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createProductCtrl = async function (req: any, res: any) {
  const fnm = 'createProductCtrl';
  const d = req.body.data || req.body;
  if (!d.name) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'name is required' });
  try {
    const out = await LendingMdl.createProductMdl(req.user.id, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Product saved' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.applyCtrl = async function (req: any, res: any) {
  const fnm = 'applyCtrl';
  const d = req.body.data || req.body;
  try {
    const out = await LendingMdl.applyMdl(req.user.id, Number(req.params.id), d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Application submitted' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myApplicationsCtrl = async function (req: any, res: any) {
  const fnm = 'myApplicationsCtrl';
  try { return df.formatSucessRes(req, res, await LendingMdl.myApplicationsMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.reviewQueueCtrl = async function (req: any, res: any) {
  const fnm = 'reviewQueueCtrl';
  try { return df.formatSucessRes(req, res, await LendingMdl.applicationsForProviderMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.reviewCtrl = async function (req: any, res: any) {
  const fnm = 'reviewCtrl';
  const d = req.body.data || req.body;
  const allowed = ['approved', 'rejected', 'disbursed', 'pending'];
  if (!allowed.includes(d.status)) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'status must be one of ' + allowed.join(', ') });
  try {
    const out = await LendingMdl.reviewMdl(Number(req.params.id), d.status, d.remark || null, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Application not found' });
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Application ' + d.status });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
