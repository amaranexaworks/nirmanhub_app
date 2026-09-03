/**
 * WalletMdl — per-user money ledger. Balance is derived from the ledger, never
 * stored, so it can't drift. Every value is a bound param.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/**
 * Current balance. SECURITY: a credit only counts once it is SETTLED (sts_cd =
 * 'success'). A user-initiated top-up is written as 'pending' and must be confirmed
 * by a verified payment before it becomes spendable — otherwise `/wallet/add` would
 * be a free-money faucet. Debits (withdrawals/spends) always count, conservatively.
 */
exports.getBalanceMdl = function (usr: number, req?: any) {
  const QRY = `
    SELECT COALESCE(SUM(
      CASE WHEN kind_cd = 'credit' AND sts_cd = 'success' THEN amt_am
           WHEN kind_cd = 'debit' THEN -amt_am
           ELSE 0 END), 0)::numeric AS balance
    FROM ${schema}.wallet_txn_lst_t WHERE usr_id = $1 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr], cntxtDtls, req);
};

/** Recent ledger rows, newest first. */
exports.listTxnsMdl = function (usr: number, limit: number, req?: any) {
  const QRY = `
    SELECT txn_id, kind_cd, amt_am, ttl_tx, ref_tx, sts_cd, i_ts
    FROM ${schema}.wallet_txn_lst_t
    WHERE usr_id = $1 AND a_in = 1 ORDER BY i_ts DESC LIMIT $2`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr, limit], cntxtDtls, req);
};

/** Append one ledger row (credit or debit). `status` lets callers write a 'pending'
 *  credit (user top-up awaiting payment confirmation) vs a settled 'success' credit
 *  (programmatic: wages, refunds). Defaults to 'success' to preserve existing callers. */
exports.addTxnMdl = function (usr: number, kind: string, amt: number, title: string, ref: string | null, req?: any, status?: string) {
  const QRY = `
    INSERT INTO ${schema}.wallet_txn_lst_t (usr_id, kind_cd, amt_am, ttl_tx, ref_tx, sts_cd)
    VALUES ($1,$2,$3,$4,$5,COALESCE($6,'success')) RETURNING txn_id, kind_cd, amt_am, ttl_tx, ref_tx, sts_cd, i_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr, kind, amt, title, ref, status || null], cntxtDtls, req);
};

/**
 * Withdraw atomically. The naive "read balance, then insert debit" is a TOCTOU race —
 * two concurrent withdrawals can both read the same balance and both pass, overdrawing
 * the wallet. A per-user transaction advisory lock serialises withdrawals for one user,
 * so the balance is recomputed and debited with no window in between. Returns
 * { ok:false, balance } when funds are insufficient, else { ok:true, txn, balance }.
 */
exports.withdrawAtomicMdl = function (usr: number, amt: number, title: string, ref: string | null, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    await client.query('SELECT pg_advisory_xact_lock($1)', [usr]);
    const bal = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN kind_cd='credit' AND sts_cd='success' THEN amt_am
                                WHEN kind_cd='debit' THEN -amt_am ELSE 0 END),0)::numeric AS balance
       FROM ${schema}.wallet_txn_lst_t WHERE usr_id=$1 AND a_in=1`, [usr]);
    const balance = Number(bal.rows[0].balance) || 0;
    if (amt > balance) return { ok: false, balance };
    const ins = await client.query(
      `INSERT INTO ${schema}.wallet_txn_lst_t (usr_id, kind_cd, amt_am, ttl_tx, ref_tx, sts_cd)
       VALUES ($1,'debit',$2,$3,$4,'success')
       RETURNING txn_id, kind_cd, amt_am, ttl_tx, ref_tx, sts_cd, i_ts`,
      [usr, amt, title, ref]);
    return { ok: true, txn: ins.rows[0], balance: balance - amt };
  });
};
