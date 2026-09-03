/**
 * RbacMdl — read the RBAC catalog (archetypes, roles, capabilities, departments)
 * and write the user↔role / user↔department assignments. This is the DB-owned
 * replacement for the frontend's roles.ts constants.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.getArchetypesMdl = function (req?: any) {
  const QRY = `
    SELECT archtyp_id, archtyp_cd, archtyp_nm, dscn_tx, icn_tx, sqnce_id
    FROM ${schema}.archtyp_lst_t WHERE a_in = 1 ORDER BY sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

/** All roles joined to their archetype (optionally filtered by archetype code). */
exports.getRolesMdl = function (archtyp_cd: string | null, req?: any) {
  const QRY = `
    SELECT r.rle_id, r.rle_cd, r.rle_nm, r.emoji_tx, r.icn_tx, r.dscn_tx, r.sqnce_id,
           a.archtyp_id, a.archtyp_cd, a.archtyp_nm
    FROM ${schema}.rle_lst_t r
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id AND a.a_in = 1
    WHERE r.a_in = 1 AND ($1::text IS NULL OR a.archtyp_cd = $1)
    ORDER BY a.sqnce_id, r.sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [archtyp_cd], cntxtDtls, req);
};

exports.getCapabilitiesMdl = function (req?: any) {
  const QRY = `
    SELECT cpblty_id, cpblty_cd, cpblty_nm, dscn_tx
    FROM ${schema}.cpblty_lst_t WHERE a_in = 1 ORDER BY cpblty_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

/** archetype_cd → [capability_cd] map source. */
exports.getArchetypeCapabilityRelMdl = function (req?: any) {
  const QRY = `
    SELECT a.archtyp_cd, c.cpblty_cd
    FROM ${schema}.archtyp_cpblty_rel_t ac
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = ac.archtyp_id
    JOIN ${schema}.cpblty_lst_t  c ON c.cpblty_id = ac.cpblty_id
    WHERE ac.a_in = 1
    ORDER BY a.archtyp_cd, c.cpblty_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

exports.getDepartmentsMdl = function (req?: any) {
  const QRY = `
    SELECT d.dprtmnt_id, d.dprtmnt_cd, d.dprtmnt_nm, d.dscn_tx, d.sqnce_id,
           dg.dsgntn_id, dg.dsgntn_cd, dg.dsgntn_nm
    FROM ${schema}.dprtmnt_lst_t d
    LEFT JOIN ${schema}.dsgntn_lst_t dg ON dg.dprtmnt_id = d.dprtmnt_id AND dg.a_in = 1
    WHERE d.a_in = 1
    ORDER BY d.sqnce_id, dg.sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

// ── Assignments ──────────────────────────────────────────────────────────────
/** The archetype code a role belongs to — used to gate assigning admin roles. */
exports.getRoleArchetypeMdl = function (rle_id: number, req?: any) {
  const QRY = `
    SELECT a.archtyp_cd
    FROM ${schema}.rle_lst_t r
    JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
    WHERE r.rle_id = $1 LIMIT 1`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [rle_id], cntxtDtls, req);
};

exports.assignRoleMdl = function (usr_id: number, rle_id: number, prmry_in: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_rle_rel_t (usr_id, rle_id, prmry_in)
    VALUES ($1, $2, $3)
    ON CONFLICT (usr_id, rle_id) DO UPDATE SET a_in = 1, prmry_in = EXCLUDED.prmry_in
    RETURNING id, usr_id, rle_id, prmry_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, rle_id, prmry_in], cntxtDtls, req);
};

exports.removeRoleMdl = function (usr_id: number, rle_id: number, req?: any) {
  const QRY = `UPDATE ${schema}.usr_rle_rel_t SET a_in = 0 WHERE usr_id = $1 AND rle_id = $2 RETURNING id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, rle_id], cntxtDtls, req);
};

exports.assignDepartmentMdl = function (usr_id: number, dprtmnt_id: number, dsgntn_id: number | null, prmry_in: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.usr_dprtmnt_rel_t (usr_id, dprtmnt_id, dsgntn_id, prmry_in)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (usr_id, dprtmnt_id) DO UPDATE SET a_in = 1, dsgntn_id = EXCLUDED.dsgntn_id, prmry_in = EXCLUDED.prmry_in
    RETURNING id, usr_id, dprtmnt_id, dsgntn_id, prmry_in`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, dprtmnt_id, dsgntn_id, prmry_in], cntxtDtls, req);
};
