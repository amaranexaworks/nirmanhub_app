/** MaterialMdl — catalog (categories + items) and orders. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.categoriesMdl = function (req?: any) {
  const QRY = `SELECT ctgry_id, ctgry_cd, ctgry_nm, icn_tx, img_url_tx, sqnce_id, sctn_nm
              FROM ${schema}.mtrl_ctgry_lst_t WHERE a_in = 1 ORDER BY sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

exports.catalogMdl = function (f: any, limit: number, offset: number, req?: any) {
  // Whitelisted sort (never interpolate raw user input): 'new' = latest first.
  const orderBy = f.sort === 'new' ? 'i.item_id DESC' : 'i.poplr_in DESC, i.nm_tx';
  const QRY = `
    SELECT i.item_id, i.nm_tx, i.emoji_tx, i.price_am, i.unit_tx, i.eta_min, i.poplr_in,
           i.sub_ctgry_tx, i.brnd_tx,
           COALESCE(i.img_url_tx, c.img_url_tx) AS img_url_tx, c.icn_tx,
           c.ctgry_cd, c.ctgry_nm, i.vrfy_sts_cd, c.rqrs_vrfy_in,
           (i.vrfy_sts_cd IN ('auto','verified')) AS verified,
           EXISTS (SELECT 1 FROM ${schema}.mtrl_item_variant_t v WHERE v.item_id = i.item_id AND v.a_in = 1) AS has_variants
    FROM ${schema}.mtrl_item_lst_t i
    LEFT JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
    WHERE i.a_in = 1
      AND ($1::text IS NULL OR c.ctgry_cd = $1)
      AND ($2::text IS NULL OR i.nm_tx ILIKE '%' || $2 || '%')
      AND ($5::text IS NULL OR i.sub_ctgry_tx = $5)
      AND ($6::text IS NULL OR i.brnd_tx = $6)
    ORDER BY ${orderBy}
    LIMIT $3 OFFSET $4`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [f.category || null, f.q || null, limit, offset, f.subType || null, f.brand || null], cntxtDtls, req);
};

/** Distinct sub-types within a category (e.g. Ceiling / Table / Exhaust Fans), each
 *  with a representative image + item count. Empty ⇒ the category has no sub-types. */
exports.subtypesMdl = function (category: string, req?: any) {
  const QRY = `
    SELECT i.sub_ctgry_tx AS sub_nm, count(*)::int AS item_count,
           (array_agg(COALESCE(i.img_url_tx, c.img_url_tx) ORDER BY i.poplr_in DESC, i.item_id))[1] AS img_url_tx
    FROM ${schema}.mtrl_item_lst_t i
    JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
    WHERE i.a_in = 1 AND c.ctgry_cd = $1 AND i.sub_ctgry_tx IS NOT NULL
    GROUP BY i.sub_ctgry_tx
    ORDER BY item_count DESC, sub_nm`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [category], cntxtDtls, req);
};

/** Distinct brands within a category (optionally narrowed to one sub-type). */
exports.brandsMdl = function (category: string, subType: string | null, req?: any) {
  const QRY = `
    SELECT i.brnd_tx AS brnd_nm, count(*)::int AS item_count,
           (array_agg(COALESCE(i.img_url_tx, c.img_url_tx) ORDER BY i.poplr_in DESC, i.item_id))[1] AS img_url_tx
    FROM ${schema}.mtrl_item_lst_t i
    JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
    WHERE i.a_in = 1 AND c.ctgry_cd = $1 AND i.brnd_tx IS NOT NULL
      AND ($2::text IS NULL OR i.sub_ctgry_tx = $2)
    GROUP BY i.brnd_tx
    ORDER BY item_count DESC, brnd_nm`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [category, subType || null], cntxtDtls, req);
};

/** Full product detail: item + colour variants + specs + features + pack options + highlights. */
exports.itemDetailMdl = async function (itemId: number, req?: any) {
  const head = await dbutil.execQuery(sqldb.AppPool, `
    SELECT i.item_id, i.nm_tx, i.emoji_tx, i.price_am, i.unit_tx, i.eta_min, i.poplr_in,
           i.sub_ctgry_tx, i.brnd_tx, COALESCE(i.img_url_tx, c.img_url_tx) AS img_url_tx, c.icn_tx,
           c.ctgry_cd, c.ctgry_nm
    FROM ${schema}.mtrl_item_lst_t i
    LEFT JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
    WHERE i.item_id = $1 AND i.a_in = 1`, [itemId], cntxtDtls, req);
  if (!head.length) return null;
  const variants = await dbutil.execQuery(sqldb.AppPool,
    `SELECT variant_id, clr_nm, clr_hex, price_am, img_url_tx, sku_tx
     FROM ${schema}.mtrl_item_variant_t WHERE item_id = $1 AND a_in = 1 ORDER BY sqnce_id, variant_id`,
    [itemId], cntxtDtls, req);
  const specs = await dbutil.execQuery(sqldb.AppPool,
    `SELECT k_tx, v_tx FROM ${schema}.mtrl_item_spec_t
     WHERE item_id = $1 AND a_in = 1 AND spec_typ_cd = 'spec' ORDER BY sqnce_id, spec_id`,
    [itemId], cntxtDtls, req);
  const features = await dbutil.execQuery(sqldb.AppPool,
    `SELECT k_tx FROM ${schema}.mtrl_item_spec_t
     WHERE item_id = $1 AND a_in = 1 AND spec_typ_cd = 'feature' ORDER BY sqnce_id, spec_id`,
    [itemId], cntxtDtls, req);
  const packs = await exports.packsMdl(head[0].ctgry_cd, req);
  const highlights = await exports.highlightsMdl(req);
  return { ...head[0], variants, specs, features: features.map((f: any) => f.k_tx), packs, highlights };
};

/** Marketing banners for a slot ('hero' | 'ad'). */
exports.promosMdl = function (slot: string, req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `SELECT slot_cd, tag_tx, ttl_tx, sub_tx, cta_tx, actn_cd, icn_tx, bg_tx, fg_tx, cta_fg_tx, img_url_tx
     FROM ${schema}.mtrl_promo_lst_t WHERE a_in = 1 AND slot_cd = $1 ORDER BY sqnce_id, promo_id`,
    [slot], cntxtDtls, req);
};

/** Pack-size options for a category (its own if defined, else the global '*' set). */
exports.packsMdl = function (category: string | null, req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `SELECT mult_qty, label_tx FROM ${schema}.mtrl_pack_lst_t
     WHERE a_in = 1 AND ctgry_cd = COALESCE(
       (SELECT ctgry_cd FROM ${schema}.mtrl_pack_lst_t WHERE a_in = 1 AND ctgry_cd = $1 LIMIT 1), '*')
     ORDER BY sqnce_id, mult_qty`,
    [category || null], cntxtDtls, req);
};

/** Global product highlights / trade assurances. */
exports.highlightsMdl = function (req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `SELECT icn_tx, label_tx FROM ${schema}.mtrl_highlight_lst_t WHERE a_in = 1 ORDER BY sqnce_id, hl_id`,
    [], cntxtDtls, req);
};

/** Curated project kits ("Shop by project") — each with its item count + cover. */
exports.kitsMdl = function (req?: any) {
  return dbutil.execQuery(sqldb.AppPool, `
    SELECT k.kit_id, k.kit_cd, k.nm_tx, k.sub_tx, k.tag_tx, k.img_url_tx,
           (SELECT count(*) FROM ${schema}.mtrl_kit_item_rel_t r WHERE r.kit_id = k.kit_id)::int AS item_count
    FROM ${schema}.mtrl_kit_lst_t k WHERE k.a_in = 1 ORDER BY k.sqnce_id, k.kit_id`, [], cntxtDtls, req);
};

/** One kit + its items (full product fields, ready for the storefront cards). */
exports.kitDetailMdl = async function (kitId: number, req?: any) {
  const head = await dbutil.execQuery(sqldb.AppPool,
    `SELECT kit_id, kit_cd, nm_tx, sub_tx, tag_tx, img_url_tx FROM ${schema}.mtrl_kit_lst_t WHERE kit_id = $1 AND a_in = 1`,
    [kitId], cntxtDtls, req);
  if (!head.length) return null;
  const items = await dbutil.execQuery(sqldb.AppPool, `
    SELECT i.item_id, i.nm_tx, i.emoji_tx, i.price_am, i.unit_tx, i.eta_min, i.poplr_in,
           i.sub_ctgry_tx, i.brnd_tx, COALESCE(i.img_url_tx, c.img_url_tx) AS img_url_tx, c.icn_tx,
           c.ctgry_cd, c.ctgry_nm, r.qty,
           EXISTS (SELECT 1 FROM ${schema}.mtrl_item_variant_t v WHERE v.item_id = i.item_id AND v.a_in = 1) AS has_variants
    FROM ${schema}.mtrl_kit_item_rel_t r
    JOIN ${schema}.mtrl_item_lst_t i ON i.item_id = r.item_id AND i.a_in = 1
    LEFT JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
    WHERE r.kit_id = $1 ORDER BY r.sqnce_id, i.nm_tx`, [kitId], cntxtDtls, req);
  const total = items.reduce((s: number, it: any) => s + Number(it.price_am) * Number(it.qty || 1), 0);
  return { ...head[0], items, total_am: total };
};

exports.addItemMdl = function (vndr_usr_id: number, d: any, req?: any) {
  // New items in a require-verification category start 'pending'; others auto-approve.
  const QRY = `
    INSERT INTO ${schema}.mtrl_item_lst_t (nm_tx, emoji_tx, ctgry_id, price_am, unit_tx, eta_min, poplr_in, vndr_usr_id, vrfy_sts_cd)
    SELECT $1, $2, c.ctgry_id, $4, $5, $6, $7, $8, CASE WHEN c.rqrs_vrfy_in = 1 THEN 'pending' ELSE 'auto' END
    FROM ${schema}.mtrl_ctgry_lst_t c WHERE c.ctgry_cd = $3
    ON CONFLICT (nm_tx) DO UPDATE SET price_am = EXCLUDED.price_am, unit_tx = EXCLUDED.unit_tx, a_in = 1
    RETURNING item_id, nm_tx, price_am, vrfy_sts_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [d.name, d.emoji || null, d.category || 'other', d.price, d.unit || null,
     d.etaMin || null, d.popular ? 1 : 0, vndr_usr_id], cntxtDtls, req);
};

// ── Verification-by-category (036) ──
exports.listCategoriesVerifyMdl = function (req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `SELECT ctgry_id, ctgry_cd, ctgry_nm, sctn_nm, img_url_tx, rqrs_vrfy_in,
            (SELECT count(*) FROM ${schema}.mtrl_item_lst_t i WHERE i.ctgry_id = c.ctgry_id AND i.vrfy_sts_cd = 'pending') AS pending_count
     FROM ${schema}.mtrl_ctgry_lst_t c WHERE c.a_in = 1 ORDER BY c.sqnce_id, c.ctgry_nm`, [], cntxtDtls, req);
};
exports.setCategoryVerifyMdl = function (ctgryId: number, requires: boolean, req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `UPDATE ${schema}.mtrl_ctgry_lst_t SET rqrs_vrfy_in = $2 WHERE ctgry_id = $1 RETURNING ctgry_id, ctgry_cd, rqrs_vrfy_in`,
    [ctgryId, requires ? 1 : 0], cntxtDtls, req);
};
exports.listPendingItemsMdl = function (req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `SELECT i.item_id, i.nm_tx, i.price_am, i.unit_tx, i.vrfy_sts_cd, c.ctgry_nm, u.dsply_nm AS vendor_nm
     FROM ${schema}.mtrl_item_lst_t i
     LEFT JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = i.ctgry_id
     LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = i.vndr_usr_id
     WHERE i.a_in = 1 AND i.vrfy_sts_cd = 'pending' ORDER BY i.item_id DESC`, [], cntxtDtls, req);
};
exports.setItemVerifyMdl = function (itemId: number, status: string, req?: any) {
  return dbutil.execQuery(sqldb.AppPool,
    `UPDATE ${schema}.mtrl_item_lst_t SET vrfy_sts_cd = $2 WHERE item_id = $1 RETURNING item_id, nm_tx, vrfy_sts_cd`,
    [itemId, status], cntxtDtls, req);
};

/** Create an order + its line items in one transaction. */
exports.createOrderMdl = function (buyer_usr_id: number, d: any, req?: any) {
  const items: any[] = d.items || [];
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const total = items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 1), 0);
    const ord = await client.query(
      `INSERT INTO ${schema}.mtrl_ordr_lst_t (buyer_usr_id, ttl_am, dlvry_tx, prjct_id) VALUES ($1,$2,$3,$4) RETURNING ordr_id, sts_cd, i_ts`,
      [buyer_usr_id, total, d.deliveryTo || null, d.projectId || null]
    );
    const ordrId = ord.rows[0].ordr_id;
    for (const it of items) {
      await client.query(
        `INSERT INTO ${schema}.mtrl_ordr_item_t (ordr_id, item_id, nm_tx, unit_tx, qty, price_am)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ordrId, it.itemId || null, it.name, it.unit || null, it.qty || 1, it.price || 0]
      );
    }
    return [{ ...ord.rows[0], ttl_am: total, itemCount: items.length }];
  });
};

exports.myOrdersMdl = function (buyer_usr_id: number, projectId?: number | null, req?: any) {
  const QRY = `
    SELECT o.ordr_id, o.ttl_am, o.sts_cd, o.dlvry_tx, o.i_ts, o.prjct_id, p.nm_tx AS prjct_nm,
           (SELECT count(*) FROM ${schema}.mtrl_ordr_item_t it WHERE it.ordr_id = o.ordr_id) AS item_count
    FROM ${schema}.mtrl_ordr_lst_t o
    LEFT JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = o.prjct_id
    WHERE o.a_in = 1 AND o.buyer_usr_id = $1
      AND ($2::bigint IS NULL OR o.prjct_id = $2)
    ORDER BY o.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [buyer_usr_id, projectId || null], cntxtDtls, req);
};

exports.orderDetailMdl = async function (ordr_id: number, req?: any) {
  const head = await dbutil.execQuery(sqldb.AppPool,
    `SELECT ordr_id, ttl_am, sts_cd, dlvry_tx, i_ts FROM ${schema}.mtrl_ordr_lst_t WHERE ordr_id = $1 AND a_in = 1`,
    [ordr_id], cntxtDtls, req);
  if (!head.length) return null;
  const items = await dbutil.execQuery(sqldb.AppPool,
    `SELECT id, item_id, nm_tx, unit_tx, qty, price_am FROM ${schema}.mtrl_ordr_item_t WHERE ordr_id = $1`,
    [ordr_id], cntxtDtls, req);
  return { ...head[0], items };
};
