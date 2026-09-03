/**
 * MenuMdl — serves the bottom-tab bar and side-drawer from the DB, resolved by
 * the user's active archetype. Replaces the frontend's hardcoded tabConfigs.ts /
 * AppMenu.tsx. Same spirit as the WMS role→profile→menu query.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const { cacheGet, cacheSet } = require((global as any).appRoot + '/utils/ttlCache.utils');

// Menus are read on every app open / login but change only when an admin edits
// them. Cache the per-archetype resolutions and invalidate all of them at once by
// bumping a version tag whenever a menu item is created/updated/toggled/retargeted.
const MENU_TTL_MS = 60_000;
let menuVer = 1;
exports.bumpMenuCache = function () { menuVer++; };

/** Bottom tabs for an archetype, ordered. lbl_ovrd_tx wins over the item's default label. */
exports.getTabsMdl = async function (archtyp_id: number, req?: any) {
  const ck = `menu:tabs:${menuVer}:${archtyp_id}`;
  const hit = cacheGet(ck);
  if (hit !== undefined) return hit;
  const QRY = `
    SELECT m.mnu_itm_cd                         AS key,
           COALESCE(am.lbl_ovrd_tx, m.mnu_itm_nm) AS label,
           m.lbl_key_tx, m.icn_tx, m.url_tx,
           m.emphss_in, am.sqnce_id
    FROM ${schema}.archtyp_mnu_itm_rel_t am
    JOIN ${schema}.mnu_itm_lst_t m ON m.mnu_itm_id = am.mnu_itm_id AND m.a_in = 1
    WHERE am.archtyp_id = $1 AND am.a_in = 1 AND m.mnu_type_cd = 'tab'
    ORDER BY am.sqnce_id`;
  const rows = await dbutil.execQuery(sqldb.AppPool, QRY, [archtyp_id], cntxtDtls, req);
  cacheSet(ck, rows, MENU_TTL_MS);
  return rows;
};

/**
 * Drawer items for an archetype. An item is included when it has no gating rows
 * (global) OR a gating row matches this archetype.
 */
exports.getDrawerMdl = async function (archtyp_id: number, req?: any) {
  const ck = `menu:drawer:${menuVer}:${archtyp_id}`;
  const hit = cacheGet(ck);
  if (hit !== undefined) return hit;
  const QRY = `
    SELECT m.mnu_itm_cd AS key, m.mnu_itm_nm AS label, m.lbl_key_tx,
           m.icn_tx, m.url_tx, m.sctn_nm, m.sqnce_id
    FROM ${schema}.mnu_itm_lst_t m
    WHERE m.mnu_type_cd = 'drawer' AND m.a_in = 1
      AND (
        NOT EXISTS (SELECT 1 FROM ${schema}.mnu_itm_archtyp_rel_t g
                     WHERE g.mnu_itm_id = m.mnu_itm_id AND g.a_in = 1)
        OR EXISTS (SELECT 1 FROM ${schema}.mnu_itm_archtyp_rel_t g
                     WHERE g.mnu_itm_id = m.mnu_itm_id AND g.a_in = 1 AND g.archtyp_id = $1)
      )
    ORDER BY m.sqnce_id`;
  const rows = await dbutil.execQuery(sqldb.AppPool, QRY, [archtyp_id], cntxtDtls, req);
  cacheSet(ck, rows, MENU_TTL_MS);
  return rows;
};

/**
 * Menu items of an arbitrary TYPE ('workspace' | 'admin') for an archetype, using the
 * same gating as the drawer: an item shows when it has no gating rows (global) OR a
 * gating row matches this archetype. Ordered by sqnce_id.
 */
exports.getByTypeMdl = function (archtyp_id: number, type: string, req?: any) {
  const QRY = `
    SELECT m.mnu_itm_cd AS key, m.mnu_itm_nm AS label, m.lbl_key_tx,
           m.icn_tx, m.url_tx, m.sctn_nm, m.sqnce_id
    FROM ${schema}.mnu_itm_lst_t m
    WHERE m.mnu_type_cd = $2 AND m.a_in = 1
      AND (
        NOT EXISTS (SELECT 1 FROM ${schema}.mnu_itm_archtyp_rel_t g
                     WHERE g.mnu_itm_id = m.mnu_itm_id AND g.a_in = 1)
        OR EXISTS (SELECT 1 FROM ${schema}.mnu_itm_archtyp_rel_t g
                     WHERE g.mnu_itm_id = m.mnu_itm_id AND g.a_in = 1 AND g.archtyp_id = $1)
      )
    ORDER BY m.sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [archtyp_id, type], cntxtDtls, req);
};

/** Which archetypes each menu item is gated to (for the admin assignment UI). */
exports.getItemArchetypesMdl = function (req?: any) {
  const QRY = `
    SELECT g.mnu_itm_id, a.archtyp_cd
    FROM ${schema}.mnu_itm_archtyp_rel_t g
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = g.archtyp_id
    WHERE g.a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

/**
 * Replace an item's archetype gating with the given set of archetype codes. An empty
 * set clears all gating (→ visible to everyone). Transactional so visibility never ends
 * up half-updated. Returns the resulting archetype codes.
 */
exports.setItemArchetypesMdl = function (mnu_itm_id: number, archtypeCodes: string[], req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    await client.query(`DELETE FROM ${schema}.mnu_itm_archtyp_rel_t WHERE mnu_itm_id = $1`, [mnu_itm_id]);
    if (archtypeCodes && archtypeCodes.length) {
      await client.query(
        `INSERT INTO ${schema}.mnu_itm_archtyp_rel_t (mnu_itm_id, archtyp_id)
         SELECT $1, a.archtyp_id FROM ${schema}.archtyp_lst_t a WHERE a.archtyp_cd = ANY($2::text[])
         ON CONFLICT (mnu_itm_id, archtyp_id) DO NOTHING`,
        [mnu_itm_id, archtypeCodes]);
    }
    const rows = await client.query(
      `SELECT a.archtyp_cd FROM ${schema}.mnu_itm_archtyp_rel_t g
       JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = g.archtyp_id WHERE g.mnu_itm_id = $1`, [mnu_itm_id]);
    exports.bumpMenuCache();
    return rows.rows.map((r: any) => r.archtyp_cd);
  });
};

/** All menu items (admin/catalog view). */
exports.getAllMenuItemsMdl = function (req?: any) {
  const QRY = `
    SELECT mnu_itm_id, mnu_itm_cd, mnu_itm_nm, lbl_key_tx, icn_tx, url_tx,
           mnu_type_cd, sctn_nm, prnt_mnu_itm_id, emphss_in, sqnce_id, a_in
    FROM ${schema}.mnu_itm_lst_t
    ORDER BY mnu_type_cd, sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

// ── Admin menu management (DB-driven navigation) ──
exports.createMenuItemMdl = function (d: any, req?: any) {
  return dbutil.execQuery(sqldb.AppPool, `
    INSERT INTO ${schema}.mnu_itm_lst_t (mnu_itm_cd, mnu_itm_nm, lbl_key_tx, icn_tx, url_tx, mnu_type_cd, sctn_nm, prnt_mnu_itm_id, emphss_in, sqnce_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,0),COALESCE($9,0),COALESCE($10,0))
    ON CONFLICT (mnu_itm_cd, mnu_type_cd) DO UPDATE SET mnu_itm_nm=EXCLUDED.mnu_itm_nm, url_tx=EXCLUDED.url_tx, a_in=1
    RETURNING *`,
    [d.code, d.name, d.labelKey || null, d.icon || null, d.url, d.type || 'drawer', d.section || null, d.parentId || 0, d.emphasis ? 1 : 0, d.sequence || 0], cntxtDtls, req)
    .then((r: any) => { exports.bumpMenuCache(); return r; });
};
exports.updateMenuItemMdl = function (id: number, d: any, req?: any) {
  return dbutil.execQuery(sqldb.AppPool, `
    UPDATE ${schema}.mnu_itm_lst_t SET
      mnu_itm_nm = COALESCE($2, mnu_itm_nm),
      lbl_key_tx = COALESCE($3, lbl_key_tx),
      icn_tx     = COALESCE($4, icn_tx),
      url_tx     = COALESCE($5, url_tx),
      sctn_nm    = COALESCE($6, sctn_nm),
      sqnce_id   = COALESCE($7, sqnce_id),
      emphss_in  = COALESCE($8, emphss_in)
    WHERE mnu_itm_id = $1 RETURNING *`,
    [id, d.name ?? null, d.labelKey ?? null, d.icon ?? null, d.url ?? null, d.section ?? null, d.sequence ?? null, d.emphasis == null ? null : (d.emphasis ? 1 : 0)], cntxtDtls, req)
    .then((r: any) => { exports.bumpMenuCache(); return r; });
};
exports.setMenuItemActiveMdl = function (id: number, active: boolean, req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `UPDATE ${schema}.mnu_itm_lst_t SET a_in = $2 WHERE mnu_itm_id = $1 RETURNING mnu_itm_id, a_in`,
    [id, active ? 1 : 0], cntxtDtls, req)
    .then((r: any) => { exports.bumpMenuCache(); return r; });
};
