/** MaterialCtrl — materials catalog + orders. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const MaterialMdl = require('../models/MaterialMdl');

exports.categoriesCtrl = async function (req: any, res: any) {
  const fnm = 'categoriesCtrl';
  try { return df.formatSucessRes(req, res, await MaterialMdl.categoriesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.catalogCtrl = async function (req: any, res: any) {
  const fnm = 'catalogCtrl';
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await MaterialMdl.catalogMdl({ category: req.query.category, q: req.query.q }, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.addItemCtrl = async function (req: any, res: any) {
  const fnm = 'addItemCtrl';
  const data = req.body.data || req.body;
  if (!data.name || data.price == null) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'name and price are required' });
  try {
    const out = await MaterialMdl.addItemMdl(req.user.id, data, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Item listed' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createOrderCtrl = async function (req: any, res: any) {
  const fnm = 'createOrderCtrl';
  const data = req.body.data || req.body;
  if (!data.items || !data.items.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'items are required' });
  try {
    const out = await MaterialMdl.createOrderMdl(req.user.id, data, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Order placed' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.myOrdersCtrl = async function (req: any, res: any) {
  const fnm = 'myOrdersCtrl';
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;
  try { return df.formatSucessRes(req, res, await MaterialMdl.myOrdersMdl(req.user.id, projectId, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.orderDetailCtrl = async function (req: any, res: any) {
  const fnm = 'orderDetailCtrl';
  try {
    const out = await MaterialMdl.orderDetailMdl(Number(req.params.id), req);
    if (!out) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Order not found' });
    return df.formatSucessRes(req, res, out, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

// ── Verification-by-category (036) — admin-gated (moderate_content) ──
exports.listCategoriesVerifyCtrl = async (req: any, res: any) => { const fnm='listCategoriesVerifyCtrl'; try { return df.formatSucessRes(req,res, await MaterialMdl.listCategoriesVerifyMdl(req), cntxtDtls, fnm, {}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
exports.setCategoryVerifyCtrl = async (req: any, res: any) => { const fnm='setCategoryVerifyCtrl'; const d=req.body.data||req.body; try { const o=await MaterialMdl.setCategoryVerifyMdl(Number(req.params.id), !!d.requires, req); if(!o[0]) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:404,err_message:'category not found'}); return df.formatSucessRes(req,res,o[0],cntxtDtls,fnm,{success_msg:'Updated'}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
exports.listPendingItemsCtrl = async (req: any, res: any) => { const fnm='listPendingItemsCtrl'; try { return df.formatSucessRes(req,res, await MaterialMdl.listPendingItemsMdl(req), cntxtDtls, fnm, {}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
exports.setItemVerifyCtrl = async (req: any, res: any) => { const fnm='setItemVerifyCtrl'; const d=req.body.data||req.body; const status=d.status; if(!['verified','rejected','pending'].includes(status)) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:400,err_message:'invalid status'}); try { const o=await MaterialMdl.setItemVerifyMdl(Number(req.params.id), status, req); if(!o[0]) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:404,err_message:'item not found'}); return df.formatSucessRes(req,res,o[0],cntxtDtls,fnm,{success_msg:'Item '+status}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
