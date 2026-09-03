/**
 * UserAuthMdl — user identity data access for authentication.
 * Every function builds a parameterized query and delegates to dbutil.execQuery.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Find a user by phone number. */
exports.findByPhoneMdl = function (mbl_nm: string, req?: any) {
  const QRY = `
    SELECT usr_id, mbl_nm, usr_nm, dsply_nm, fst_nm, lst_nm, eml_tx, avtr_url_tx,
           kyc_tier_cd, pncd_tx, cty_nm, lat, lng, hdln_tx, bio_tx, day_rate_am,
           srvc_rds_km, rtng_nm, rtng_cnt, lng_cd_tx, actv_rle_id, a_in
    FROM ${schema}.usr_lst_t
    WHERE mbl_nm = $1 AND a_in = 1
    LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm], cntxtDtls, req);
};

/** Find a user by id. */
exports.findByIdMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT usr_id, mbl_nm, usr_nm, dsply_nm, fst_nm, lst_nm, eml_tx, avtr_url_tx,
           kyc_tier_cd, pncd_tx, cty_nm, lat, lng, hdln_tx, bio_tx, day_rate_am,
           srvc_rds_km, rtng_nm, rtng_cnt, lng_cd_tx, actv_rle_id, a_in
    FROM ${schema}.usr_lst_t
    WHERE usr_id = $1 AND a_in = 1
    LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Create a user with just a phone number (OTP-first signup). */
exports.createByPhoneMdl = function (mbl_nm: string, dsply_nm: string | null, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_lst_t (mbl_nm, dsply_nm)
    VALUES ($1, $2)
    RETURNING usr_id, mbl_nm, dsply_nm, kyc_tier_cd, actv_rle_id, a_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm, dsply_nm], cntxtDtls, req);
};

/** Find a user by email (case-insensitive) — for Google/Apple/email sign-in. */
exports.findByEmailMdl = function (eml_tx: string, req?: any) {
  const QRY = `
    SELECT usr_id, mbl_nm, usr_nm, dsply_nm, fst_nm, lst_nm, eml_tx, avtr_url_tx,
           kyc_tier_cd, pncd_tx, cty_nm, lat, lng, hdln_tx, bio_tx, day_rate_am,
           srvc_rds_km, rtng_nm, rtng_cnt, lng_cd_tx, actv_rle_id, a_in
    FROM ${schema}.usr_lst_t
    WHERE lower(eml_tx) = lower($1) AND a_in = 1
    LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [eml_tx], cntxtDtls, req);
};

/** Create a user from an email identity (social/email signup — no phone yet). */
exports.createByEmailMdl = function (eml_tx: string, dsply_nm: string | null, auth_prvdr_cd: string, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_lst_t (eml_tx, dsply_nm, auth_prvdr_cd)
    VALUES ($1, $2, $3)
    RETURNING usr_id, eml_tx, dsply_nm, kyc_tier_cd, actv_rle_id, a_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [eml_tx, dsply_nm, auth_prvdr_cd || 'email'], cntxtDtls, req);
};

/** Fetch the stored password hash for a phone (login). Selects pwd_tx explicitly. */
exports.findAuthByPhoneMdl = function (mbl_nm: string, req?: any) {
  const QRY = `
    SELECT usr_id, mbl_nm, dsply_nm, pwd_tx, a_in
    FROM ${schema}.usr_lst_t
    WHERE mbl_nm = $1 AND a_in = 1
    LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm], cntxtDtls, req);
};

/** Create a user with phone + password (username stored as display name). */
exports.createWithPasswordMdl = function (mbl_nm: string, dsply_nm: string | null, pwd_tx: string, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_lst_t (mbl_nm, dsply_nm, pwd_tx, auth_prvdr_cd)
    VALUES ($1, $2, $3, 'password')
    RETURNING usr_id, mbl_nm, dsply_nm, kyc_tier_cd, actv_rle_id, a_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [mbl_nm, dsply_nm, pwd_tx], cntxtDtls, req);
};

/**
 * Set a password on an EXISTING account (used when someone "claims" a passwordless
 * account — e.g. one created via OTP/seed — by signing up). Also fills the name if
 * the account had none.
 */
exports.setPasswordMdl = function (usr_id: number, pwd_tx: string, dsply_nm: string | null, req?: any) {
  const QRY = `
    UPDATE ${schema}.usr_lst_t
    SET pwd_tx = $2,
        dsply_nm = COALESCE(NULLIF(dsply_nm, ''), $3, dsply_nm),
        auth_prvdr_cd = 'password',
        u_ts = now()
    WHERE usr_id = $1
    RETURNING usr_id, mbl_nm, dsply_nm, kyc_tier_cd, actv_rle_id, a_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, pwd_tx, dsply_nm], cntxtDtls, req);
};

/**
 * Assign a set of roles (by role code) to a user during signup, mark the first as
 * the primary/active role, and set the user's active role. Idempotent.
 * @param codes        all selected role codes
 * @param primaryCode  the code to make primary + active (usually codes[0])
 */
exports.assignRolesByCodeMdl = function (usr_id: number, codes: string[], primaryCode: string, req?: any) {
  // SECURITY: this is the SELF-SERVICE signup path. A user must NEVER be able to
  // grant themselves a privileged (admin-archetype) role by putting its code in the
  // request body. The `allowed` CTE hard-filters out the entire 'admin' archetype,
  // so both the role assignment AND the resulting active role can only ever be a
  // customer-facing role. Admin roles are granted exclusively by an existing admin
  // through the admin console (RbacMdl.assignRoleMdl / AdminCtrl), never here.
  const QRY = `
    WITH allowed AS (
      SELECT r.rle_id, r.rle_cd
      FROM ${schema}.rle_lst_t r
      JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
      WHERE r.rle_cd = ANY($2::text[]) AND r.a_in = 1 AND a.archtyp_cd <> 'admin'
    ),
    ins AS (
      INSERT INTO ${schema}.usr_rle_rel_t (usr_id, rle_id, prmry_in)
      SELECT $1, al.rle_id, (al.rle_cd = $3)::int
      FROM allowed al
      ON CONFLICT (usr_id, rle_id) DO UPDATE SET a_in = 1, prmry_in = EXCLUDED.prmry_in
      RETURNING rle_id
    )
    UPDATE ${schema}.usr_lst_t u
    SET actv_rle_id = COALESCE(
          (SELECT rle_id FROM allowed WHERE rle_cd = $3),
          (SELECT rle_id FROM allowed LIMIT 1),
          u.actv_rle_id),
        u_ts = now()
    WHERE u.usr_id = $1 AND (SELECT count(*) FROM ins) >= 0
    RETURNING u.actv_rle_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, codes, primaryCode], cntxtDtls, req);
};

/**
 * Resolve the full auth context for a user: their roles (with archetype), the
 * active role, and the capabilities their active archetype grants. This is the
 * single source that both the JWT payload and the /me response are built from.
 */
exports.getUserRolesMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rle_id, r.rle_cd, r.rle_nm, r.emoji_tx, r.icn_tx,
           a.archtyp_id, a.archtyp_cd, a.archtyp_nm,
           ur.prmry_in
    FROM ${schema}.usr_rle_rel_t ur
    JOIN ${schema}.rle_lst_t r     ON r.rle_id = ur.rle_id AND r.a_in = 1
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id AND a.a_in = 1
    WHERE ur.usr_id = $1 AND ur.a_in = 1
    ORDER BY ur.prmry_in DESC, r.sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Capabilities granted to a given archetype. */
exports.getArchetypeCapabilitiesMdl = function (archtyp_id: number, req?: any) {
  const QRY = `
    SELECT c.cpblty_cd
    FROM ${schema}.archtyp_cpblty_rel_t ac
    JOIN ${schema}.cpblty_lst_t c ON c.cpblty_id = ac.cpblty_id AND c.a_in = 1
    WHERE ac.archtyp_id = $1 AND ac.a_in = 1
    ORDER BY c.cpblty_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [archtyp_id], cntxtDtls, req);
};

/** Extra capabilities granted directly to a user (admin per-user feature grants). */
exports.getUserGrantedCapabilitiesMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT c.cpblty_cd
    FROM ${schema}.usr_cpblty_rel_t uc
    JOIN ${schema}.cpblty_lst_t c ON c.cpblty_id = uc.cpblty_id AND c.a_in = 1
    WHERE uc.usr_id = $1 AND uc.a_in = 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Departments the user belongs to (internal staff). */
exports.getUserDepartmentsMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT d.dprtmnt_id, d.dprtmnt_cd, d.dprtmnt_nm,
           dg.dsgntn_id, dg.dsgntn_nm, ud.prmry_in
    FROM ${schema}.usr_dprtmnt_rel_t ud
    JOIN ${schema}.dprtmnt_lst_t d  ON d.dprtmnt_id = ud.dprtmnt_id AND d.a_in = 1
    LEFT JOIN ${schema}.dsgntn_lst_t dg ON dg.dsgntn_id = ud.dsgntn_id
    WHERE ud.usr_id = $1 AND ud.a_in = 1
    ORDER BY ud.prmry_in DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Change the user's active role (validated to be one they hold by the service). */
exports.setActiveRoleMdl = function (usr_id: number, rle_id: number, req?: any) {
  const QRY = `
    UPDATE ${schema}.usr_lst_t
    SET actv_rle_id = $2, u_ts = now()
    WHERE usr_id = $1
    RETURNING usr_id, actv_rle_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, rle_id], cntxtDtls, req);
};

/**
 * Per-request auth guard: the user's active flag + token-invalidation stamp. Used by
 * authenticate() to reject tokens for a deactivated account or tokens minted before
 * an admin revoked the user's access (see migration 034). One PK lookup.
 */
let _invldColOk = true; // flips false if migration 034 hasn't been applied yet
exports.getAuthGuardMdl = async function (usr_id: number, req?: any) {
  const cols = _invldColOk ? 'a_in, tkn_invld_bfr_ts' : 'a_in, NULL::timestamptz AS tkn_invld_bfr_ts';
  try {
    return await dbutil.execQuery(sqldb.AppPool, `SELECT ${cols} FROM ${schema}.usr_lst_t WHERE usr_id = $1 LIMIT 1`, [usr_id], cntxtDtls, req);
  } catch (e: any) {
    // If the column doesn't exist yet (migration 034 not run), don't take auth down —
    // fall back to the a_in check only and disable token-invalidation until the
    // migration is applied and the process restarts.
    if (_invldColOk) {
      _invldColOk = false;
      console.warn('[auth] tkn_invld_bfr_ts missing — run migration 034; token-invalidation is disabled until then.');
      return await dbutil.execQuery(sqldb.AppPool, `SELECT a_in, NULL::timestamptz AS tkn_invld_bfr_ts FROM ${schema}.usr_lst_t WHERE usr_id = $1 LIMIT 1`, [usr_id], cntxtDtls, req);
    }
    throw e;
  }
};

/**
 * Invalidate ALL of a user's currently-issued tokens by stamping "reject anything
 * older than now". Called when an admin deactivates the user or changes their roles /
 * capabilities, so the change is enforced on the very next request (not up to 4h later).
 */
exports.invalidateUserTokensMdl = function (usr_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.usr_lst_t SET tkn_invld_bfr_ts = now(), u_ts = now() WHERE usr_id = $1 RETURNING usr_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Record a login attempt in history. */
exports.recordLoginMdl = function (data: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_lgn_hstry_dtl_t
      (usr_id, mbl_nm, clnt_type_tx, ip_tx, usr_agnt_tx, succ_in)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING lgn_id`;
  return dbutil.execQuery(
    sqldb.AppPool, QRY,
    [data.usr_id || null, data.mbl_nm || null, data.clnt_type_tx || 'web',
     data.ip_tx || null, data.usr_agnt_tx || null, data.succ_in != null ? data.succ_in : 1],
    cntxtDtls, req
  );
};

/**
 * Count failed login attempts for a user within the last `windowMinutes`. Used to
 * lock an account after too many wrong passwords — this stops a targeted attack
 * that the per-IP rate limiter can't (an attacker rotating IPs against one phone).
 * A single successful login since then clears the streak.
 */
exports.countRecentFailedLoginsMdl = async function (usr_id: number, windowMinutes: number, req?: any) {
  const QRY = `
    SELECT count(*)::int AS n
    FROM ${schema}.usr_lgn_hstry_dtl_t
    WHERE usr_id = $1
      AND i_ts > now() - ($2 || ' minutes')::interval
      AND i_ts > COALESCE(
        (SELECT max(i_ts) FROM ${schema}.usr_lgn_hstry_dtl_t
         WHERE usr_id = $1 AND succ_in = 1), 'epoch'::timestamptz)
      AND succ_in = 0`;
  const rows = await dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, String(windowMinutes)], cntxtDtls, req);
  return rows && rows.length ? rows[0].n : 0;
};
