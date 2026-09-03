/** PortfolioMdl — a professional's showcase of completed projects. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

const COLS = `prtfl_id, ownr_usr_id, ttl_tx, desc_tx, cover_url_tx, lctn_tx, year_nm, i_ts`;

/** All active portfolio items for an owner, newest first. */
exports.listMdl = function (ownr_usr_id: number, req?: any) {
  const QRY = `SELECT ${COLS} FROM ${schema}.prtfl_lst_t
               WHERE ownr_usr_id = $1 AND a_in = 1 ORDER BY i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [ownr_usr_id], cntxtDtls, req);
};

exports.createMdl = function (ownr_usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.prtfl_lst_t (ownr_usr_id, ttl_tx, desc_tx, cover_url_tx, lctn_tx, year_nm)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING ${COLS}`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [ownr_usr_id, d.title, d.description || null, d.coverUrl || null, d.location || null, d.year || null], cntxtDtls, req);
};

/** Update an item — scoped to its owner so no one can edit another user's portfolio. */
exports.updateMdl = function (prtfl_id: number, ownr_usr_id: number, d: any, req?: any) {
  const QRY = `
    UPDATE ${schema}.prtfl_lst_t SET
      ttl_tx       = COALESCE($3, ttl_tx),
      desc_tx      = COALESCE($4, desc_tx),
      cover_url_tx = COALESCE($5, cover_url_tx),
      lctn_tx      = COALESCE($6, lctn_tx),
      year_nm      = COALESCE($7, year_nm),
      u_ts         = now()
    WHERE prtfl_id = $1 AND ownr_usr_id = $2 AND a_in = 1
    RETURNING ${COLS}`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [prtfl_id, ownr_usr_id, d.title ?? null, d.description ?? null, d.coverUrl ?? null, d.location ?? null, d.year ?? null], cntxtDtls, req);
};

/** Soft-delete an item, scoped to its owner. */
exports.removeMdl = function (prtfl_id: number, ownr_usr_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.prtfl_lst_t SET a_in = 0, u_ts = now()
               WHERE prtfl_id = $1 AND ownr_usr_id = $2 RETURNING prtfl_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [prtfl_id, ownr_usr_id], cntxtDtls, req);
};
