/** KycCtrl — user submits KYC + books a verification slot; admin verifies. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/KycMdl');
const AuditMdl = require((global as any).appRoot + '/api/modules/admin/models/AdminAuditMdl');

exports.statusCtrl = async function (req: any, res: any) {
  const fnm = 'statusCtrl';
  try {
    const rows = await Mdl.statusMdl(req.user.id, req);
    return df.formatSucessRes(req, res, rows[0] || null, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.submitCtrl = async function (req: any, res: any) {
  const fnm = 'submitCtrl';
  const d = req.body.data || req.body;
  if (!d.docType) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'docType is required' });
  try {
    const out = await Mdl.submitMdl(req.user.id, d, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'KYC submitted for review' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** User books / re-books a verification slot on their latest pending submission. */
exports.bookSlotCtrl = async function (req: any, res: any) {
  const fnm = 'bookSlotCtrl';
  const d = req.body.data || req.body;
  if (!d.slotTs) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'slotTs is required' });
  try {
    const out = await Mdl.bookSlotMdl(req.user.id, d.slotTs, d.contactPhone || req.user.phone || null, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'Submit your documents before booking a slot' });
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Verification slot booked' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Admin queue: pending submissions with the slot they booked (soonest first). */
exports.queueCtrl = async function (req: any, res: any) {
  const fnm = 'queueCtrl';
  try { return df.formatSucessRes(req, res, await Mdl.queueMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.reviewCtrl = async function (req: any, res: any) {
  const fnm = 'reviewCtrl';
  const d = req.body.data || req.body;
  if (!['approved', 'rejected'].includes(d.status)) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'status must be approved or rejected' });
  try {
    const out = await Mdl.reviewMdl(Number(req.params.id), d.status, d.remark || null, req.user.id, d.callNote || null, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Submission not found' });
    await AuditMdl.logMdl(req.user.id, 'kyc.' + d.status, 'kyc', String(req.params.id), d.remark || null, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'KYC ' + d.status });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
