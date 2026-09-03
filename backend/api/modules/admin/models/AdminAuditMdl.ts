/** AdminAuditMdl — append + read the admin action audit trail (admin_audit_lst_t). */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

/** Record one privileged action. Never throws into the caller's flow — audit
 * failure must not block the action it describes. */
exports.logMdl = async function (admin_usr_id: number, actn_cd: string, enty_type_cd: string | null, enty_id_tx: string | null, dtl_tx: string | null, req?: any) {
  try {
    return await q(`
      INSERT INTO ${schema}.admin_audit_lst_t (admin_usr_id, actn_cd, enty_type_cd, enty_id_tx, dtl_tx)
      VALUES ($1,$2,$3,$4,$5) RETURNING audit_id`,
      [admin_usr_id, actn_cd, enty_type_cd, enty_id_tx, dtl_tx], req);
  } catch (e: any) {
    console.error('[AdminAuditMdl.logMdl] non-fatal:', e.message);
    return [];
  }
};

exports.listMdl = (limit: number, req?: any) => q(`
  SELECT a.audit_id, a.actn_cd, a.enty_type_cd, a.enty_id_tx, a.dtl_tx, a.i_ts,
         u.usr_id AS admin_usr_id, u.dsply_nm AS admin_nm
  FROM ${schema}.admin_audit_lst_t a
  JOIN ${schema}.usr_lst_t u ON u.usr_id = a.admin_usr_id
  ORDER BY a.i_ts DESC LIMIT $1`, [limit], req);
