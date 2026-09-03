/** EquipCtrl — equipment catalogue, listing, and rentals. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const validate = require((global as any).appRoot + '/utils/validate.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const EquipMdl = require('../models/EquipMdl');

exports.catalogCtrl = async function (req: any, res: any) {
  const fnm = 'catalogCtrl';
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await EquipMdl.catalogMdl({ category: req.query.category, q: req.query.q }, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.mineCtrl = async function (req: any, res: any) {
  const fnm = 'mineCtrl';
  try { return df.formatSucessRes(req, res, await EquipMdl.mineMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.addCtrl = function (req: any, res: any) {
  const fnm = 'addCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [{ field: 'name', type: 'others', required: true, name: 'Name' }],
    async (_e: any, v: any) => {
      if (v.status !== 1) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
      try {
        const out = await EquipMdl.addMdl(req.user.id, data, req);
        return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Equipment listed' });
      } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
    });
};

exports.rentCtrl = async function (req: any, res: any) {
  const fnm = 'rentCtrl';
  const data = req.body.data || req.body;
  try {
    const out = await EquipMdl.rentMdl(Number(req.params.id), req.user.id, data, req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Equipment not found' });
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Rental requested' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myRentalsCtrl = async function (req: any, res: any) {
  const fnm = 'myRentalsCtrl';
  try { return df.formatSucessRes(req, res, await EquipMdl.myRentalsMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
