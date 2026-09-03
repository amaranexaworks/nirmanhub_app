/** WageMdl — wage payment register, adjustments, and audit log. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

/** Record a wage payment + write an audit entry, atomically. */
exports.createPaymentMdl = function (actor: any, d: any, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const p = await client.query(`
      INSERT INTO ${schema}.wage_pymnt_lst_t
        (rcpt_no_tx, prjct_id, workr_id, amt_am, method_cd, txn_no_tx, utr_tx, bank_nm_tx, upi_tx,
         note_tx, rep_nm_tx, is_prtl_in, grp_id_tx, paid_by_tx, aprvd_by_tx, sts_cd, crtd_by_tx)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING pymnt_id, rcpt_no_tx, amt_am, sts_cd, crtd_ts`,
      [d.receiptNo || null, d.projectId || null, d.workerId || null, d.amount, d.method || 'cash',
       d.txnNumber || null, d.utr || null, d.bankName || null, d.upiId || null, d.note || null,
       d.representative || null, d.isPartial ? 1 : 0, d.groupId || null, d.paidBy || null,
       d.approvedBy || null, d.status || 'paid', actor.name || null]);
    await client.query(`
      INSERT INTO ${schema}.wage_audit_dtl_t (action_tx, detail_tx, usr_tx, role_tx)
      VALUES ('payment.create', $1, $2, $3)`,
      [`₹${d.amount} via ${d.method || 'cash'} (pymnt #${p.rows[0].pymnt_id})`, actor.name || null, actor.archetype || null]);
    return [p.rows[0]];
  });
};

exports.listPaymentsMdl = function (f: any, req?: any) {
  const QRY = `
    SELECT p.pymnt_id, p.rcpt_no_tx, p.amt_am, p.method_cd, p.sts_cd, p.is_prtl_in, p.crtd_by_tx, p.crtd_ts,
           p.workr_id, w.nm_tx AS workr_nm
    FROM ${schema}.wage_pymnt_lst_t p
    LEFT JOIN ${schema}.wf_workr_lst_t w ON w.workr_id = p.workr_id
    WHERE ($1::bigint IS NULL OR p.prjct_id = $1)
      AND ($2::bigint IS NULL OR p.workr_id = $2)
    ORDER BY p.crtd_ts DESC LIMIT 200`;
  return q(QRY, [f.projectId || null, f.workerId || null], req);
};

exports.createAdjustmentMdl = function (actor: any, d: any, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const a = await client.query(`
      INSERT INTO ${schema}.wage_adjstmnt_t (prjct_id, workr_id, kind_cd, amt_am, reason_tx, crtd_by_tx)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING adjstmnt_id, kind_cd, amt_am, sts_cd`,
      [d.projectId || null, d.workerId || null, d.kind, d.amount, d.reason || null, actor.name || null]);
    await client.query(`
      INSERT INTO ${schema}.wage_audit_dtl_t (action_tx, detail_tx, usr_tx, role_tx)
      VALUES ('adjustment.create', $1, $2, $3)`,
      [`${d.kind} ₹${d.amount}`, actor.name || null, actor.archetype || null]);
    return [a.rows[0]];
  });
};

exports.listAdjustmentsMdl = function (projectId: number | null, req?: any) {
  const QRY = `
    SELECT adjstmnt_id, prjct_id, workr_id, kind_cd, amt_am, reason_tx, sts_cd, crtd_ts
    FROM ${schema}.wage_adjstmnt_t
    WHERE ($1::bigint IS NULL OR prjct_id = $1) AND sts_cd = 'active'
    ORDER BY crtd_ts DESC`;
  return q(QRY, [projectId], req);
};

exports.auditMdl = function (limit: number, req?: any) {
  const QRY = `SELECT audit_id, action_tx, detail_tx, usr_tx, role_tx, at_ts
              FROM ${schema}.wage_audit_dtl_t ORDER BY at_ts DESC LIMIT $1`;
  return q(QRY, [limit], req);
};
