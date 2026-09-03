/**
 * CashbookMdl — per-project cash ledger (Payment In / Out, Expense, Petty Cash).
 * "Cash in hand" is derived from the ledger (sum in − sum out), never stored, so it
 * can't drift. Every value is a bound param. Ownership is enforced by the controller
 * (project owner) before any of these run.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

// A project is accessible to its owner. Returns the project row or [] — used as the
// ownership guard before every cashbook read/write (mirrors the workforce module).
exports.assertProjectOwnerMdl = function (ownr: number, prjct: number, req?: any) {
  const QRY = `SELECT prjct_id FROM ${schema}.wf_prjct_lst_t WHERE prjct_id = $1 AND ownr_usr_id = $2 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [prjct, ownr], cntxtDtls, req);
};

// payment_in is money IN; everything else (payment_out, expense, petty_cash) is OUT.
exports.dirFor = function (kind: string): 'in' | 'out' {
  return kind === 'payment_in' ? 'in' : 'out';
};

/** Ledger rows for a project, newest first. Optional filters: kind, and a date window. */
exports.listMdl = function (prjct: number, opts: any, req?: any) {
  const params: any[] = [prjct];
  let where = `prjct_id = $1 AND a_in = 1`;
  if (opts.kind) { params.push(opts.kind); where += ` AND kind_cd = $${params.length}`; }
  if (opts.from) { params.push(opts.from); where += ` AND txn_dt >= $${params.length}`; }
  if (opts.to)   { params.push(opts.to);   where += ` AND txn_dt <= $${params.length}`; }
  params.push(Math.min(Number(opts.limit) || 100, 300));
  const QRY = `
    SELECT cbk_id, prjct_id, kind_cd, dir_cd, amt_am, party_tx, ttl_tx, note_tx, mode_cd, txn_dt, i_ts
    FROM ${schema}.cashbook_txn_lst_t
    WHERE ${where}
    ORDER BY txn_dt DESC, i_ts DESC
    LIMIT $${params.length}`;
  return dbutil.execQuery(sqldb.AppPool, QRY, params, cntxtDtls, req);
};

/** Append one ledger entry. dir is derived server-side from the kind. */
exports.addMdl = function (prjct: number, d: any, userId: number, req?: any) {
  const kind = d.kind;
  const dir = exports.dirFor(kind);
  const QRY = `
    INSERT INTO ${schema}.cashbook_txn_lst_t
      (prjct_id, kind_cd, dir_cd, amt_am, party_tx, ttl_tx, note_tx, mode_cd, txn_dt, created_by_usr_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::date, CURRENT_DATE),$10)
    RETURNING cbk_id, prjct_id, kind_cd, dir_cd, amt_am, party_tx, ttl_tx, note_tx, mode_cd, txn_dt, i_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [prjct, kind, dir, d.amount, d.party || null, d.title || null, d.note || null, d.mode || null, d.date || null, userId],
    cntxtDtls, req);
};

/**
 * Summary for the header: total cash in hand (all time) + this-month in/out totals.
 * A single query so the three numbers are always consistent with each other.
 */
exports.summaryMdl = function (prjct: number, monthStart: string, monthEnd: string, req?: any) {
  const QRY = `
    SELECT
      COALESCE(SUM(CASE WHEN dir_cd = 'in'  THEN amt_am ELSE -amt_am END), 0)::numeric AS cash_in_hand,
      COALESCE(SUM(CASE WHEN dir_cd = 'in'  AND txn_dt BETWEEN $2 AND $3 THEN amt_am ELSE 0 END), 0)::numeric AS month_in,
      COALESCE(SUM(CASE WHEN dir_cd = 'out' AND txn_dt BETWEEN $2 AND $3 THEN amt_am ELSE 0 END), 0)::numeric AS month_out
    FROM ${schema}.cashbook_txn_lst_t
    WHERE prjct_id = $1 AND a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [prjct, monthStart, monthEnd], cntxtDtls, req);
};

/** Soft-delete an entry (owner-scoped by the controller). */
exports.removeMdl = function (prjct: number, cbk_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.cashbook_txn_lst_t SET a_in = 0, u_ts = now()
               WHERE cbk_id = $1 AND prjct_id = $2 AND a_in = 1 RETURNING cbk_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [cbk_id, prjct], cntxtDtls, req);
};
