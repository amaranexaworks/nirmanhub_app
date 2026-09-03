/**
 * WebDiscoveryCtrl — public (unauthenticated) browse endpoints for the website.
 * Base: /api/web. These are thin, web-shaped wrappers that REUSE the existing
 * domain models (JobMdl, MaterialMdl) — no new tables, no duplicated SQL. The
 * mobile app keeps using /api/jobs, /api/materials; the website uses /api/web/*.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const JobMdl = require('../../jobs/models/JobMdl');
const MaterialMdl = require('../../materials/models/MaterialMdl');
const EquipMdl = require('../../equipment/models/EquipMdl');
const HiringMdl = require('../../hiring/models/HiringMdl');

// Which platform archetypes back each public "kind" on the website's Discover page.
const KIND_ARCHETYPES: Record<string, string[]> = {
  workers: ['worker'],
  contractors: ['contractor'],
  experts: ['expert'],
};

/** Public equipment catalogue. */
exports.equipmentCtrl = async function (req: any, res: any) {
  const fnm = 'equipmentCtrl';
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await EquipMdl.catalogMdl({ category: req.query.category, q: req.query.q }, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Liveness probe so the website can confirm the web API is mounted. */
exports.healthCtrl = function (_req: any, res: any) {
  return res.json({ success: true, service: 'nirmaan-web-api', ts: new Date().toISOString() });
};

/** Public jobs feed. Same data as /api/jobs but with no viewer (usr_id 0 ⇒
 *  saved/applied are always false), so it needs no authentication. */
exports.jobsCtrl = async function (req: any, res: any) {
  const fnm = 'jobsCtrl';
  const limit = Math.min(Number(req.query.limit) || 24, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await JobMdl.listMdl({ trade: req.query.trade, city: req.query.city }, 0, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Public material catalog (optionally filtered by category / sub-type / brand / search). */
exports.materialsCtrl = async function (req: any, res: any) {
  const fnm = 'materialsCtrl';
  const limit = Math.min(Number(req.query.limit) || 24, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await MaterialMdl.catalogMdl(
      { category: req.query.category, q: req.query.q, subType: req.query.subType, brand: req.query.brand, sort: req.query.sort },
      limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Sub-types within a category (e.g. Ceiling / Table / Exhaust Fans). */
exports.materialSubtypesCtrl = async function (req: any, res: any) {
  const fnm = 'materialSubtypesCtrl';
  try {
    const rows = await MaterialMdl.subtypesMdl(String(req.query.category || ''), req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Brands within a category (optionally narrowed to one sub-type). */
exports.materialBrandsCtrl = async function (req: any, res: any) {
  const fnm = 'materialBrandsCtrl';
  try {
    const rows = await MaterialMdl.brandsMdl(String(req.query.category || ''), req.query.subType || null, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Full product detail (item + colour variants + specs + features). */
exports.materialItemCtrl = async function (req: any, res: any) {
  const fnm = 'materialItemCtrl';
  try {
    const item = await MaterialMdl.itemDetailMdl(Number(req.params.id), req);
    if (!item) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Item not found' });
    return df.formatSucessRes(req, res, item, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Public material categories (for the discover filter chips). */
exports.materialCategoriesCtrl = async function (req: any, res: any) {
  const fnm = 'materialCategoriesCtrl';
  try { return df.formatSucessRes(req, res, await MaterialMdl.categoriesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Marketing banners for a storefront slot (?slot=hero|ad|coupon). */
exports.promosCtrl = async function (req: any, res: any) {
  const fnm = 'promosCtrl';
  try {
    const rows = await MaterialMdl.promosMdl(String(req.query.slot || 'hero'), req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Global product highlights / trade assurances (home trust strip). */
exports.materialHighlightsCtrl = async function (req: any, res: any) {
  const fnm = 'materialHighlightsCtrl';
  try { return df.formatSucessRes(req, res, await MaterialMdl.highlightsMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Curated project kits ("Shop by project"). */
exports.materialKitsCtrl = async function (req: any, res: any) {
  const fnm = 'materialKitsCtrl';
  try {
    const rows = await MaterialMdl.kitsMdl(req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { count: rows.length } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** One kit + its items. */
exports.materialKitCtrl = async function (req: any, res: any) {
  const fnm = 'materialKitCtrl';
  try {
    const kit = await MaterialMdl.kitDetailMdl(Number(req.params.id), req);
    if (!kit) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Kit not found' });
    return df.formatSucessRes(req, res, kit, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/**
 * Public professionals directory — contractors / workers / experts, chosen by the
 * ?kind= query. Reuses HiringMdl (public-safe columns only: name, avatar, city,
 * rating — no phone/PII). Optional ?trade=&city=&q= filters.
 */
exports.professionalsCtrl = async function (req: any, res: any) {
  const fnm = 'professionalsCtrl';
  const kind = String(req.query.kind || 'workers');
  const archetypes = KIND_ARCHETYPES[kind] || KIND_ARCHETYPES.workers;
  const limit = Math.min(Number(req.query.limit) || 24, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const rows = await HiringMdl.publicProfessionalsMdl(archetypes, { trade: req.query.trade, city: req.query.city, q: req.query.q }, limit, offset, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, { meta: { limit, offset, count: rows.length, kind } });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
