/** JobMdl — job postings, applications, saved jobs. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

/** Open jobs feed (optionally filtered by trade/city). */
exports.listMdl = function (f: any, usr_id: number, limit: number, offset: number, req?: any) {
  const QRY = `
    SELECT j.job_id, j.ttl_tx, j.pay_am, j.pay_unit_cd, j.days_cnt, j.lctn_tx,
           j.urgnt_in, j.sts_cd, j.postd_ts, r.rle_cd, r.rle_nm,
           u.usr_id AS employer_usr_id, u.dsply_nm AS employer_nm, u.rtng_nm,
           (SELECT count(*) FROM ${schema}.job_aplctn_t a WHERE a.job_id = j.job_id AND a.a_in = 1) AS applicants,
           EXISTS (SELECT 1 FROM ${schema}.job_svd_rel_t s WHERE s.job_id = j.job_id AND s.usr_id = $1) AS saved,
           EXISTS (SELECT 1 FROM ${schema}.job_aplctn_t a WHERE a.job_id = j.job_id AND a.aplcnt_usr_id = $1 AND a.a_in = 1) AS applied
    FROM ${schema}.job_lst_t j
    JOIN ${schema}.usr_lst_t u ON u.usr_id = j.employer_usr_id
    LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = j.rle_id
    WHERE j.a_in = 1 AND j.sts_cd = 'open'
      AND ($2::text IS NULL OR r.rle_cd = $2)
      AND ($3::text IS NULL OR j.lctn_tx ILIKE '%' || $3 || '%')
    ORDER BY j.urgnt_in DESC, j.postd_ts DESC
    LIMIT $4 OFFSET $5`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id, f.trade || null, f.city || null, limit, offset], cntxtDtls, req);
};

exports.myPostedMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT j.job_id, j.ttl_tx, j.pay_am, j.pay_unit_cd, j.sts_cd, j.postd_ts,
           (SELECT count(*) FROM ${schema}.job_aplctn_t a WHERE a.job_id = j.job_id AND a.a_in = 1) AS applicants
    FROM ${schema}.job_lst_t j WHERE j.a_in = 1 AND j.employer_usr_id = $1
    ORDER BY j.postd_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

exports.myAppliedMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT j.job_id, j.ttl_tx, j.pay_am, j.pay_unit_cd, a.sts_cd AS aplctn_sts, a.i_ts AS applied_ts
    FROM ${schema}.job_aplctn_t a
    JOIN ${schema}.job_lst_t j ON j.job_id = a.job_id
    WHERE a.aplcnt_usr_id = $1 AND a.a_in = 1
    ORDER BY a.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};

exports.createMdl = function (usr_id: number, d: any, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.job_lst_t (ttl_tx, employer_usr_id, rle_id, pay_am, pay_unit_cd, days_cnt, lctn_tx, urgnt_in, dscn_tx)
    VALUES ($1, $2, (SELECT rle_id FROM ${schema}.rle_lst_t WHERE rle_cd = $3), $4, $5, $6, $7, $8, $9)
    RETURNING job_id, ttl_tx, postd_ts`;
  return dbutil.execQuery(sqldb.AppPool, QRY,
    [d.title, usr_id, d.trade || null, d.pay || null, d.payUnit || 'day', d.days || null,
     d.location || null, d.urgent ? 1 : 0, d.description || null], cntxtDtls, req);
};

exports.applyMdl = function (job_id: number, usr_id: number, msg: string | null, req?: any) {
  const QRY = `
    INSERT INTO ${schema}.job_aplctn_t (job_id, aplcnt_usr_id, msg_tx)
    VALUES ($1, $2, $3)
    ON CONFLICT (job_id, aplcnt_usr_id) DO UPDATE SET a_in = 1, msg_tx = EXCLUDED.msg_tx, sts_cd = 'applied'
    RETURNING aplctn_id, job_id, sts_cd`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [job_id, usr_id, msg], cntxtDtls, req);
};

// SECURITY: the applicant roster (names, ratings, avatars — PII) is visible ONLY to
// the employer who posted the job. The EXISTS clause ties the job to the caller, so
// a non-owner gets an empty set instead of every applicant on any job.
exports.applicantsMdl = function (job_id: number, usr_id: number, req?: any) {
  const QRY = `
    SELECT a.aplctn_id, a.sts_cd, a.msg_tx, a.i_ts,
           u.usr_id, u.dsply_nm, u.rtng_nm, u.rtng_cnt, u.avtr_url_tx
    FROM ${schema}.job_aplctn_t a
    JOIN ${schema}.usr_lst_t u ON u.usr_id = a.aplcnt_usr_id
    WHERE a.job_id = $1 AND a.a_in = 1
      AND EXISTS (SELECT 1 FROM ${schema}.job_lst_t j WHERE j.job_id = $1 AND j.employer_usr_id = $2)
    ORDER BY a.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [job_id, usr_id], cntxtDtls, req);
};

exports.toggleSaveMdl = async function (job_id: number, usr_id: number, req?: any) {
  const del = `DELETE FROM ${schema}.job_svd_rel_t WHERE job_id = $1 AND usr_id = $2 RETURNING id`;
  const removed = await dbutil.execQuery(sqldb.AppPool, del, [job_id, usr_id], cntxtDtls, req);
  if (removed && removed.length) return [{ saved: false }];
  const ins = `INSERT INTO ${schema}.job_svd_rel_t (job_id, usr_id) VALUES ($1, $2) RETURNING id`;
  await dbutil.execQuery(sqldb.AppPool, ins, [job_id, usr_id], cntxtDtls, req);
  return [{ saved: true }];
};

exports.savedMdl = function (usr_id: number, req?: any) {
  const QRY = `
    SELECT j.job_id, j.ttl_tx, j.pay_am, j.pay_unit_cd, j.lctn_tx, j.postd_ts
    FROM ${schema}.job_svd_rel_t s
    JOIN ${schema}.job_lst_t j ON j.job_id = s.job_id AND j.a_in = 1
    WHERE s.usr_id = $1 ORDER BY s.i_ts DESC`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [usr_id], cntxtDtls, req);
};
