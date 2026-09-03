/** KycMdl — KYC submissions, verification slots + review (review flips usr_lst_t.kyc_tier_cd). */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

/** Current tier + latest submission (incl. slot) for a user. */
exports.statusMdl = (usr_id: number, req?: any) => q(`
  SELECT u.kyc_tier_cd,
         s.submsn_id, s.tier_cd, s.doc_type_cd, s.sts_cd, s.remrk_tx, s.i_ts, s.revwd_ts,
         s.slot_ts, s.slot_sts_cd, s.contact_ph_tx
  FROM ${schema}.usr_lst_t u
  LEFT JOIN LATERAL (
     SELECT * FROM ${schema}.kyc_submsn_lst_t k
     WHERE k.usr_id = u.usr_id AND k.a_in = 1 ORDER BY k.i_ts DESC LIMIT 1
  ) s ON true
  WHERE u.usr_id = $1`, [usr_id], req);

exports.submitMdl = (usr_id: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.kyc_submsn_lst_t
    (usr_id, tier_cd, doc_type_cd, doc_no_tx, doc_url_tx, slot_ts, slot_sts_cd, contact_ph_tx)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  RETURNING submsn_id, tier_cd, doc_type_cd, sts_cd, slot_ts, slot_sts_cd, i_ts`,
  [usr_id, d.tier || 'basic', d.docType, d.docNo || null, d.docUrl || null,
   d.slotTs || null, d.slotTs ? 'booked' : 'none', d.contactPhone || null], req);

/** Book / re-book a slot on the user's latest pending submission. */
exports.bookSlotMdl = (usr_id: number, slot_ts: string, contact_ph: string | null, req?: any) => q(`
  UPDATE ${schema}.kyc_submsn_lst_t
  SET slot_ts = $2, slot_sts_cd = 'booked', contact_ph_tx = COALESCE($3, contact_ph_tx)
  WHERE submsn_id = (
    SELECT submsn_id FROM ${schema}.kyc_submsn_lst_t
    WHERE usr_id = $1 AND a_in = 1 AND sts_cd = 'pending'
    ORDER BY i_ts DESC LIMIT 1
  )
  RETURNING submsn_id, slot_ts, slot_sts_cd, contact_ph_tx`,
  [usr_id, slot_ts, contact_ph], req);

/** Admin queue: pending submissions with booked slots first, then soonest slot. */
exports.queueMdl = (req?: any) => q(`
  SELECT s.submsn_id, s.tier_cd, s.doc_type_cd, s.doc_no_tx, s.doc_url_tx, s.i_ts,
         s.slot_ts, s.slot_sts_cd, s.contact_ph_tx,
         u.usr_id, u.dsply_nm, u.mbl_nm, u.cty_nm, u.kyc_tier_cd
  FROM ${schema}.kyc_submsn_lst_t s
  JOIN ${schema}.usr_lst_t u ON u.usr_id = s.usr_id
  WHERE s.a_in = 1 AND s.sts_cd = 'pending'
  ORDER BY (s.slot_sts_cd = 'booked') DESC, s.slot_ts NULLS LAST, s.i_ts`, [], req);

/** Approve/reject; record the verifier + call note; on approve bump the user's tier. */
exports.reviewMdl = function (submsn_id: number, sts: string, remark: string | null, vrfr_usr_id: number, callNote: string | null, req?: any) {
  return dbutil.withTransaction(sqldb.AppPool, async (client: any) => {
    const r = await client.query(`
      UPDATE ${schema}.kyc_submsn_lst_t
      SET sts_cd = $2, remrk_tx = $3, revwd_ts = now(),
          vrfr_usr_id = $4, call_note_tx = $5, slot_sts_cd = 'done'
      WHERE submsn_id = $1 AND a_in = 1
      RETURNING submsn_id, usr_id, tier_cd, sts_cd`,
      [submsn_id, sts, remark, vrfr_usr_id, callNote]);
    if (!r.rows.length) return [];
    if (sts === 'approved') {
      await client.query(`UPDATE ${schema}.usr_lst_t SET kyc_tier_cd = $2, u_ts = now() WHERE usr_id = $1`,
        [r.rows[0].usr_id, r.rows[0].tier_cd]);
    }
    return [r.rows[0]];
  });
};
