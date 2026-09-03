/** PassportCtrl — Nirmaan Digital ID.
 *  GET /passport/me  (auth)   → my card (ensures my 6-digit code, returns my passport)
 *  GET /passport/:code (public) → verify/scan a worker by their 6-digit code */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const PassportMdl = require('../models/PassportMdl');

/** Shape the raw row into a web-friendly passport with derived experience. */
function shape(row: any) {
  if (!row) return null;
  const since = row.member_since ? new Date(row.member_since) : null;
  const yrs = since ? Math.max(0, (Date.now() - since.getTime()) / (365.25 * 24 * 3600 * 1000)) : 0;
  return {
    code: String(row.psprt_cd_tx).trim(),
    name: row.dsply_nm || 'Member',
    headline: row.hdln_tx || null,
    city: row.cty_nm || null,
    avatarUrl: row.avtr_url_tx || null,
    role: row.rle_nm || null,
    roleCode: row.rle_cd || null,
    kycTier: row.kyc_tier_cd || 'none',
    verified: (row.kyc_tier_cd || 'none') === 'verified',
    rating: Number(row.rtng_nm) || 0,
    ratingCount: Number(row.rtng_cnt) || 0,
    dayRate: row.day_rate_am != null ? Number(row.day_rate_am) : null,
    skills: row.skills || [],
    experienceYears: Math.round(yrs * 10) / 10,
    jobsHired: Number(row.jobs_hired) || 0,
    jobsApplied: Number(row.jobs_applied) || 0,
    memberSince: row.member_since || null,
  };
}

exports.myCtrl = async function (req: any, res: any) {
  const fnm = 'myCtrl';
  try {
    const code = await PassportMdl.ensureCodeMdl(req.user.id, req);
    const rows = await PassportMdl.byCodeMdl(code, req);
    return df.formatSucessRes(req, res, shape(rows[0]), cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.verifyCtrl = async function (req: any, res: any) {
  const fnm = 'verifyCtrl';
  const code = String(req.params.code || '').replace(/\D/g, '');
  if (code.length !== 6) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'Enter a valid 6-digit Nirmaan ID' });
  try {
    const rows = await PassportMdl.byCodeMdl(code, req);
    if (!rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'No worker found for this ID' });
    return df.formatSucessRes(req, res, shape(rows[0]), cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};
