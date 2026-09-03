/** BookingMdl — a seeker's bookings and the pro's incoming bookings. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** role = 'seeker' (I booked) or 'pro' (I was booked); status optional filter. */
exports.listMdl = function (usr_id: number, role: string, status: string | null, req?: any) {
  const col = role === 'pro' ? 'pro_usr_id' : 'seeker_usr_id';
  const otherCol = role === 'pro' ? 'seeker_usr_id' : 'pro_usr_id';
  const QRY = `
    SELECT b.bookng_id, b.srvc_tx, b.sts_cd, b.schdl_ts, b.amt_am, b.prgrs_pct, b.i_ts,
           st.srvc_type_cd, st.srvc_type_nm,
           o.usr_id AS other_usr_id, o.dsply_nm AS other_nm, o.avtr_url_tx AS other_avatar,
           r.rle_nm AS other_rle
    FROM ${schema}.bookng_lst_t b
    LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = b.srvc_type_id
    LEFT JOIN ${schema}.usr_lst_t o ON o.usr_id = b.${otherCol}
    LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = o.actv_rle_id
    WHERE b.a_in = 1 AND b.${col} = $1
      AND ($2::text IS NULL OR b.sts_cd = $2)
    ORDER BY b.schdl_ts DESC NULLS LAST, b.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, status], cntxtDtls, req);
};

// SECURITY: scoped to the caller. A booking is visible only to its two parties
// (the seeker who booked and the pro who was booked) — never by id alone, or any
// user could read/enumerate everyone's bookings.
exports.getMdl = function (bookng_id: number, usr_id: number, req?: any) {
  const QRY = `SELECT * FROM ${schema}.bookng_lst_t
               WHERE bookng_id = $1 AND a_in = 1 AND (seeker_usr_id = $2 OR pro_usr_id = $2)`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [bookng_id, usr_id], cntxtDtls, req);
};

exports.createMdl = function (seeker_usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.bookng_lst_t (seeker_usr_id, pro_usr_id, srvc_type_id, srvc_tx, sts_cd, schdl_ts, amt_am, note_tx)
    VALUES ($1, $2, (SELECT srvc_type_id FROM ${schema}.srvc_type_lst_t WHERE srvc_type_cd = $3),
            $4, COALESCE($5,'upcoming'), $6, $7, $8)
    RETURNING bookng_id, sts_cd, i_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [seeker_usr_id, d.proUserId || null, d.serviceType || null, d.service || null,
     d.status || null, d.scheduledAt || null, d.amount || null, d.note || null], cntxtDtls, req);
};

// SECURITY: only a party to the booking may mutate it (status/progress/amount).
exports.updateMdl = function (bookng_id: number, usr_id: number, d: any, req?: any) {
  const QRY = `
    UPDATE ${schema}.bookng_lst_t
    SET sts_cd = COALESCE($3, sts_cd), prgrs_pct = COALESCE($4, prgrs_pct),
        amt_am = COALESCE($5, amt_am), schdl_ts = COALESCE($6, schdl_ts), u_ts = now()
    WHERE bookng_id = $1 AND a_in = 1 AND (seeker_usr_id = $2 OR pro_usr_id = $2)
    RETURNING bookng_id, sts_cd, prgrs_pct`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [bookng_id, usr_id, d.status || null, d.progress != null ? d.progress : null,
     d.amount || null, d.scheduledAt || null], cntxtDtls, req);
};
