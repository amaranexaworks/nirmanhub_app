/**
 * AuthCtrl — HTTP layer for phone-OTP authentication.
 *   POST /auth/otp/send      { phone }                → sends OTP
 *   POST /auth/otp/verify    { phone, otp, name? }    → login/signup → { token, user }
 *   GET  /auth/me                                     → current auth context
 *   POST /auth/switch-role   { rle_id }               → change active role → new token
 *   POST /auth/logout                                 → destroy session
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const validate = require((global as any).appRoot + '/utils/validate.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const sessionConfig = require((global as any).appRoot + '/config/session.config');
const env = require((global as any).appRoot + '/config/loadEnv');

const bcrypt = require('bcryptjs');
const AuthService = require('../services/AuthenticationService');
const SocialVerify = require('../services/SocialVerify');
const UserAuthMdl = require('../models/UserAuthMdl');

function clientType(req: any): string {
  return (req.headers['x-client-type'] as string) || 'web';
}

// Role codes that must never be granted through public self-service signup.
// The DB layer (assignRolesByCodeMdl) already blocks the whole 'admin' archetype;
// this is a fast, explicit deny so a probe gets a clear 403 instead of a silent no-op.
const PRIVILEGED_ROLE_CODES = new Set(['platform_admin']);

/** POST /auth/otp/send */
exports.sendOtpCtrl = function (req: any, res: any) {
  const fnm = 'sendOtpCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [{ field: 'phone', type: 'phone', required: true, name: 'Phone' }],
    async (_e: any, v: any) => {
      if (v.status !== 1) return df.formatErrorRes(res, [{ message: v.error_msg }], cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
      try {
        const mbl = validate.normalizePhone(data.phone);
        const result = await AuthService.sendOtp(mbl, 'login', req);
        return df.formatSucessRes(req, res, result, cntxtDtls, fnm, { success_msg: 'OTP sent' });
      } catch (err: any) {
        return df.formatErrorRes(res, err, cntxtDtls, fnm, { error_status: 500, err_message: err.message || 'Failed to send OTP' });
      }
    });
};

/** POST /auth/otp/verify — verifies OTP, creates the user on first login, issues token + session. */
exports.verifyOtpCtrl = function (req: any, res: any) {
  const fnm = 'verifyOtpCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [
    { field: 'phone', type: 'phone', required: true, name: 'Phone' },
    { field: 'otp', type: 'others', required: true, name: 'OTP' },
  ], async (_e: any, v: any) => {
    if (v.status !== 1) return df.formatErrorRes(res, [{ message: v.error_msg }], cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
    const mbl = validate.normalizePhone(data.phone);
    try {
      await AuthService.verifyOtp(mbl, String(data.otp), 'login', req);

      // Find or create the user.
      let users = await UserAuthMdl.findByPhoneMdl(mbl, req);
      let usrId: number;
      if (users && users.length) {
        usrId = users[0].usr_id;
      } else {
        const created = await UserAuthMdl.createByPhoneMdl(mbl, data.name || null, req);
        usrId = created[0].usr_id;
      }

      const authContext = await AuthService.buildAuthContext(usrId, req);
      const token = AuthService.generateJWTToken(authContext);

      // Record login history (non-blocking failure).
      UserAuthMdl.recordLoginMdl({
        usr_id: usrId, mbl_nm: mbl, clnt_type_tx: clientType(req),
        ip_tx: req.ip, usr_agnt_tx: req.headers['user-agent'], succ_in: 1,
      }, req).catch(() => {});

      const respond = () => df.formatSucessRes(req, res, {
        token,
        user: exports._publicUser(authContext),
        isNewUser: !(users && users.length),
      }, cntxtDtls, fnm, { success_msg: 'Login successful' });

      if (!req.session) return respond();
      AuthService.setSession(req, authContext, token).then(respond).catch(respond);
    } catch (err: any) {
      return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 401, err_message: err.message || 'Verification failed' });
    }
  });
};

/**
 * POST /auth/social — Google / Apple / email sign-in. Finds or creates a user by email.
 *
 * Security: for google/apple, if the provider's client id is configured, an
 * `id_token` is REQUIRED and verified server-side (signature + audience + issuer),
 * and only the verified email/name are trusted. Otherwise (unconfigured / dev, or
 * plain email sign-in) the client-supplied email is used as-is.
 */
exports.socialLoginCtrl = function (req: any, res: any) {
  const fnm = 'socialLoginCtrl';
  const data = req.body.data || req.body;
  const provider = ['google', 'apple', 'email'].includes(data.provider) ? data.provider : 'email';
  const idToken = data.idToken || data.id_token;
  (async () => {
    try {
      let email = String(data.email || '').trim().toLowerCase();
      let name = data.name || null;

      // SECURITY: in production an email address alone is NOT proof of identity —
      // trusting a client-supplied email would let anyone log in as any account.
      // So production accepts ONLY a Google/Apple id_token that we verify server-side
      // (signature + audience + issuer) AND whose email the provider marked verified.
      // The plain 'email' provider and any unconfigured provider are refused in prod;
      // the convenient client-email path survives only in dev.
      const verified = (provider === 'google' || provider === 'apple') && SocialVerify.isConfigured(provider);
      if (env.isProd) {
        if (!verified) {
          return df.formatErrorRes(res, [{ message: 'Sign in with Google or Apple.' }], cntxtDtls, fnm, { error_status: 400, err_message: 'Verified social sign-in required' });
        }
      }
      if (verified) {
        if (!idToken) {
          return df.formatErrorRes(res, [{ message: 'id_token is required' }], cntxtDtls, fnm, { error_status: 400, err_message: 'id_token is required for social sign-in' });
        }
        const claims = provider === 'google'
          ? await SocialVerify.verifyGoogleIdToken(idToken)
          : await SocialVerify.verifyAppleIdToken(idToken);
        if (!claims.email) throw new Error('Verified token contains no email');
        if (!claims.emailVerified) {
          return df.formatErrorRes(res, [{ message: 'Your email is not verified with the provider.' }], cntxtDtls, fnm, { error_status: 403, err_message: 'Email not verified' });
        }
        email = String(claims.email).toLowerCase();
        name = claims.name || name;
      }

      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return df.formatErrorRes(res, [{ message: 'A valid email is required' }], cntxtDtls, fnm, { error_status: 400, err_message: 'A valid email is required' });
      }

      const users = await UserAuthMdl.findByEmailMdl(email, req);
      const isNewUser = !(users && users.length);
      let usrId: number;
      if (!isNewUser) {
        usrId = users[0].usr_id;
      } else {
        const created = await UserAuthMdl.createByEmailMdl(email, name, provider, req);
        usrId = created[0].usr_id;
      }

      const authContext = await AuthService.buildAuthContext(usrId, req);
      const token = AuthService.generateJWTToken(authContext);

      UserAuthMdl.recordLoginMdl({
        usr_id: usrId, mbl_nm: null, clnt_type_tx: clientType(req),
        ip_tx: req.ip, usr_agnt_tx: req.headers['user-agent'], succ_in: 1,
      }, req).catch(() => {});

      const respond = () => df.formatSucessRes(req, res, {
        token, user: exports._publicUser(authContext), isNewUser,
      }, cntxtDtls, fnm, { success_msg: 'Login successful' });

      if (!req.session) return respond();
      AuthService.setSession(req, authContext, token).then(respond).catch(respond);
    } catch (err: any) {
      return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message || 'Social login failed' });
    }
  })();
};

/** POST /auth/register — username + phone + password signup. */
exports.registerCtrl = function (req: any, res: any) {
  const fnm = 'registerCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [
    { field: 'name', type: 'others', required: true, name: 'Name' },
    { field: 'phone', type: 'phone', required: true, name: 'Phone' },
    { field: 'password', type: 'others', required: true, name: 'Password' },
  ], async (_e: any, v: any) => {
    if (v.status !== 1) return df.formatErrorRes(res, [{ message: v.error_msg }], cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
    if (String(data.password).length < 8) return df.formatErrorRes(res, [{ message: 'Password must be at least 8 characters' }], cntxtDtls, fnm, { error_status: 400, err_message: 'Password must be at least 8 characters' });
    // SECURITY: reject an admin-role probe UP FRONT — before creating any account or
    // paying the bcrypt cost. admin is login-only; assignRolesByCodeMdl also blocks it.
    const wanted: string[] = Array.isArray(data.roles) ? data.roles.filter((r: any) => typeof r === 'string' && r) : [];
    if (wanted.some((r) => PRIVILEGED_ROLE_CODES.has(String(r).toLowerCase()))) {
      return df.formatErrorRes(res, [{ message: 'That role cannot be self-assigned.' }], cntxtDtls, fnm, { error_status: 403, err_message: 'Role not allowed at signup' });
    }
    try {
      const mbl = validate.normalizePhone(data.phone);
      // cost 12 ≈ well above the OWASP floor; the extra latency is only paid on
      // signup / login, not per request.
      const hash = await bcrypt.hash(String(data.password), 12);

      // An account may already exist WITHOUT a password (created via OTP / seed /
      // social). In that case, "claim" it by setting the password instead of
      // rejecting the signup — otherwise the account is a dead-end (can't log in
      // because there's no password, can't sign up because it "already exists").
      const existing = await UserAuthMdl.findAuthByPhoneMdl(mbl, req);
      let usrId: number;
      let isNewUser: boolean;
      if (existing && existing.length) {
        if (existing[0].pwd_tx) {
          return df.formatErrorRes(res, [{ message: 'An account with this phone already exists. Please log in.' }], cntxtDtls, fnm, { error_status: 409, err_message: 'Account already exists' });
        }
        const claimed = await UserAuthMdl.setPasswordMdl(existing[0].usr_id, hash, data.name || null, req);
        usrId = claimed[0].usr_id;
        isNewUser = false;
      } else {
        const created = await UserAuthMdl.createWithPasswordMdl(mbl, data.name || null, hash, req);
        usrId = created[0].usr_id;
        isNewUser = true;
      }

      // Roles are chosen during signup (no separate onboarding step). Assign them and
      // make the first the primary/active role. Admin was already rejected up front;
      // assignRolesByCodeMdl also hard-filters the admin archetype in SQL as a backstop.
      if (wanted.length) {
        await UserAuthMdl.assignRolesByCodeMdl(usrId, wanted, wanted[0], req);
      }

      const authContext = await AuthService.buildAuthContext(usrId, req);
      const token = AuthService.generateJWTToken(authContext);
      UserAuthMdl.recordLoginMdl({ usr_id: usrId, mbl_nm: mbl, clnt_type_tx: clientType(req), ip_tx: req.ip, usr_agnt_tx: req.headers['user-agent'], succ_in: 1 }, req).catch(() => {});

      const respond = () => df.formatSucessRes(req, res, { token, user: exports._publicUser(authContext), isNewUser }, cntxtDtls, fnm, { success_msg: isNewUser ? 'Account created' : 'Account activated' });
      if (!req.session) return respond();
      AuthService.setSession(req, authContext, token).then(respond).catch(respond);
    } catch (err: any) {
      return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message || 'Registration failed' });
    }
  });
};

/** POST /auth/login — phone + password login. */
exports.loginCtrl = function (req: any, res: any) {
  const fnm = 'loginCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [
    { field: 'phone', type: 'phone', required: true, name: 'Phone' },
    { field: 'password', type: 'others', required: true, name: 'Password' },
  ], async (_e: any, v: any) => {
    if (v.status !== 1) return df.formatErrorRes(res, [{ message: v.error_msg }], cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
    try {
      const mbl = validate.normalizePhone(data.phone);
      const rows = await UserAuthMdl.findAuthByPhoneMdl(mbl, req);
      const u = rows && rows[0];
      // Uniform credential error — don't reveal whether the phone is registered
      // (account enumeration). "No account" and "wrong password" look identical.
      const INVALID = 'Invalid phone number or password.';
      if (!u) return df.formatErrorRes(res, [{ message: INVALID }], cntxtDtls, fnm, { error_status: 401, err_message: INVALID });
      if (!u.pwd_tx) return df.formatErrorRes(res, [{ message: 'This account uses social sign-in. Continue with Google or Apple.' }], cntxtDtls, fnm, { error_status: 400, err_message: 'No password set' });

      // Account-level brute-force lockout: after 10 wrong passwords in 15 min the
      // account is frozen briefly. Catches a targeted attack that rotates IPs (which
      // the per-IP rate limiter can't see). One successful login clears the streak.
      const recentFails = await UserAuthMdl.countRecentFailedLoginsMdl(u.usr_id, 15, req);
      if (recentFails >= 10) {
        return df.formatErrorRes(res, [{ message: 'Too many failed attempts. Please try again in a few minutes or reset your password.' }], cntxtDtls, fnm, { error_status: 429, err_message: 'Account temporarily locked' });
      }

      const ok = await bcrypt.compare(String(data.password), u.pwd_tx);
      if (!ok) {
        // AWAIT the failed-attempt record so the lockout counter is committed before
        // the next request reads it — a fire-and-forget insert races the count query
        // and lets the brute-force cap be bypassed. Same uniform message as above.
        await UserAuthMdl.recordLoginMdl({ usr_id: u.usr_id, mbl_nm: mbl, clnt_type_tx: clientType(req), ip_tx: req.ip, usr_agnt_tx: req.headers['user-agent'], succ_in: 0 }, req).catch(() => {});
        return df.formatErrorRes(res, [{ message: INVALID }], cntxtDtls, fnm, { error_status: 401, err_message: INVALID });
      }

      const authContext = await AuthService.buildAuthContext(u.usr_id, req);
      const token = AuthService.generateJWTToken(authContext);
      UserAuthMdl.recordLoginMdl({ usr_id: u.usr_id, mbl_nm: mbl, clnt_type_tx: clientType(req), ip_tx: req.ip, usr_agnt_tx: req.headers['user-agent'], succ_in: 1 }, req).catch(() => {});

      const respond = () => df.formatSucessRes(req, res, { token, user: exports._publicUser(authContext), isNewUser: false }, cntxtDtls, fnm, { success_msg: 'Login successful' });
      if (!req.session) return respond();
      AuthService.setSession(req, authContext, token).then(respond).catch(respond);
    } catch (err: any) {
      return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message || 'Login failed' });
    }
  });
};

/** GET /auth/me — full current auth context (requires authenticate middleware). */
exports.meCtrl = async function (req: any, res: any) {
  const fnm = 'meCtrl';
  try {
    const authContext = await AuthService.buildAuthContext(req.user.id, req);
    const depts = await UserAuthMdl.getUserDepartmentsMdl(req.user.id, req);
    return df.formatSucessRes(req, res, { ...exports._publicUser(authContext), departments: depts }, cntxtDtls, fnm, {});
  } catch (err: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
  }
};

/** POST /auth/switch-role — change active role; a fresh token is minted. */
exports.switchRoleCtrl = function (req: any, res: any) {
  const fnm = 'switchRoleCtrl';
  const data = req.body.data || req.body;
  validate.validate_input_params(data, [{ field: 'rle_id', type: 'int', required: true, name: 'Role' }],
    async (_e: any, v: any) => {
      if (v.status !== 1) return df.formatErrorRes(res, [{ message: v.error_msg }], cntxtDtls, fnm, { error_status: 400, err_message: v.error_msg });
      try {
        const roles = await UserAuthMdl.getUserRolesMdl(req.user.id, req);
        const target = roles.find((r: any) => r.rle_id === Number(data.rle_id));
        if (!target) return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 403, err_message: 'You do not hold that role' });

        await UserAuthMdl.setActiveRoleMdl(req.user.id, target.rle_id, req);
        const authContext = await AuthService.buildAuthContext(req.user.id, req);
        const token = AuthService.generateJWTToken(authContext);
        if (req.session) await AuthService.setSession(req, authContext, token).catch(() => {});
        // Retire the caller's PREVIOUS token so its old (now-stale) capabilities
        // can't be replayed — the client must use the freshly minted token.
        await AuthService.revokeToken(req.user, req);
        return df.formatSucessRes(req, res, { token, user: exports._publicUser(authContext) }, cntxtDtls, fnm, { success_msg: 'Role switched' });
      } catch (err: any) {
        return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: err.message });
      }
    });
};

/** POST /auth/logout */
exports.logoutCtrl = async function (req: any, res: any) {
  const fnm = 'logoutCtrl';
  // Revoke the presented token so it can't be reused after logout (bearer tokens
  // survive session destruction otherwise), THEN tear down the session + cookie.
  await AuthService.revokeToken(req.user, req);
  await AuthService.clearSession(req);
  res.clearCookie(sessionConfig.session.cookieName);
  return df.formatSucessRes(req, res, { loggedOut: true }, cntxtDtls, fnm, { success_msg: 'Logged out' });
};

/** Shape a user for the client (never leaks pwd_tx etc). */
exports._publicUser = function (ctx: any) {
  const u = ctx.user;
  return {
    id: u.usr_id,
    phone: u.mbl_nm,
    name: ctx.name,
    email: u.eml_tx,
    avatarUrl: u.avtr_url_tx,
    kycTier: u.kyc_tier_cd,
    pincode: u.pncd_tx,
    city: u.cty_nm,
    location: u.lat != null ? { lat: Number(u.lat), lng: Number(u.lng) } : undefined,
    headline: u.hdln_tx,
    bio: u.bio_tx,
    dayRate: u.day_rate_am != null ? Number(u.day_rate_am) : undefined,
    serviceRadiusKm: u.srvc_rds_km,
    rating: u.rtng_nm != null ? Number(u.rtng_nm) : undefined,
    ratingCount: u.rtng_cnt,
    language: u.lng_cd_tx,
    roles: ctx.roles,
    activeRole: ctx.activeRole,
    archetype: ctx.archetype,
    capabilities: ctx.capabilities,
  };
};
