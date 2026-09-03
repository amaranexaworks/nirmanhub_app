/**
 * CashbookCtrl — per-project site cashbook.
 *   GET  /cashbook/:projectId/summary?month=YYYY-MM  → { cashInHand, monthIn, monthOut }
 *   GET  /cashbook/:projectId?kind=&from=&to=&limit=  → ledger rows (newest first)
 *   POST /cashbook/:projectId   { kind, amount, party?, title?, note?, mode?, date? }
 *   DELETE /cashbook/:projectId/:id
 * Every handler verifies the caller OWNS the project before reading or writing.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/CashbookMdl');

const KINDS = new Set(['payment_in', 'payment_out', 'expense', 'petty_cash']);
const MAX_AMOUNT = 100000000; // ₹10 cr sanity cap per entry

// Ownership guard — 403 (and false) when the caller doesn't own the project.
const guardOwner = async (req: any, res: any, fnm: string, prjct: number): Promise<boolean> => {
  const rows = await Mdl.assertProjectOwnerMdl(req.user.id, prjct, req);
  if (rows && rows.length) return true;
  df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'Forbidden' });
  return false;
};

// Month window (first/last day) from a YYYY-MM param, defaulting to the current month.
function monthBounds(month: any): { start: string; end: string; ym: string } {
  const now = new Date();
  const ym = /^\d{4}-\d{2}$/.test(String(month))
    ? String(month)
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${ym}-01`, end: `${ym}-${String(last).padStart(2, '0')}`, ym };
}

exports.summaryCtrl = async function (req: any, res: any) {
  const fnm = 'summaryCtrl';
  const prjct = Number(req.params.projectId);
  try {
    if (!(await guardOwner(req, res, fnm, prjct))) return;
    const { start, end, ym } = monthBounds(req.query.month);
    const rows = await Mdl.summaryMdl(prjct, start, end, req);
    const r = rows[0] || {};
    const n = (v: any) => Number(v) || 0;
    return df.formatSucessRes(req, res, {
      month: ym,
      cashInHand: n(r.cash_in_hand),
      monthIn: n(r.month_in),
      monthOut: n(r.month_out),
    }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  const prjct = Number(req.params.projectId);
  try {
    if (!(await guardOwner(req, res, fnm, prjct))) return;
    let from = req.query.from ? String(req.query.from) : null;
    let to = req.query.to ? String(req.query.to) : null;
    // Convenience: ?month=YYYY-MM expands to that month's window.
    if (!from && !to && req.query.month) { const b = monthBounds(req.query.month); from = b.start; to = b.end; }
    const kind = req.query.kind && KINDS.has(String(req.query.kind)) ? String(req.query.kind) : null;
    const rows = await Mdl.listMdl(prjct, { kind, from, to, limit: req.query.limit }, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.createCtrl = async function (req: any, res: any) {
  const fnm = 'createCtrl';
  const prjct = Number(req.params.projectId);
  const d = req.body.data || req.body;
  if (!KINDS.has(String(d.kind))) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'kind must be one of payment_in, payment_out, expense, petty_cash' });
  const amt = Number(d.amount);
  if (!(amt > 0)) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount must be greater than 0' });
  if (amt > MAX_AMOUNT) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount exceeds the allowed limit' });
  try {
    if (!(await guardOwner(req, res, fnm, prjct))) return;
    const out = await Mdl.addMdl(prjct, { ...d, amount: amt }, req.user.id, req);
    return df.formatSucessRes(req, res, out[0], cntxtDtls, fnm, { success_status: 201, success_msg: 'Transaction added' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.removeCtrl = async function (req: any, res: any) {
  const fnm = 'removeCtrl';
  const prjct = Number(req.params.projectId);
  try {
    if (!(await guardOwner(req, res, fnm, prjct))) return;
    const out = await Mdl.removeMdl(prjct, Number(req.params.id), req);
    if (!out.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Transaction not found' });
    return df.formatSucessRes(req, res, { removed: true }, cntxtDtls, fnm, { success_msg: 'Transaction deleted' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
