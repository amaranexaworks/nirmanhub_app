/** MessagingCtrl — threads + messages, with participant checks. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/MessagingMdl');

exports.listThreadsCtrl = async function (req: any, res: any) {
  const fnm = 'listThreadsCtrl';
  try { return df.formatSucessRes(req, res, await Mdl.listThreadsMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.startThreadCtrl = async function (req: any, res: any) {
  const fnm = 'startThreadCtrl';
  const d = req.body.data || req.body;
  if (!d.userId) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'userId is required' });
  if (Number(d.userId) === req.user.id) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'Cannot message yourself' });
  try {
    const out = await Mdl.getOrCreateThreadMdl(req.user.id, Number(d.userId), req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Thread ready' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.messagesCtrl = async function (req: any, res: any) {
  const fnm = 'messagesCtrl';
  const thrdId = Number(req.params.id);
  try {
    const member = await Mdl.isParticipantMdl(thrdId, req.user.id, req);
    if (!member.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'Not a participant' });
    await Mdl.markReadMdl(thrdId, req.user.id, req);
    return df.formatSucessRes(req, res, await Mdl.messagesMdl(thrdId, req), cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.sendCtrl = async function (req: any, res: any) {
  const fnm = 'sendCtrl';
  const thrdId = Number(req.params.id);
  const d = req.body.data || req.body;
  if (!d.body && !d.voiceSecs) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'body or voiceSecs required' });
  try {
    const member = await Mdl.isParticipantMdl(thrdId, req.user.id, req);
    if (!member.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'Not a participant' });
    const out = await Mdl.sendMessageMdl(thrdId, req.user.id, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Sent' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
