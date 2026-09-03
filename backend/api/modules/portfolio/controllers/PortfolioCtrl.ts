/**
 * PortfolioCtrl — CRUD for a professional's project showcase. Reads can target any
 * user (public profile view via ?userId=); writes always act on the caller's own
 * portfolio and are gated by the `manage_portfolio` capability at the route.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/PortfolioMdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  const ownerId = Number(req.query.userId) || req.user.id; // default: my own portfolio
  try { return df.formatSucessRes(req, res, await Mdl.listMdl(ownerId, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = async function (req: any, res: any) {
  const fnm = 'createCtrl';
  const d = req.body.data || req.body;
  if (!d.title) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'title is required' });
  try {
    const rows = await Mdl.createMdl(req.user.id, d, req);
    return df.formatSucessRes(req, res, rows[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Project added' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.updateCtrl = async function (req: any, res: any) {
  const fnm = 'updateCtrl';
  const d = req.body.data || req.body;
  try {
    const rows = await Mdl.updateMdl(Number(req.params.id), req.user.id, d, req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Not found' });
    return df.formatSucessRes(req, res, rows[0], cntxtDtls, fnm, { success_msg: 'Project updated' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.removeCtrl = async function (req: any, res: any) {
  const fnm = 'removeCtrl';
  try {
    const rows = await Mdl.removeMdl(Number(req.params.id), req.user.id, req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Not found' });
    return df.formatSucessRes(req, res, { removed: true }, cntxtDtls, fnm, { success_msg: 'Project removed' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
