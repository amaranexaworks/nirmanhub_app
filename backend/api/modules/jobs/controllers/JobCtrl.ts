/** JobCtrl — job feed, post, apply, save. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const validate = require((global as any).appRoot + '/utils/validate.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const JobMdl = require('../models/JobMdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await JobMdl.listMdl({ trade: req.query.trade, city: req.query.city }, req.user.id, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myPostedCtrl = async function (req: any, res: any) {
  const fnm = 'myPostedCtrl';
  try { return df.formatSucessRes(req, res, await JobMdl.myPostedMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myAppliedCtrl = async function (req: any, res: any) {
  const fnm = 'myAppliedCtrl';
  try { return df.formatSucessRes(req, res, await JobMdl.myAppliedMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.savedCtrl = async function (req: any, res: any) {
  const fnm = 'savedCtrl';
  try { return df.formatSucessRes(req, res, await JobMdl.savedMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = function (req: any, res: any) {
  const fnm = 'createCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [{ field: 'title', type: 'others', required: true, name: 'Title' }],
    async (_e: any, v: any) => {
      if (v.status !== 1) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
      try {
        const out = await JobMdl.createMdl(req.user.id, data, req);
        return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Job posted' });
      } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
    });
};

exports.applyCtrl = async function (req: any, res: any) {
  const fnm = 'applyCtrl';
  const data = req.body.data || req.body;
  try {
    const out = await JobMdl.applyMdl(Number(req.params.id), req.user.id, data.message || null, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Applied' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.applicantsCtrl = async function (req: any, res: any) {
  const fnm = 'applicantsCtrl';
  try { return df.formatSucessRes(req, res, await JobMdl.applicantsMdl(Number(req.params.id), req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.toggleSaveCtrl = async function (req: any, res: any) {
  const fnm = 'toggleSaveCtrl';
  try {
    const out = await JobMdl.toggleSaveMdl(Number(req.params.id), req.user.id, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
