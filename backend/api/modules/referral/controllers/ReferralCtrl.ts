/**
 * ReferralCtrl — a user's referral code, their referred users, and code redemption.
 * The code is derived from the referrer's usr_id (`NM<base36(id)>`), so no storage or
 * lookup table is needed and it is stable for the life of the account.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/ReferralMdl');

const JOIN_REWARD = 100; // ₹ credited to the referrer when someone joins with their code

const codeFor = (usrId: number) => 'NM' + Number(usrId).toString(36).toUpperCase();
const decodeCode = (code: string): number | null => {
  const m = /^NM([0-9A-Z]+)$/i.exec(String(code || '').trim());
  if (!m) return null;
  const id = parseInt(m[1], 36);
  return Number.isFinite(id) && id > 0 ? id : null;
};

exports.summaryCtrl = async function (req: any, res: any) {
  const fnm = 'summaryCtrl';
  try {
    const rows = await Mdl.summaryMdl(req.user.id, req);
    const s = rows[0] || { joined_cnt: 0, reward_am: 0 };
    return df.formatSucessRes(req, res, {
      code: codeFor(req.user.id),
      joined: s.joined_cnt,
      rewardEarned: Number(s.reward_am),
    }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  try { return df.formatSucessRes(req, res, await Mdl.listMdl(req.user.id, req), cntxtDtls, fnm, {}); }
  catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/** Attribute the caller as referred by the owner of `code`. Idempotent, self-safe. */
exports.redeemCtrl = async function (req: any, res: any) {
  const fnm = 'redeemCtrl';
  const referrerId = decodeCode(req.body.code);
  if (!referrerId) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'Invalid referral code' });
  if (referrerId === req.user.id) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'You cannot refer yourself' });
  try {
    const exists = await Mdl.referrerExistsMdl(referrerId, req);
    if (!exists.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'Referral code not recognised' });
    const rows = await Mdl.redeemMdl(referrerId, req.user.id, JOIN_REWARD, req);
    // Empty rows ⇒ ON CONFLICT skipped: the user was already referred. Report gracefully.
    return df.formatSucessRes(req, res, { attributed: rows.length > 0 }, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
