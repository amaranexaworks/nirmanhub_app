/** LendingMdl — loan products and applications. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

exports.listProductsMdl = (req?: any) => q(`
  SELECT p.prdct_id, p.nm_tx, p.rate_tx, p.range_tx, p.tenure_tx, p.dscn_tx, p.actv_in,
         r.rle_cd AS for_rle_cd, r.rle_nm AS for_rle_nm,
         u.dsply_nm AS provider_nm
  FROM ${schema}.loan_prdct_lst_t p
  LEFT JOIN ${schema}.rle_lst_t r ON r.rle_id = p.for_rle_id
  LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = p.provdr_usr_id
  WHERE p.a_in = 1 AND p.actv_in = 1 ORDER BY p.nm_tx`, [], req);

exports.createProductMdl = (provider: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.loan_prdct_lst_t (nm_tx, rate_tx, range_tx, tenure_tx, for_rle_id, provdr_usr_id, dscn_tx)
  VALUES ($1,$2,$3,$4,(SELECT rle_id FROM ${schema}.rle_lst_t WHERE rle_cd = $5),$6,$7)
  ON CONFLICT (nm_tx) DO UPDATE SET rate_tx = EXCLUDED.rate_tx, range_tx = EXCLUDED.range_tx,
    tenure_tx = EXCLUDED.tenure_tx, actv_in = 1
  RETURNING prdct_id, nm_tx`,
  [d.name, d.rate || null, d.range || null, d.tenure || null, d.forRole || null, provider, d.description || null], req);

exports.applyMdl = (aplcnt: number, prdct_id: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.loan_aplctn_lst_t (prdct_id, aplcnt_usr_id, amt_am, tenure_tx, purpose_tx)
  VALUES ($1,$2,$3,$4,$5) RETURNING aplctn_id, sts_cd, i_ts`,
  [prdct_id, aplcnt, d.amount || null, d.tenure || null, d.purpose || null], req);

/** Applications the user submitted. */
exports.myApplicationsMdl = (aplcnt: number, req?: any) => q(`
  SELECT a.aplctn_id, a.amt_am, a.tenure_tx, a.purpose_tx, a.sts_cd, a.remrk_tx, a.i_ts,
         p.nm_tx AS product_nm, p.rate_tx
  FROM ${schema}.loan_aplctn_lst_t a
  JOIN ${schema}.loan_prdct_lst_t p ON p.prdct_id = a.prdct_id
  WHERE a.a_in = 1 AND a.aplcnt_usr_id = $1 ORDER BY a.i_ts DESC`, [aplcnt], req);

/** Applications on the financier's products (for review). */
exports.applicationsForProviderMdl = (provider: number, req?: any) => q(`
  SELECT a.aplctn_id, a.amt_am, a.tenure_tx, a.purpose_tx, a.sts_cd, a.i_ts,
         p.nm_tx AS product_nm, u.usr_id AS aplcnt_usr_id, u.dsply_nm AS aplcnt_nm, u.rtng_nm
  FROM ${schema}.loan_aplctn_lst_t a
  JOIN ${schema}.loan_prdct_lst_t p ON p.prdct_id = a.prdct_id
  JOIN ${schema}.usr_lst_t u ON u.usr_id = a.aplcnt_usr_id
  WHERE a.a_in = 1 AND p.provdr_usr_id = $1 ORDER BY a.i_ts DESC`, [provider], req);

exports.reviewMdl = (aplctn_id: number, sts: string, remark: string | null, req?: any) => q(`
  UPDATE ${schema}.loan_aplctn_lst_t SET sts_cd = $2, remrk_tx = $3, u_ts = now()
  WHERE aplctn_id = $1 AND a_in = 1
  RETURNING aplctn_id, sts_cd, remrk_tx`, [aplctn_id, sts, remark], req);
