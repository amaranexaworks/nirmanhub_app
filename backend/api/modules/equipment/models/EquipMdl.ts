/** EquipMdl — equipment catalogue + day-rate rentals (optionally site-attributed). */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Public/browse catalogue of available equipment. */
exports.catalogMdl = function (f: any, limit: number, offset: number, req?: any) {
  const QRY = `
    SELECT e.equip_id, e.nm_tx, e.ctgry_tx, e.dly_rate_am, e.lctn_tx, e.img_url_tx, e.dscn_tx, e.sts_cd,
           u.dsply_nm AS owner_nm
    FROM ${schema}.equip_lst_t e
    LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = e.ownr_usr_id
    WHERE e.a_in = 1
      AND ($1::text IS NULL OR e.ctgry_tx = $1)
      AND ($2::text IS NULL OR e.nm_tx ILIKE '%' || $2 || '%')
    ORDER BY e.sts_cd, e.i_ts DESC
    LIMIT $3 OFFSET $4`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [f.category || null, f.q || null, limit, offset], cntxtDtls, req);
};

exports.mineMdl = function (owner_usr_id: number, req?: any) {
  const QRY = `SELECT equip_id, nm_tx, ctgry_tx, dly_rate_am, lctn_tx, sts_cd
              FROM ${schema}.equip_lst_t WHERE ownr_usr_id = $1 AND a_in = 1 ORDER BY i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [owner_usr_id], cntxtDtls, req);
};

exports.addMdl = function (owner_usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.equip_lst_t (ownr_usr_id, nm_tx, ctgry_tx, dly_rate_am, lctn_tx, img_url_tx, dscn_tx)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING equip_id, nm_tx, dly_rate_am`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [owner_usr_id, d.name, d.category || 'other', d.dailyRate || null, d.location || null, d.imageUrl || null, d.description || null], cntxtDtls, req);
};

/** Create a rental for `days` days; total = days × daily rate. */
exports.rentMdl = function (equip_id: number, rentr_usr_id: number, d: any, req?: any) {
  const days = Math.max(1, Number(d.days) || 1);
  const QRY = `
    INSERT INTO ${schema}.equip_rental_t (equip_id, rentr_usr_id, prjct_id, from_dt, days_cnt, ttl_am)
    SELECT $1::bigint, $2::bigint, $3::bigint, $4::date, $5::int, COALESCE(dly_rate_am,0) * $5::numeric
    FROM ${schema}.equip_lst_t WHERE equip_id = $1
    RETURNING rental_id, ttl_am, sts_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [equip_id, rentr_usr_id, d.projectId || null, d.fromDate || null, days], cntxtDtls, req);
};

/** My rentals with equipment name + optional site name. */
exports.myRentalsMdl = function (rentr_usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rental_id, r.days_cnt, r.ttl_am, r.sts_cd, r.from_dt, r.i_ts, r.prjct_id,
           e.nm_tx AS equip_nm, e.ctgry_tx, p.nm_tx AS prjct_nm
    FROM ${schema}.equip_rental_t r
    JOIN ${schema}.equip_lst_t e ON e.equip_id = r.equip_id
    LEFT JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = r.prjct_id
    WHERE r.rentr_usr_id = $1 AND r.a_in = 1 ORDER BY r.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [rentr_usr_id], cntxtDtls, req);
};
