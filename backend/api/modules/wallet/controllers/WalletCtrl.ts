/**
 * WalletCtrl
 *   GET  /wallet/balance       → { balance }
 *   GET  /wallet/transactions  → recent ledger rows
 *   POST /wallet/add           → add money (credit)
 *   POST /wallet/withdraw      → withdraw (debit, blocked if insufficient)
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/WalletMdl');

const balanceOf = async (usr: number, req: any) => {
  const rows = await Mdl.getBalanceMdl(usr, req);
  return Number(rows && rows[0] && rows[0].balance) || 0;
};

exports.balanceCtrl = async function (req: any, res: any) {
  const fnm = 'balanceCtrl';
  try {
    return df.formatSucessRes(req, res, { balance: await balanceOf(req.user.id, req) }, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};

exports.transactionsCtrl = async function (req: any, res: any) {
  const fnm = 'transactionsCtrl';
  try {
    const rows = await Mdl.listTxnsMdl(req.user.id, Number(req.query.limit) || 50, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};

// Upper sanity bound on a single wallet operation (₹). Blocks absurd amounts and
// numeric-overflow probes; a real gateway would enforce its own limits too.
const MAX_TXN_AMOUNT = 1000000;

exports.addMoneyCtrl = async function (req: any, res: any) {
  const fnm = 'addMoneyCtrl';
  const d = req.body.data || req.body;
  const amt = Number(d.amount);
  if (!(amt > 0)) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount must be greater than 0' });
  if (amt > MAX_TXN_AMOUNT) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount exceeds the allowed limit' });
  try {
    // SECURITY: a client cannot mint balance out of thin air. The top-up is recorded
    // as 'pending' and does NOT count toward the balance until a verified payment
    // confirms it (settled → 'success'). Wire a payment-gateway webhook to flip the
    // status; until then this records an intent, not spendable money.
    const rows = await Mdl.addTxnMdl(req.user.id, 'credit', amt, d.title || 'Wallet top-up', d.ref || null, req, 'pending');
    const balance = await balanceOf(req.user.id, req);
    return df.formatSucessRes(req, res, { txn: rows[0], balance }, cntxtDtls, fnm, { success_status: 201, success_msg: 'Top-up initiated — awaiting payment confirmation' });
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};

exports.withdrawCtrl = async function (req: any, res: any) {
  const fnm = 'withdrawCtrl';
  const d = req.body.data || req.body;
  const amt = Number(d.amount);
  if (!(amt > 0)) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount must be greater than 0' });
  if (amt > MAX_TXN_AMOUNT) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'amount exceeds the allowed limit' });
  try {
    // Atomic: the balance check + debit run under a per-user lock, so two concurrent
    // withdrawals can't both pass the check and overdraw the wallet.
    const out = await Mdl.withdrawAtomicMdl(req.user.id, amt, d.title || 'Withdrawal to bank', d.ref || null, req);
    if (!out.ok) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'Insufficient balance' });
    return df.formatSucessRes(req, res, { txn: out.txn, balance: out.balance }, cntxtDtls, fnm, { success_status: 201, success_msg: 'Withdrawal requested' });
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
