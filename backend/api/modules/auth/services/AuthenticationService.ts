/**
 * AuthenticationService — the auth core. Mirrors the WMS AuthenticationService:
 *   • OTP generate/verify (phone login)
 *   • RS256 JWT sign/verify (keys in /security)
 *   • express-session lifecycle (session is the authority; JWT regenerates from it)
 *   • authenticate() middleware — validates token AND (when present) the DB session
 *   • authorize(capability) middleware — capability-based access control
 *   • buildAuthContext() — the single source for the JWT payload and /me
 *
 * Auth context shape (also the JWT payload):
 *   { userId, name, phone, kycTier, activeRole:{rle_id,rle_cd,archtyp_cd,...},
 *     roles:[...], archetype, capabilities:[...] }
 */
export {};
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require((global as any).appRoot + '/config/loadEnv');
const sessionConfig = require((global as any).appRoot + '/config/session.config');
const UserAuthMdl = require('../models/UserAuthMdl');
const OtpMdl = require('../models/OtpMdl');
const RevokedTokenMdl = require('../models/RevokedTokenMdl');
const { cacheGet, cacheSet, cacheDel } = require((global as any).appRoot + '/utils/ttlCache.utils');

const MAX_OTP_ATTEMPTS = 5;

// ── Auth hot-path caches ─────────────────────────────────────────────────────
// Every authenticated request checked the token denylist AND the account-state
// guard against Postgres — 2 queries × every request × every user. That is the
// first thing to saturate the connection pool at scale. Cache both for a few
// seconds (self-correcting), and invalidate on logout/revoke on this instance.
const REVOKED_TTL_MS = 3_600_000; // a revoked token stays revoked until it expires — cache the positive long
const NOT_REVOKED_TTL_MS = 15_000; // negative result: short, so a fresh revoke elsewhere is honoured within 15s
const GUARD_TTL_MS = 15_000;       // account active / token-invalidation stamp

async function isRevokedCached(jti: string): Promise<boolean> {
  if (!jti) return false;
  const key = `revoked:${jti}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const revoked = await RevokedTokenMdl.isRevokedMdl(jti);
  cacheSet(key, revoked, revoked ? REVOKED_TTL_MS : NOT_REVOKED_TTL_MS);
  return revoked;
}

async function getAuthGuardCached(userId: number): Promise<any> {
  const key = `guard:${userId}`;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  const g = await UserAuthMdl.getAuthGuardMdl(userId);
  const row = (g && g[0]) || null;
  cacheSet(key, row, GUARD_TTL_MS);
  return row;
}

/** Invalidate this instance's caches for a token/user the moment it is revoked. */
exports.invalidateAuthCache = function (jti?: string, userId?: number) {
  if (jti) cacheSet(`revoked:${jti}`, true, REVOKED_TTL_MS);
  if (userId) cacheDel(`guard:${userId}`);
};

// ── Keys ────────────────────────────────────────────────────────────────────
// Read each PEM from disk ONCE and cache it. verify/generate run on the hot path
// (every authenticated request), so a `readFileSync` per call would put a blocking
// syscall on the event loop under load. Keys don't change while the process runs, so
// caching is safe — restart the process to rotate keys.
const _keyCache: Record<string, string> = {};
function readKey(name: string): string {
  if (_keyCache[name]) return _keyCache[name];
  const p = path.join((global as any).appRoot, 'security', name);
  if (!fs.existsSync(p)) {
    throw new Error(`Missing ${name} in /security. Run \`npm run keys\` first.`);
  }
  return (_keyCache[name] = fs.readFileSync(p, 'utf8'));
}

// ── Auth context ─────────────────────────────────────────────────────────────
exports.buildAuthContext = async function (usr_id: number, req?: any) {
  const users = await UserAuthMdl.findByIdMdl(usr_id, req);
  if (!users || !users.length) throw new Error('User not found');
  const user = users[0];

  const roles = await UserAuthMdl.getUserRolesMdl(usr_id, req);

  // Active role = user.actv_rle_id, else the primary role, else the first.
  let active = roles.find((r: any) => r.rle_id === user.actv_rle_id);
  if (!active) active = roles.find((r: any) => r.prmry_in === 1) || roles[0] || null;

  let capabilities: string[] = [];
  if (active) {
    const caps = await UserAuthMdl.getArchetypeCapabilitiesMdl(active.archtyp_id, req);
    capabilities = caps.map((c: any) => c.cpblty_cd);
  }
  // Merge any per-user capability grants (admin gave this user extra features,
  // e.g. Workforce management, on top of what their role's archetype grants).
  const granted = await UserAuthMdl.getUserGrantedCapabilitiesMdl(usr_id, req);
  if (granted && granted.length) {
    capabilities = Array.from(new Set([...capabilities, ...granted.map((g: any) => g.cpblty_cd)]));
  }

  return {
    userId: user.usr_id,
    name: user.dsply_nm || user.fst_nm || user.mbl_nm,
    phone: user.mbl_nm,
    kycTier: user.kyc_tier_cd,
    activeRole: active
      ? { rle_id: active.rle_id, rle_cd: active.rle_cd, rle_nm: active.rle_nm,
          archtyp_id: active.archtyp_id, archtyp_cd: active.archtyp_cd }
      : null,
    archetype: active ? active.archtyp_cd : null,
    roles: roles.map((r: any) => ({
      rle_id: r.rle_id, rle_cd: r.rle_cd, rle_nm: r.rle_nm, emoji_tx: r.emoji_tx,
      archtyp_cd: r.archtyp_cd, prmry_in: r.prmry_in,
    })),
    capabilities,
    user, // full row for /me
  };
};

// ── OTP ──────────────────────────────────────────────────────────────────────
function generateOtp(): string {
  if (env.otp.devMode) return env.otp.devFixed;
  const max = Math.pow(10, env.otp.length);
  return String(Math.floor(Math.random() * max)).padStart(env.otp.length, '0');
}

exports.sendOtp = async function (mbl_nm: string, purpose_cd = 'login', req?: any) {
  const otp = generateOtp();
  const rows = await OtpMdl.createOtpMdl(mbl_nm, otp, purpose_cd, env.otp.ttlSeconds, req);
  // TODO(prod): dispatch `otp` via SMS provider here.
  // Never print or return the code in production — that would be a login backdoor.
  if (!env.isProd) console.log(`[OTP] ${mbl_nm} (${purpose_cd}) → ${otp} (dev)`);
  return {
    sent: true,
    expiresAt: rows[0]?.exp_ts,
    // Only surfaced in dev so the client/tester can log in without an SMS gateway.
    devOtp: !env.isProd && env.otp.devMode ? otp : undefined,
  };
};

exports.verifyOtp = async function (mbl_nm: string, otp_cd: string, purpose_cd = 'login', req?: any) {
  const rows = await OtpMdl.getActiveOtpMdl(mbl_nm, purpose_cd, req);
  if (!rows || !rows.length) throw new Error('OTP expired or not requested. Please request a new code.');
  const rec = rows[0];

  if (rec.atmpt_cnt >= MAX_OTP_ATTEMPTS) throw new Error('Too many attempts. Please request a new code.');

  if (String(rec.otp_cd) !== String(otp_cd)) {
    await OtpMdl.incrementAttemptMdl(rec.otp_id, req);
    throw new Error('Incorrect OTP.');
  }
  await OtpMdl.markVerifiedMdl(rec.otp_id, req);
  return true;
};

// ── JWT ──────────────────────────────────────────────────────────────────────
exports.generateJWTToken = function (authContext: any): string {
  const privateKey = readKey('private_key.pem');
  const payload = {
    id: authContext.userId,
    name: authContext.name,
    phone: authContext.phone,
    kycTier: authContext.kycTier,
    activeRole: authContext.activeRole,
    archetype: authContext.archetype,
    capabilities: authContext.capabilities,
  };
  // Every token gets a UNIQUE jti so it can be individually revoked (logout /
  // role-switch) via the denylist. The shared jwtOptions.jwtid ('1') is overridden.
  return jwt.sign(
    payload,
    { key: privateKey, passphrase: sessionConfig.token.privateKeyPassphrase },
    { ...sessionConfig.jwtOptions, jwtid: crypto.randomUUID() }
  );
};

/** Revoke a token by its decoded payload (needs jti + exp). Safe if already gone. */
exports.revokeToken = async function (decoded: any, req?: any) {
  if (!decoded || !decoded.jti) return;
  try {
    await RevokedTokenMdl.revokeMdl(decoded.jti, decoded.id || null, decoded.exp || 0, req);
    // Reflect the revocation in this instance's hot-path cache immediately so the
    // just-logged-out token is rejected on the very next request (not up to 15s later).
    exports.invalidateAuthCache(decoded.jti, decoded.id);
  } catch (e: any) {
    console.error('[revokeToken] failed:', e.message);
  }
};

exports.verifyJWTToken = function (token: string): any {
  const publicKey = readKey('public_key.pem');
  return jwt.verify(token, publicKey, {
    algorithms: [sessionConfig.token.algorithm],
    audience: sessionConfig.token.audience,
  });
};

exports.refreshJWTToken = function (payload: any): string {
  const privateKey = readKey('private_key.pem');
  const { iat, exp, aud, sub, jti, ...rest } = payload;
  return jwt.sign(
    rest,
    { key: privateKey, passphrase: sessionConfig.token.privateKeyPassphrase },
    sessionConfig.jwtOptions
  );
};

// ── Session ──────────────────────────────────────────────────────────────────
exports.setSession = function (req: any, authContext: any, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const write = () => {
      try {
        req.session.userId = authContext.userId;
        req.session.jwtToken = token;
        req.session.lastValidJwt = null;
        if (req.session.cookie) req.session.cookie.path = '/';
        req.session.save((err: any) => (err ? reject(err) : resolve()));
      } catch (e) {
        reject(e);
      }
    };
    // Regenerate the session id on every login / role change to defeat session
    // fixation (an attacker who planted a known sid can't ride it post-auth).
    if (typeof req.session.regenerate === 'function') {
      req.session.regenerate((err: any) => (err ? reject(err) : write()));
    } else {
      write();
    }
  });
};

exports.clearSession = function (req: any): Promise<void> {
  return new Promise((resolve) => {
    if (!req.session) return resolve();
    req.session.destroy(() => resolve());
  });
};

// ── Middleware: authenticate ────────────────────────────────────────────────
exports.authenticate = async function (req: any, res: any, next: any) {
  try {
    const token =
      req.headers['x-access-token'] ||
      (req.headers.authorization ? String(req.headers.authorization).replace(/^Bearer\s+/i, '') : null);

    if (!token) {
      return res.status(401).json({ status: 401, success: false, message: 'No token provided', code: 'TOKEN_NOT_PROVIDED' });
    }

    let decoded: any;
    try {
      decoded = exports.verifyJWTToken(token);
    } catch (e: any) {
      const expired = e.message && e.message.toLowerCase().includes('expired');
      return res.status(401).json({
        status: 401, success: false,
        message: expired ? 'Token expired. Please login again.' : 'Invalid token',
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }

    // Denylist check — a token revoked at logout / role-switch is rejected here
    // regardless of client type (works for bearer-only mobile with no cookie).
    try {
      if (decoded.jti && await isRevokedCached(decoded.jti)) {
        return res.status(401).json({ status: 401, success: false, message: 'Session ended. Please log in again.', code: 'TOKEN_REVOKED' });
      }
    } catch (e: any) {
      // Fail closed: if we can't confirm the token is still valid, don't trust it.
      console.error('[authenticate] denylist check failed:', e.message);
      return res.status(401).json({ status: 401, success: false, message: 'Authentication temporarily unavailable', code: 'AUTH_UNAVAILABLE' });
    }

    // When a DB session store is present, the session is authoritative: the token
    // must match the one saved at login (prevents use of a stolen/rotated token).
    // Bearer-only clients (mobile, and the web app which sends the JWT in a header)
    // do not carry the session cookie, so express-session hands them a brand-new
    // empty sessionID — a store.get() for it is always a wasted DB round-trip. Only
    // consult the store when the request actually presented our session cookie.
    const store = (global as any).sessionStore;
    const hasSessionCookie = !!req.headers.cookie && req.headers.cookie.includes(sessionConfig.session.cookieName);
    if (store && req.sessionID && hasSessionCookie) {
      const stored: any = await new Promise((resolve) =>
        store.get(req.sessionID, (_e: any, s: any) => resolve(s))
      );
      if (stored && stored.userId) {
        if (stored.jwtToken && stored.jwtToken !== token && stored.lastValidJwt !== token) {
          return res.status(401).json({ status: 401, success: false, message: 'Session/token mismatch', code: 'SESSION_MISMATCH' });
        }
      }
    }

    // Account-state guard: a token stays valid up to 4h, so an admin deactivating a
    // user or revoking their access wouldn't take effect without this. One PK lookup:
    //   • account deactivated (a_in = 0)                → reject
    //   • token minted before an invalidation stamp     → reject (see migration 034)
    // Fails closed if the lookup errors, consistent with the denylist check above.
    try {
      const row = await getAuthGuardCached(decoded.id);
      if (!row || row.a_in !== 1) {
        return res.status(401).json({ status: 401, success: false, message: 'Account is not active. Please contact support.', code: 'ACCOUNT_INACTIVE' });
      }
      if (row.tkn_invld_bfr_ts && decoded.iat && (decoded.iat * 1000) < new Date(row.tkn_invld_bfr_ts).getTime()) {
        return res.status(401).json({ status: 401, success: false, message: 'Session ended. Please log in again.', code: 'TOKEN_REVOKED' });
      }
    } catch (e: any) {
      console.error('[authenticate] account-state check failed:', e.message);
      return res.status(401).json({ status: 401, success: false, message: 'Authentication temporarily unavailable', code: 'AUTH_UNAVAILABLE' });
    }

    req.user = { id: decoded.id, ...decoded };
    return next();
  } catch (e: any) {
    return res.status(401).json({ status: 401, success: false, message: 'Authentication failed' });
  }
};

// ── Middleware: authorize (capability-based) ────────────────────────────────
exports.authorize = function (capability: string) {
  return function (req: any, res: any, next: any) {
    if (!req.user) return res.status(401).json({ status: 401, success: false, message: 'Authentication required' });
    const caps: string[] = req.user.capabilities || [];
    if (!caps.includes(capability)) {
      return res.status(403).json({
        status: 403, success: false,
        message: `Your current role does not permit this action (requires "${capability}").`,
        code: 'FORBIDDEN',
      });
    }
    return next();
  };
};
