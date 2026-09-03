/**
 * RbacCtrl — exposes the RBAC catalog and assignment operations.
 *   GET  /rbac/bootstrap    → { archetypes, roles, capabilities, archetypeCapabilities, departments }
 *   GET  /rbac/archetypes | /rbac/roles | /rbac/capabilities | /rbac/departments
 *   POST /rbac/users/:userId/roles          { rle_id, prmry_in? }
 *   DEL  /rbac/users/:userId/roles/:rleId
 *   POST /rbac/users/:userId/departments     { dprtmnt_id, dsgntn_id?, prmry_in? }
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const RbacMdl = require('../models/RbacMdl');
const UserAuthMdl = require((global as any).appRoot + '/api/modules/auth/models/UserAuthMdl');

/** One call the client uses at startup to hydrate all role/capability config. */
exports.bootstrapCtrl = async function (req: any, res: any) {
  const fnm = 'bootstrapCtrl';
  try {
    const [archetypes, roles, capabilities, acRel, deptRows] = await Promise.all([
      RbacMdl.getArchetypesMdl(req),
      RbacMdl.getRolesMdl(null, req),
      RbacMdl.getCapabilitiesMdl(req),
      RbacMdl.getArchetypeCapabilityRelMdl(req),
      RbacMdl.getDepartmentsMdl(req),
    ]);

    // archetype_cd → [capability_cd]
    const archetypeCapabilities: Record<string, string[]> = {};
    for (const r of acRel) {
      (archetypeCapabilities[r.archtyp_cd] ||= []).push(r.cpblty_cd);
    }

    return df.formatSucessRes(req, res, {
      archetypes, roles, capabilities, archetypeCapabilities,
      departments: exports._nestDepartments(deptRows),
    }, cntxtDtls, fnm, {});
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

exports.getArchetypesCtrl = async function (req: any, res: any) {
  const fnm = 'getArchetypesCtrl';
  try { return df.formatSucessRes(req, res, await RbacMdl.getArchetypesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.getRolesCtrl = async function (req: any, res: any) {
  const fnm = 'getRolesCtrl';
  try { return df.formatSucessRes(req, res, await RbacMdl.getRolesMdl(req.query.archetype || null, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.getCapabilitiesCtrl = async function (req: any, res: any) {
  const fnm = 'getCapabilitiesCtrl';
  try { return df.formatSucessRes(req, res, await RbacMdl.getCapabilitiesMdl(req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.getDepartmentsCtrl = async function (req: any, res: any) {
  const fnm = 'getDepartmentsCtrl';
  try { return df.formatSucessRes(req, res, exports._nestDepartments(await RbacMdl.getDepartmentsMdl(req)), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.assignRoleCtrl = async function (req: any, res: any) {
  const fnm = 'assignRoleCtrl';
  const data = req.body.data || req.body;
  const userId = Number(req.params.userId);
  if (!data.rle_id) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'rle_id is required' });
  try {
    // Assigning an admin-archetype role is a privilege grant — only a FULL admin
    // (admin_access) may do it, not a partial admin who merely holds manage_users.
    const arc = await RbacMdl.getRoleArchetypeMdl(Number(data.rle_id), req);
    if (arc && arc[0] && arc[0].archtyp_cd === 'admin' && !(req.user.capabilities || []).includes('admin_access')) {
      return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'Only a full administrator can assign an admin role' });
    }
    const out = await RbacMdl.assignRoleMdl(userId, Number(data.rle_id), data.prmry_in ? 1 : 0, req);
    // Roles drive capabilities — force the user to re-auth so the change applies now.
    await UserAuthMdl.invalidateUserTokensMdl(userId, req).catch(() => {});
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Role assigned' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.removeRoleCtrl = async function (req: any, res: any) {
  const fnm = 'removeRoleCtrl';
  try {
    const userId = Number(req.params.userId);
    await RbacMdl.removeRoleMdl(userId, Number(req.params.rleId), req);
    await UserAuthMdl.invalidateUserTokensMdl(userId, req).catch(() => {});
    return df.formatSucessRes(req, res, { removed: true }, cntxtDtls, fnm, { success_msg: 'Role removed' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.assignDepartmentCtrl = async function (req: any, res: any) {
  const fnm = 'assignDepartmentCtrl';
  const data = req.body.data || req.body;
  const userId = Number(req.params.userId);
  if (!data.dprtmnt_id) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'dprtmnt_id is required' });
  try {
    const out = await RbacMdl.assignDepartmentMdl(userId, Number(data.dprtmnt_id), data.dsgntn_id ? Number(data.dsgntn_id) : null, data.prmry_in ? 1 : 0, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_msg: 'Department assigned' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Collapse the department×designation row set into departments each with a designations[] array. */
exports._nestDepartments = function (rows: any[]) {
  const map = new Map<number, any>();
  for (const r of rows) {
    if (!map.has(r.dprtmnt_id)) {
      map.set(r.dprtmnt_id, {
        dprtmnt_id: r.dprtmnt_id, dprtmnt_cd: r.dprtmnt_cd, dprtmnt_nm: r.dprtmnt_nm,
        dscn_tx: r.dscn_tx, sqnce_id: r.sqnce_id, designations: [],
      });
    }
    if (r.dsgntn_id) {
      map.get(r.dprtmnt_id).designations.push({ dsgntn_id: r.dsgntn_id, dsgntn_cd: r.dsgntn_cd, dsgntn_nm: r.dsgntn_nm });
    }
  }
  return Array.from(map.values());
};
