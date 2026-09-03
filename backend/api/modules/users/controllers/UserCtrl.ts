/**
 * UserCtrl — profile endpoints.
 *   GET /users/me | GET /users/:id       → profile (+ skills)
 *   PUT /users/me                         → patch own profile
 *   POST /users/me/skills   { skill }     → add a skill
 *   PUT /users/me/password                → change/reset own password
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const bcrypt = require('bcryptjs');
const UserMdl = require('../models/UserMdl');

async function loadProfile(usr_id: number, req: any) {
  const [rows, skills] = await Promise.all([UserMdl.getProfileMdl(usr_id, req), UserMdl.getSkillsMdl(usr_id, req)]);
  if (!rows || !rows.length) return null;
  return { ...rows[0], skills: skills.map((s: any) => s.skll_tx) };
}

exports.getMeCtrl = async function (req: any, res: any) {
  const fnm = 'getMeCtrl';
  try {
    const profile = await loadProfile(req.user.id, req);
    if (!profile) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'User not found' });
    return df.formatSucessRes(req, res, profile, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.getByIdCtrl = async function (req: any, res: any) {
  const fnm = 'getByIdCtrl';
  try {
    const targetId = Number(req.params.id);
    const profile = await loadProfile(targetId, req);
    if (!profile) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'User not found' });
    // Someone else's public profile must not leak contact PII. Only the owner
    // sees their own phone/email through this endpoint.
    if (targetId !== req.user.id) {
      delete profile.mbl_nm;
      delete profile.eml_tx;
    }
    return df.formatSucessRes(req, res, profile, cntxtDtls, fnm, {});
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.updateMeCtrl = async function (req: any, res: any) {
  const fnm = 'updateMeCtrl';
  const patch = req.body.data || req.body;
  try {
    await UserMdl.updateProfileMdl(req.user.id, patch, req);
    const profile = await loadProfile(req.user.id, req);
    return df.formatSucessRes(req, res, profile, cntxtDtls, fnm, { success_msg: 'Profile updated' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

exports.addSkillCtrl = async function (req: any, res: any) {
  const fnm = 'addSkillCtrl';
  const data = req.body.data || req.body;
  if (!data.skill) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'skill is required' });
  try {
    await UserMdl.addSkillMdl(req.user.id, String(data.skill), req);
    const skills = await UserMdl.getSkillsMdl(req.user.id, req);
    return df.formatSucessRes(req, res, { skills: skills.map((s: any) => s.skll_tx) }, cntxtDtls, fnm, { success_msg: 'Skill added' });
  } catch (e: any) { return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message }); }
};

/**
 * PUT /users/me/password — change/reset the logged-in user's password.
 * If the account already HAS a password, the current one must be provided and
 * verified. If it has none (e.g. social-only account), it's set directly.
 */
exports.changePasswordCtrl = async function (req: any, res: any) {
  const fnm = 'changePasswordCtrl';
  const data = req.body.data || req.body;
  const currentPassword = data.currentPassword || data.current || '';
  const newPassword = String(data.newPassword || data.password || '');

  if (newPassword.length < 6) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 400, err_message: 'New password must be at least 6 characters' });
  }
  try {
    const rows = await UserMdl.getPasswordHashMdl(req.user.id, req);
    if (!rows || !rows.length) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 404, err_message: 'User not found' });
    const hash = rows[0].pwd_tx;

    if (hash) {
      // Existing password → the current one must match.
      const ok = await bcrypt.compare(String(currentPassword), hash);
      if (!ok) return df.formatErrorRes(res, [{ message: 'Current password is incorrect' }], cntxtDtls, fnm, { error_status: 401, err_message: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await UserMdl.updatePasswordMdl(req.user.id, newHash, req);
    return df.formatSucessRes(req, res, { changed: true }, cntxtDtls, fnm, { success_msg: 'Password updated' });
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
