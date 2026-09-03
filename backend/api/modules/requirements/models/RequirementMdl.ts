/**
 * RequirementMdl — the marketplace "post a requirement → get responses" loop.
 * This module is the reference example every other domain module copies.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.getServiceTypesMdl = function (req?: any) {
  const QRY = `
    SELECT srvc_type_id, srvc_type_cd, srvc_type_nm, icn_tx, price_hint_tx, sqnce_id
    FROM ${schema}.srvc_type_lst_t WHERE a_in = 1 ORDER BY sqnce_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [], cntxtDtls, req);
};

/** Public feed of open requirements (most recent first). */
exports.listMdl = function (limit: number, offset: number, req?: any) {
  const QRY = `
    SELECT r.rqrmnt_id, r.ttl_tx, r.lctn_tx, r.bdgt_tx, r.area_sqft, r.floors, r.dscn_tx,
           r.postd_ts, st.srvc_type_cd, st.srvc_type_nm,
           u.usr_id AS postd_by_usr_id, u.dsply_nm AS postd_by_nm,
           (SELECT count(*) FROM ${schema}.rqrmnt_rspns_t rr WHERE rr.rqrmnt_id = r.rqrmnt_id AND rr.a_in = 1) AS responses
    FROM ${schema}.rqrmnt_lst_t r
    LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = r.srvc_type_id
    JOIN ${schema}.usr_lst_t u ON u.usr_id = r.postd_by_usr_id
    WHERE r.a_in = 1
    ORDER BY r.postd_ts DESC
    LIMIT $1 OFFSET $2`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [limit, offset], cntxtDtls, req);
};

/** Requirements posted by a given user. */
exports.myPostsMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rqrmnt_id, r.ttl_tx, r.lctn_tx, r.bdgt_tx, r.postd_ts,
           st.srvc_type_cd, st.srvc_type_nm,
           (SELECT count(*) FROM ${schema}.rqrmnt_rspns_t rr WHERE rr.rqrmnt_id = r.rqrmnt_id AND rr.a_in = 1) AS responses
    FROM ${schema}.rqrmnt_lst_t r
    LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = r.srvc_type_id
    WHERE r.a_in = 1 AND r.postd_by_usr_id = $1
    ORDER BY r.postd_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

exports.createMdl = function (usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.rqrmnt_lst_t
      (srvc_type_id, ttl_tx, lctn_tx, bdgt_tx, area_sqft, floors, dscn_tx, postd_by_usr_id)
    VALUES (
      (SELECT srvc_type_id FROM ${schema}.srvc_type_lst_t WHERE srvc_type_cd = $1),
      $2, $3, $4, $5, $6, $7, $8)
    RETURNING rqrmnt_id, ttl_tx, postd_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [d.serviceType || 'other', d.title, d.location || null, d.budget || null,
     d.areaSqft || null, d.floors || null, d.description || null, usr_id], cntxtDtls, req);
};

// SECURITY: responses carry each bidder's identity and private quote (price/message).
// Only the user who POSTED the requirement may read them — the EXISTS clause ties the
// requirement to the caller so a non-owner can't enumerate everyone's bids.
exports.listResponsesMdl = function (rqrmnt_id: number, usr_id: number, req?: any) {
  const QRY = `
    SELECT rr.rspns_id, rr.price_tx, rr.msg_tx, rr.accptd_in, rr.rspndd_ts,
           u.usr_id AS rspndr_usr_id, u.dsply_nm AS rspndr_nm, u.rtng_nm, u.rtng_cnt,
           r.rle_nm AS rspndr_rle
    FROM ${schema}.rqrmnt_rspns_t rr
    JOIN ${schema}.usr_lst_t u ON u.usr_id = rr.rspndr_usr_id
    LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = u.actv_rle_id
    WHERE rr.rqrmnt_id = $1 AND rr.a_in = 1
      AND EXISTS (SELECT 1 FROM ${schema}.rqrmnt_lst_t rq WHERE rq.rqrmnt_id = $1 AND rq.postd_by_usr_id = $2)
    ORDER BY rr.rspndd_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [rqrmnt_id, usr_id], cntxtDtls, req);
};

exports.respondMdl = function (rqrmnt_id: number, usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.rqrmnt_rspns_t (rqrmnt_id, rspndr_usr_id, price_tx, msg_tx)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (rqrmnt_id, rspndr_usr_id)
      DO UPDATE SET price_tx = EXCLUDED.price_tx, msg_tx = EXCLUDED.msg_tx, a_in = 1, rspndd_ts = now()
    RETURNING rspns_id, rqrmnt_id, price_tx, rspndd_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [rqrmnt_id, usr_id, d.price || null, d.message || null], cntxtDtls, req);
};

// ── Leads: "My Proposals" and "Invited" (app Leads screen) ──

/** Requirements this user has submitted a response/proposal to, with their own quote. */
exports.myResponsesMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rqrmnt_id, r.ttl_tx, r.lctn_tx, r.bdgt_tx, r.postd_ts,
           st.srvc_type_cd, st.srvc_type_nm, u.dsply_nm AS postd_by_nm,
           rr.price_tx AS my_price_tx, rr.msg_tx AS my_msg_tx, rr.accptd_in, rr.rspndd_ts,
           (SELECT count(*) FROM ${schema}.rqrmnt_rspns_t r2 WHERE r2.rqrmnt_id = r.rqrmnt_id AND r2.a_in = 1) AS responses
    FROM ${schema}.rqrmnt_rspns_t rr
    JOIN ${schema}.rqrmnt_lst_t r ON r.rqrmnt_id = rr.rqrmnt_id AND r.a_in = 1
    LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = r.srvc_type_id
    JOIN ${schema}.usr_lst_t u ON u.usr_id = r.postd_by_usr_id
    WHERE rr.rspndr_usr_id = $1 AND rr.a_in = 1
    ORDER BY rr.rspndd_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/** Requirements this user has been invited to bid on. */
exports.invitedMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT r.rqrmnt_id, r.ttl_tx, r.lctn_tx, r.bdgt_tx, r.postd_ts,
           st.srvc_type_cd, st.srvc_type_nm, u.dsply_nm AS postd_by_nm,
           iv.sts_cd AS invite_sts, iv.i_ts AS invited_ts,
           (SELECT count(*) FROM ${schema}.rqrmnt_rspns_t rr WHERE rr.rqrmnt_id = r.rqrmnt_id AND rr.a_in = 1) AS responses
    FROM ${schema}.rqrmnt_invit_t iv
    JOIN ${schema}.rqrmnt_lst_t r ON r.rqrmnt_id = iv.rqrmnt_id AND r.a_in = 1
    LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = r.srvc_type_id
    JOIN ${schema}.usr_lst_t u ON u.usr_id = r.postd_by_usr_id
    WHERE iv.invtd_usr_id = $1 AND iv.a_in = 1
    ORDER BY iv.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

/**
 * Invite a professional to a requirement. The INSERT…SELECT only proceeds if the
 * inviter actually posted that requirement, so nobody can send invites on a
 * requirement they don't own. Idempotent per (requirement, invitee).
 */
exports.inviteMdl = function (rqrmnt_id: number, invtd_usr_id: number, invtd_by_usr_id: number, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.rqrmnt_invit_t (rqrmnt_id, invtd_usr_id, invtd_by_usr_id)
    SELECT $1, $2, $3
    WHERE EXISTS (SELECT 1 FROM ${schema}.rqrmnt_lst_t rq WHERE rq.rqrmnt_id = $1 AND rq.postd_by_usr_id = $3)
    ON CONFLICT (rqrmnt_id, invtd_usr_id) DO NOTHING
    RETURNING invit_id`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [rqrmnt_id, invtd_usr_id, invtd_by_usr_id], cntxtDtls, req);
};
