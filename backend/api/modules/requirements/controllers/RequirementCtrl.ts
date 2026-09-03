/**
 * RequirementCtrl — marketplace requirement endpoints. Demonstrates capability
 * gating: posting requires `post_project`, responding requires `bid_project`.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const validate = require((global as any).appRoot + '/utils/validate.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const RequirementMdl = require('../models/RequirementMdl');

exports.getServiceTypesCtrl = async function (req: any, res: any) {
  const fnm = 'getServiceTypesCtrl';
  try { return df.formatSucessRes(req, res, await RequirementMdl.getServiceTypesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await RequirementMdl.listMdl(limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myPostsCtrl = async function (req: any, res: any) {
  const fnm = 'myPostsCtrl';
  try { return df.formatSucessRes(req, res, await RequirementMdl.myPostsMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = function (req: any, res: any) {
  const fnm = 'createCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [{ field: 'title', type: 'others', required: true, name: 'Title' }],
    async (_e: any, v: any) => {
      if (v.status !== 1) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
      try {
        const out = await RequirementMdl.createMdl(req.user.id, data, req);
        return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Requirement posted' });
      } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
    });
};

exports.listResponsesCtrl = async function (req: any, res: any) {
  const fnm = 'listResponsesCtrl';
  try { return df.formatSucessRes(req, res, await RequirementMdl.listResponsesMdl(Number(req.params.id), req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.respondCtrl = async function (req: any, res: any) {
  const fnm = 'respondCtrl';
  const data = req.body.data || req.body;
  try {
    const out = await RequirementMdl.respondMdl(Number(req.params.id), req.user.id, data, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Response submitted' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

// ── Leads: My Proposals + Invited ──
exports.myResponsesCtrl = async function (req: any, res: any) {
  const fnm = 'myResponsesCtrl';
  try { return df.formatSucessRes(req, res, await RequirementMdl.myResponsesMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.invitedCtrl = async function (req: any, res: any) {
  const fnm = 'invitedCtrl';
  try { return df.formatSucessRes(req, res, await RequirementMdl.invitedMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Poster invites a professional to bid. Only succeeds if the caller posted it. */
exports.inviteCtrl = async function (req: any, res: any) {
  const fnm = 'inviteCtrl';
  const d = req.body.data || req.body;
  const invtdUsrId = Number(d.userId);
  if (!invtdUsrId) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'userId is required' });
  try {
    const rows = await RequirementMdl.inviteMdl(Number(req.params.id), invtdUsrId, req.user.id, req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'Not your requirement, or already invited' });
    return df.formatSucessRes(req, res, rows[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Invitation sent' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
