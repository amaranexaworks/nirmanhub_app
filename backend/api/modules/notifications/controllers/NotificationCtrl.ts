/** NotificationCtrl — list, count, create, mark read. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/NotificationMdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  try {
    const rows = await Mdl.listMdl(req.user.id, req.query.unread === 'true', req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.unreadCountCtrl = async function (req: any, res: any) {
  const fnm = 'unreadCountCtrl';
  try {
    const rows = await Mdl.unreadCountMdl(req.user.id, req);
    return df.formatSucessRes(req, res, { unread: rows[0].unread }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = async function (req: any, res: any) {
  const fnm = 'createCtrl';
  const d = req.body.data || req.body;
  if (!d.title) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'title is required' });
  // SECURITY: a normal user may only create notifications for THEMSELVES. Targeting
  // another user's feed (d.userId) is a broadcast/admin action — without this gate any
  // user could inject phishing/spam notifications into anyone's inbox.
  const caps: string[] = req.user.capabilities || [];
  const canTargetOthers = caps.includes('broadcast') || caps.includes('admin_access');
  const target = (d.userId && canTargetOthers) ? Number(d.userId) : req.user.id;
  try {
    const out = await Mdl.createMdl(target, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Notification created' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.markReadCtrl = async function (req: any, res: any) {
  const fnm = 'markReadCtrl';
  try {
    await Mdl.markReadMdl(Number(req.params.id), req.user.id, req);
    return df.formatSucessRes(req, res, { read: true }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.markAllReadCtrl = async function (req: any, res: any) {
  const fnm = 'markAllReadCtrl';
  try {
    await Mdl.markAllReadMdl(req.user.id, req);
    return df.formatSucessRes(req, res, { read: true }, cntxtDtls, fnm, { success_msg: 'All marked read' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
