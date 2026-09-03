/**
 * AdminCtrl — the admin console API. Every handler assumes the route already
 * enforced authenticate + the relevant admin capability. Moderation actions are
 * recorded to the audit trail.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/AdminMdl');
const Audit = require('../models/AdminAuditMdl');
const UserAuthMdl = require((global as any).appRoot + '/api/modules/auth/models/UserAuthMdl');

const ok = (req: any, res: any, data: any, fnm: string, opts: any = {}) => df.formatSucessRes(req, res, data, cntxtDtls, fnm, opts);
const fail = (res: any, fnm: string, status: number, msg: string) => df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: status, err_message: msg });

// Admin-tier capabilities. Granting any of these effectively makes a user staff/admin,
// so it may only be done by a FULL admin (one who holds `admin_access`) — not by a
// partial admin who happens to hold `manage_users`. This blocks privilege escalation
// where a limited operator grants themselves (or an ally) the keys to the kingdom.
const ADMIN_CAPS = new Set(['admin_access', 'manage_users', 'verify_kyc', 'moderate_content', 'oversee_finance', 'view_analytics', 'broadcast']);

// ── Overview ─────────────────────────────────────────────────────────────────
exports.overviewCtrl = async function (req: any, res: any) {
  const fnm = 'overviewCtrl';
  try {
    const [overview, trend] = await Promise.all([Mdl.overviewMdl(req), Mdl.signupsTrendMdl(req)]);
    return ok(req, res, { ...(overview[0] || {}), signupsTrend: trend }, fnm);
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Users ────────────────────────────────────────────────────────────────────
exports.listUsersCtrl = async function (req: any, res: any) {
  const fnm = 'listUsersCtrl';
  const search = req.query.q ? String(req.query.q) : null;
  const archtyp = req.query.archetype ? String(req.query.archetype) : null;
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  const offset = Number(req.query.offset) || 0;
  try {
    const [rows, cnt] = await Promise.all([
      Mdl.listUsersMdl(search, archtyp, limit, offset, req),
      Mdl.countUsersMdl(search, archtyp, req),
    ]);
    return ok(req, res, rows, fnm, { meta: { total: cnt[0]?.n || 0, limit, offset } });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

exports.getUserCtrl = async function (req: any, res: any) {
  const fnm = 'getUserCtrl';
  try {
    const [u, roles, caps] = await Promise.all([
      Mdl.getUserMdl(Number(req.params.id), req),
      Mdl.getUserRolesMdl(Number(req.params.id), req),
      Mdl.getUserGrantedCapsMdl(Number(req.params.id), req),
    ]);
    if (!u.length) return fail(res, fnm, 404, 'User not found');
    return ok(req, res, { ...u[0], roles, grantedCapabilities: caps.map((c: any) => c.cpblty_cd) }, fnm);
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

/** Grant or revoke a set of capabilities (a "feature") for a user. */
exports.setUserCapabilitiesCtrl = async function (req: any, res: any) {
  const fnm = 'setUserCapabilitiesCtrl';
  const d = req.body.data || req.body;
  const id = Number(req.params.id);
  const caps: string[] = Array.isArray(d.caps) ? d.caps : [];
  const grant = d.grant === true || d.grant === 1 || d.grant === '1';
  if (!caps.length) return fail(res, fnm, 400, 'caps[] is required');
  // A partial admin (manage_users only) must not be able to hand out admin-tier
  // capabilities — that would be self-service privilege escalation. Only a full admin
  // may grant/revoke them. Also block operating on your own account.
  if (id === req.user.id) return fail(res, fnm, 400, 'You cannot change your own capabilities');
  const touchesAdminCaps = caps.some((c) => ADMIN_CAPS.has(String(c)));
  if (touchesAdminCaps && !(req.user.capabilities || []).includes('admin_access')) {
    return fail(res, fnm, 403, 'Only a full administrator can grant or revoke admin capabilities');
  }
  try {
    if (grant) await Mdl.grantUserCapsMdl(id, caps, req.user.id, req);
    else await Mdl.revokeUserCapsMdl(id, caps, req);
    await Audit.logMdl(req.user.id, grant ? 'user.grant_feature' : 'user.revoke_feature', 'user', String(id), caps.join(','), req);
    // Force the target to re-authenticate so the changed capabilities take effect now,
    // not up to 4h later when their current token would otherwise expire.
    await UserAuthMdl.invalidateUserTokensMdl(id, req).catch(() => {});
    const now = await Mdl.getUserGrantedCapsMdl(id, req);
    return ok(req, res, { grantedCapabilities: now.map((c: any) => c.cpblty_cd) }, fnm, { success_msg: grant ? 'Feature granted' : 'Feature revoked' });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

exports.setUserStatusCtrl = async function (req: any, res: any) {
  const fnm = 'setUserStatusCtrl';
  const d = req.body.data || req.body;
  const active = d.active === true || d.active === 1 || d.active === '1';
  const id = Number(req.params.id);
  if (id === req.user.id) return fail(res, fnm, 400, 'You cannot change your own account status');
  try {
    const out = await Mdl.setUserActiveMdl(id, active ? 1 : 0, req);
    if (!out.length) return fail(res, fnm, 404, 'User not found');
    // Deactivation must be immediate — kill the user's live tokens so they can't keep
    // acting with a still-valid JWT until it expires.
    if (!active) await UserAuthMdl.invalidateUserTokensMdl(id, req).catch(() => {});
    await Audit.logMdl(req.user.id, active ? 'user.activate' : 'user.deactivate', 'user', String(id), null, req);
    return ok(req, res, out[0], fnm, { success_msg: active ? 'User activated' : 'User deactivated' });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Content moderation ───────────────────────────────────────────────────────
const limitOf = (req: any) => Math.min(Number(req.query.limit) || 50, 200);

exports.listJobsCtrl = async function (req: any, res: any) {
  const fnm = 'listJobsCtrl';
  try { return ok(req, res, await Mdl.listJobsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.setJobStatusCtrl = mkToggle('setJobStatusCtrl', 'setJobActiveMdl', 'job', 'Job');

exports.listRequirementsCtrl = async function (req: any, res: any) {
  const fnm = 'listRequirementsCtrl';
  try { return ok(req, res, await Mdl.listRequirementsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.setRequirementStatusCtrl = mkToggle('setRequirementStatusCtrl', 'setRequirementActiveMdl', 'requirement', 'Requirement');

exports.listMaterialsCtrl = async function (req: any, res: any) {
  const fnm = 'listMaterialsCtrl';
  try { return ok(req, res, await Mdl.listMaterialsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.setMaterialStatusCtrl = mkToggle('setMaterialStatusCtrl', 'setMaterialActiveMdl', 'material', 'Listing');

// Set a real photo on a category / product (admin uploads the image, sends its URL).
exports.setCategoryImageCtrl = async function (req: any, res: any) {
  const fnm = 'setCategoryImageCtrl';
  const d = req.body.data || req.body;
  try { return ok(req, res, (await Mdl.setCategoryImageMdl(Number(req.params.id), d.url, req))[0], fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.setItemImageCtrl = async function (req: any, res: any) {
  const fnm = 'setItemImageCtrl';
  const d = req.body.data || req.body;
  try { return ok(req, res, (await Mdl.setItemImageMdl(Number(req.params.id), d.url, req))[0], fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

exports.listBookingsCtrl = async function (req: any, res: any) {
  const fnm = 'listBookingsCtrl';
  try { return ok(req, res, await Mdl.listBookingsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Projects (workforce sites) ───────────────────────────────────────────────
exports.listProjectsCtrl = async function (req: any, res: any) {
  const fnm = 'listProjectsCtrl';
  try { return ok(req, res, await Mdl.listProjectsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Finance ──────────────────────────────────────────────────────────────────
exports.listLoansCtrl = async function (req: any, res: any) {
  const fnm = 'listLoansCtrl';
  try { return ok(req, res, await Mdl.listLoansMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.listWalletCtrl = async function (req: any, res: any) {
  const fnm = 'listWalletCtrl';
  try { return ok(req, res, await Mdl.listWalletTxnsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.listWagesCtrl = async function (req: any, res: any) {
  const fnm = 'listWagesCtrl';
  try { return ok(req, res, await Mdl.listWagesMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.listSubscriptionsCtrl = async function (req: any, res: any) {
  const fnm = 'listSubscriptionsCtrl';
  try { return ok(req, res, await Mdl.listSubscriptionsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.listMaterialOrdersCtrl = async function (req: any, res: any) {
  const fnm = 'listMaterialOrdersCtrl';
  try { return ok(req, res, await Mdl.listMaterialOrdersMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.listCreditOrdersCtrl = async function (req: any, res: any) {
  const fnm = 'listCreditOrdersCtrl';
  try { return ok(req, res, await Mdl.listCreditOrdersMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Messaging + catalogs ─────────────────────────────────────────────────────
exports.listThreadsCtrl = async function (req: any, res: any) {
  const fnm = 'listThreadsCtrl';
  try { return ok(req, res, await Mdl.listThreadsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};
exports.catalogCtrl = async function (req: any, res: any) {
  const fnm = 'catalogCtrl';
  try {
    const [serviceTypes, materialCategories, loanProducts, billingPlans] = await Promise.all([
      Mdl.listServiceTypesMdl(req),
      Mdl.listMaterialCategoriesMdl(req),
      Mdl.listLoanProductsMdl(limitOf(req), req),
      Mdl.listBillingPlansMdl(req),
    ]);
    return ok(req, res, { serviceTypes, materialCategories, loanProducts, billingPlans }, fnm);
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// Catalog kind → {create, update, required fields}. Keeps one pair of endpoints
// for all four catalogs instead of eight bespoke handlers.
const CATALOG_KINDS: Record<string, { create: Function; update: Function; required: string[] }> = {
  'service-types': { create: Mdl.createServiceTypeMdl, update: Mdl.updateServiceTypeMdl, required: ['srvc_type_cd', 'srvc_type_nm'] },
  'material-categories': { create: Mdl.createMaterialCategoryMdl, update: Mdl.updateMaterialCategoryMdl, required: ['ctgry_cd', 'ctgry_nm'] },
  'loan-products': { create: Mdl.createLoanProductMdl, update: Mdl.updateLoanProductMdl, required: ['nm_tx'] },
  'billing-plans': { create: Mdl.createBillingPlanMdl, update: Mdl.updateBillingPlanMdl, required: ['plan_cd', 'cycle_cd'] },
};

exports.catalogCreateCtrl = async function (req: any, res: any) {
  const fnm = 'catalogCreateCtrl';
  const kind = CATALOG_KINDS[req.params.kind];
  if (!kind) return fail(res, fnm, 404, 'Unknown catalog');
  const d = req.body.data || req.body;
  for (const f of kind.required) if (!d[f]) return fail(res, fnm, 400, `${f} is required`);
  try {
    const out = await kind.create(d, req);
    await Audit.logMdl(req.user.id, 'catalog.create', req.params.kind, String(out[0] ? Object.values(out[0])[0] : ''), null, req);
    return ok(req, res, out[0], fnm, { success_status: 201, success_msg: 'Created' });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

exports.catalogUpdateCtrl = async function (req: any, res: any) {
  const fnm = 'catalogUpdateCtrl';
  const kind = CATALOG_KINDS[req.params.kind];
  if (!kind) return fail(res, fnm, 404, 'Unknown catalog');
  const d = req.body.data || req.body;
  try {
    const out = await kind.update(Number(req.params.id), d, req);
    if (!out.length) return fail(res, fnm, 404, 'Not found');
    await Audit.logMdl(req.user.id, 'catalog.update', req.params.kind, String(req.params.id), null, req);
    return ok(req, res, out[0], fnm, { success_msg: 'Saved' });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Broadcast ────────────────────────────────────────────────────────────────
exports.broadcastCtrl = async function (req: any, res: any) {
  const fnm = 'broadcastCtrl';
  const d = req.body.data || req.body;
  if (!d.title) return fail(res, fnm, 400, 'title is required');
  try {
    const out = await Mdl.broadcastMdl(d.title, d.body || null, d.url || null, d.archetype || null, req);
    await Audit.logMdl(req.user.id, 'notification.broadcast', 'notification', null,
      `${out.length} recipients${d.archetype ? ' · ' + d.archetype : ''}: ${d.title}`, req);
    return ok(req, res, { recipients: out.length }, fnm, { success_msg: `Broadcast sent to ${out.length} users` });
  } catch (e: any) { return fail(res, fnm, 500, e.message); }
};

// ── Audit trail + login activity ─────────────────────────────────────────────
exports.auditCtrl = async function (req: any, res: any) {
  const fnm = 'auditCtrl';
  try { return ok(req, res, await Audit.listMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

exports.loginsCtrl = async function (req: any, res: any) {
  const fnm = 'loginsCtrl';
  try { return ok(req, res, await Mdl.listLoginsMdl(limitOf(req), req), fnm); }
  catch (e: any) { return fail(res, fnm, 500, e.message); }
};

/** Build a soft activate/deactivate handler for a content entity. */
function mkToggle(fnm: string, mdlFn: string, entity: string, label: string) {
  return async function (req: any, res: any) {
    const d = req.body.data || req.body;
    const active = d.active === true || d.active === 1 || d.active === '1';
    const id = Number(req.params.id);
    try {
      const out = await Mdl[mdlFn](id, active ? 1 : 0, req);
      if (!out.length) return fail(res, fnm, 404, label + ' not found');
      await Audit.logMdl(req.user.id, `${entity}.${active ? 'restore' : 'remove'}`, entity, String(id), null, req);
      return ok(req, res, out[0], fnm, { success_msg: `${label} ${active ? 'restored' : 'removed'}` });
    } catch (e: any) { return fail(res, fnm, 500, e.message); }
  };
}
