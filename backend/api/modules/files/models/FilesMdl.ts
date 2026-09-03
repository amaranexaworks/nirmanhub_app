/**
 * FilesMdl — the two central file tables. Images go to image_lst_t, everything
 * else (PDFs/docs) to document_lst_t. Balance of concerns: the caller decides
 * the table via `isImage`; both share the same shape.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

const table = (isImage: boolean) => (isImage ? 'image_lst_t' : 'document_lst_t');
const idCol = (isImage: boolean) => (isImage ? 'img_id' : 'doc_id');

/**
 * Insert a file row into the right table; returns the new id + metadata (no bytes).
 * Files are stored on disk — only `stor_path_tx` (the relative path) is persisted,
 * never the bytes. `data_tx` stays NULL for new rows (legacy rows still hold base64).
 */
exports.insertMdl = function (isImage: boolean, usr: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.${table(isImage)} (usr_id, purpose_cd, ref_tx, file_nm, mime_tx, stor_path_tx, size_bytes)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING ${idCol(isImage)} AS id, purpose_cd, ref_tx, file_nm, mime_tx, size_bytes, sts_cd, i_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr, d.purpose, d.ref || null, d.fileName || null, d.mime || null, d.storPath, d.size || null], cntxtDtls, req);
};

/** List a user's files of a kind (metadata only — no bytes), optionally by purpose. */
exports.listMdl = function (isImage: boolean, usr: number, purpose: string | null, req?: any) {
  const QRY = `
    SELECT ${idCol(isImage)} AS id, purpose_cd, ref_tx, file_nm, mime_tx, size_bytes, sts_cd, i_ts
    FROM ${schema}.${table(isImage)}
    WHERE usr_id = $1 AND a_in = 1 ${purpose ? 'AND purpose_cd = $2' : ''}
    ORDER BY i_ts DESC`;
  const params = purpose ? [usr, purpose] : [usr];
  return dbutil.execQuery(sqldb.AppPool, QRY, params, cntxtDtls, req);
};

/** Fetch one file (owner-scoped): disk path for new rows, data_tx for legacy rows. */
exports.getMdl = function (isImage: boolean, usr: number, id: number, req?: any) {
  const QRY = `
    SELECT ${idCol(isImage)} AS id, purpose_cd, file_nm, mime_tx, stor_path_tx, data_tx
    FROM ${schema}.${table(isImage)}
    WHERE ${idCol(isImage)} = $1 AND usr_id = $2 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [id, usr], cntxtDtls, req);
};

/** Fetch one file by id ONLY (no owner scope) — used by the capability (fsig) path,
 *  where the unguessable signed URL itself is the grant. Never call this without a
 *  verified fsig. */
exports.getByIdMdl = function (isImage: boolean, id: number, req?: any) {
  const QRY = `
    SELECT ${idCol(isImage)} AS id, purpose_cd, file_nm, mime_tx, stor_path_tx, data_tx
    FROM ${schema}.${table(isImage)}
    WHERE ${idCol(isImage)} = $1 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [id], cntxtDtls, req);
};
