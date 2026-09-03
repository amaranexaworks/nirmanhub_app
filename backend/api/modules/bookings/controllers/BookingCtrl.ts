/** BookingCtrl — bookings for seekers and pros. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const BookingMdl = require('../models/BookingMdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  const role = req.query.role === 'pro' ? 'pro' : 'seeker';
  try {
    const rows = await BookingMdl.listMdl(req.user.id, role, req.query.status || null, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.getCtrl = async function (req: any, res: any) {
  const fnm = 'getCtrl';
  try {
    const rows = await BookingMdl.getMdl(Number(req.params.id), req.user.id, req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Booking not found' });
    return df.formatSucessRes(req, res, rows[0], cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = async function (req: any, res: any) {
  const fnm = 'createCtrl';
  const data = req.body.data || req.body;
  try {
    const out = await BookingMdl.createMdl(req.user.id, data, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Booking created' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.updateCtrl = async function (req: any, res: any) {
  const fnm = 'updateCtrl';
  const data = req.body.data || req.body;
  try {
    const out = await BookingMdl.updateMdl(Number(req.params.id), req.user.id, data, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Booking not found or not permitted' });
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Booking updated' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
