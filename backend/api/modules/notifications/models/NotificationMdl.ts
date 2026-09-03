/** NotificationMdl — per-user notifications. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

exports.listMdl = (usr_id: number, unreadOnly: boolean, req?: any) => q(`
  SELECT notfcn_id, ttl_tx, body_tx, type_cd, url_tx, read_in, i_ts
  FROM ${schema}.notfcn_lst_t
  WHERE usr_id = $1 AND a_in = 1 AND ($2 = false OR read_in = 0)
  ORDER BY i_ts DESC LIMIT 100`, [usr_id, unreadOnly], req);

exports.unreadCountMdl = (usr_id: number, req?: any) => q(
  `SELECT count(*)::int AS unread FROM ${schema}.notfcn_lst_t WHERE usr_id = $1 AND a_in = 1 AND read_in = 0`, [usr_id], req);

/** Create a notification (used internally by other modules and for demos). */
exports.createMdl = (usr_id: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.notfcn_lst_t (usr_id, ttl_tx, body_tx, type_cd, url_tx)
  VALUES ($1,$2,$3,$4,$5) RETURNING notfcn_id, ttl_tx, i_ts`,
  [usr_id, d.title, d.body || null, d.type || 'general', d.url || null], req);

exports.markReadMdl = (notfcn_id: number, usr_id: number, req?: any) => q(
  `UPDATE ${schema}.notfcn_lst_t SET read_in = 1 WHERE notfcn_id = $1 AND usr_id = $2 RETURNING notfcn_id`,
  [notfcn_id, usr_id], req);

exports.markAllReadMdl = (usr_id: number, req?: any) => q(
  `UPDATE ${schema}.notfcn_lst_t SET read_in = 1 WHERE usr_id = $1 AND read_in = 0`, [usr_id], req);
