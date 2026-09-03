/**
 * MenuCtrl — assembles the navigation payload for the logged-in user.
 * GET /api/nav/menu → { archetype, tabs:[...], drawer:{ sections:[{ name, items:[...] }] } }
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const jsonUtils = require((global as any).appRoot + '/utils/json.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const MenuMdl = require('../models/MenuMdl');

// Group menu rows into ordered { name, items[] } sections, preserving first-seen order.
function groupSections(rows: any[]) {
  const map: Record<string, any[]> = {};
  const order: string[] = [];
  for (const d of rows) {
    const name = d.sctn_nm || 'GENERAL';
    if (!map[name]) { map[name] = []; order.push(name); }
    map[name].push({ key: d.key, label: d.label, labelKey: d.lbl_key_tx, icon: d.icn_tx, route: d.url_tx });
  }
  return order.map((name) => ({ name, items: map[name] }));
}

/** GET /nav/menu */
exports.getMenuCtrl = async function (req: any, res: any) {
  const fnm = 'getMenuCtrl';
  try {
    const active = req.user.activeRole;
    if (!active || !active.archtyp_id) {
      // A user with no role yet gets an empty shell (client shows onboarding).
      return df.formatSucessRes(req, res, { archetype: null, tabs: [], drawer: { sections: [] } }, cntxtDtls, fnm, {});
    }
    const archtypId = active.archtyp_id;

    const [tabsRows, drawerRows, workspaceRows, adminRows] = await Promise.all([
      MenuMdl.getTabsMdl(archtypId, req),
      MenuMdl.getDrawerMdl(archtypId, req),
      MenuMdl.getByTypeMdl(archtypId, 'workspace', req),  // web member sidebar
      MenuMdl.getByTypeMdl(archtypId, 'admin', req),      // web admin console sidebar
    ]);

    const tabs = tabsRows.map((t: any) => ({
      key: t.key,
      label: t.label,
      labelKey: t.lbl_key_tx,
      icon: t.icn_tx,
      route: t.url_tx,
      emphasized: t.emphss_in === 1,
    }));

    return df.formatSucessRes(req, res, {
      archetype: req.user.archetype,
      activeRole: active,
      tabs,
      drawer: { sections: groupSections(drawerRows) },
      workspace: { sections: groupSections(workspaceRows) },
      admin: { sections: groupSections(adminRows) },
    }, cntxtDtls, fnm, {});
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

/** GET /nav/menu-items — full catalog (admin). */
exports.getAllMenuItemsCtrl = async function (req: any, res: any) {
  const fnm = 'getAllMenuItemsCtrl';
  try {
    const rows = await MenuMdl.getAllMenuItemsMdl(req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

/**
 * GET /nav/menu-assignments — the full menu catalog + which archetypes each item is
 * gated to + the archetype list. Powers the admin "Menu / navigation" assignment UI.
 */
exports.getMenuAssignmentsCtrl = async function (req: any, res: any) {
  const fnm = 'getMenuAssignmentsCtrl';
  try {
    const [items, gating] = await Promise.all([
      MenuMdl.getAllMenuItemsMdl(req),
      MenuMdl.getItemArchetypesMdl(req),
    ]);
    // itemId → [archetype codes]
    const byItem: Record<number, string[]> = {};
    for (const g of gating) (byItem[g.mnu_itm_id] ||= []).push(g.archtyp_cd);
    const withArchetypes = items.map((it: any) => ({ ...it, archetypes: byItem[it.mnu_itm_id] || [] }));
    return df.formatSucessRes(req, res, withArchetypes, cntxtDtls, fnm, {});
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

/** PUT /nav/menu-items/:id/archetypes { archetypes:[codes] } — set who sees this item. */
exports.setMenuItemArchetypesCtrl = async function (req: any, res: any) {
  const fnm = 'setMenuItemArchetypesCtrl';
  const d = req.body.data || req.body;
  const codes: string[] = Array.isArray(d.archetypes) ? d.archetypes.filter((c: any) => typeof c === 'string') : [];
  try {
    const now = await MenuMdl.setItemArchetypesMdl(Number(req.params.id), codes, req);
    return df.formatSucessRes(req, res, { archetypes: now }, cntxtDtls, fnm, { success_msg: 'Menu visibility updated' });
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

// suppress unused import warning while keeping the helper available for future tree-building
void jsonUtils;

// ── Admin menu management ──
exports.createMenuItemCtrl = async function (req: any, res: any) { const fnm='createMenuItemCtrl'; const d=req.body.data||req.body; if(!d.code||!d.name||!d.url) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:400,err_message:'code, name and url are required'}); try { const o=await MenuMdl.createMenuItemMdl(d,req); return df.formatSucessRes(req,res,o[0],cntxtDtls,fnm,{success_status:201,success_msg:'Menu item saved'}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
exports.updateMenuItemCtrl = async function (req: any, res: any) { const fnm='updateMenuItemCtrl'; const d=req.body.data||req.body; try { const o=await MenuMdl.updateMenuItemMdl(Number(req.params.id),d,req); if(!o[0]) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:404,err_message:'not found'}); return df.formatSucessRes(req,res,o[0],cntxtDtls,fnm,{success_msg:'Updated'}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
exports.setMenuItemActiveCtrl = async function (req: any, res: any) { const fnm='setMenuItemActiveCtrl'; const d=req.body.data||req.body; try { const o=await MenuMdl.setMenuItemActiveMdl(Number(req.params.id), !!d.active, req); if(!o[0]) return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:404,err_message:'not found'}); return df.formatSucessRes(req,res,o[0],cntxtDtls,fnm,{success_msg:d.active?'Shown':'Hidden'}); } catch(e:any){ return df.formatErrorRes(res,null,cntxtDtls,fnm,{error_status:500,err_message:e.message}); } };
