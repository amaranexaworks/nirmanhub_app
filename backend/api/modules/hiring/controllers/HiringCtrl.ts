/** HiringCtrl — worker/expert search + market rates. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const HiringMdl = require('../models/HiringMdl');

exports.searchCtrl = async function (req: any, res: any) {
  const fnm = 'searchCtrl';
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await HiringMdl.searchMdl(
      { trade: req.query.trade, city: req.query.city, q: req.query.q }, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.marketRatesCtrl = async function (req: any, res: any) {
  const fnm = 'marketRatesCtrl';
  try { return df.formatSucessRes(req, res, await HiringMdl.marketRatesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
