/**
 * AdminMdl — read + moderation data access for the admin console. Every query is
 * parameterized; moderation is soft (a_in = 0) so nothing is hard-deleted.
 * Grouped by console area: overview · users · content · finance · broadcast.
 */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

// ── Overview / analytics ─────────────────────────────────────────────────────
/** A single row of platform-wide counters for the dashboard. */
exports.overviewMdl = (req?: any) => q(`
  SELECT
    (SELECT count(*) FROM ${schema}.usr_lst_t WHERE a_in = 1)                                   AS users_total,
    (SELECT count(*) FROM ${schema}.usr_lst_t WHERE a_in = 1 AND kyc_tier_cd = 'verified')      AS users_verified,
    (SELECT count(*) FROM ${schema}.usr_lst_t WHERE a_in = 0)                                   AS users_disabled,
    (SELECT count(*) FROM ${schema}.kyc_submsn_lst_t WHERE a_in = 1 AND sts_cd = 'pending')     AS kyc_pending,
    (SELECT count(*) FROM ${schema}.job_lst_t WHERE a_in = 1)                                   AS jobs_active,
    (SELECT count(*) FROM ${schema}.rqrmnt_lst_t WHERE a_in = 1)                                AS requirements_active,
    (SELECT count(*) FROM ${schema}.mtrl_item_lst_t WHERE a_in = 1)                             AS materials_active,
    (SELECT count(*) FROM ${schema}.bookng_lst_t WHERE a_in = 1)                                AS bookings_total,
    (SELECT count(*) FROM ${schema}.loan_aplctn_lst_t WHERE a_in = 1 AND sts_cd = 'pending')    AS loans_pending,
    (SELECT count(*) FROM ${schema}.wf_prjct_lst_t WHERE a_in = 1)                              AS projects_total,
    (SELECT count(*) FROM ${schema}.mtrl_ordr_lst_t WHERE a_in = 1)                             AS material_orders,
    (SELECT count(*) FROM ${schema}.crdt_ordr_lst_t WHERE a_in = 1)                             AS credit_orders,
    (SELECT count(*) FROM ${schema}.msg_thrd_lst_t WHERE a_in = 1)                              AS threads_total,
    (SELECT COALESCE(sum(amt_am),0) FROM ${schema}.wallet_txn_lst_t WHERE a_in = 1 AND kind_cd = 'credit') AS wallet_credit_am,
    (SELECT COALESCE(sum(amt_am),0) FROM ${schema}.wage_pymnt_lst_t)                            AS wages_paid_am
`, [], req);

/** New-user counts for the last 14 days (simple activity sparkline source). */
exports.signupsTrendMdl = (req?: any) => q(`
  SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
         count(u.usr_id)::int AS n
  FROM generate_series((now() - interval '13 days')::date, now()::date, interval '1 day') AS d(day)
  LEFT JOIN ${schema}.usr_lst_t u ON u.i_ts::date = d.day AND u.a_in = 1
  GROUP BY d.day ORDER BY d.day`, [], req);

// ── Users ────────────────────────────────────────────────────────────────────
/** Paginated user list with primary role + archetype; optional text/role filter. */
exports.listUsersMdl = (search: string | null, archtyp: string | null, limit: number, offset: number, req?: any) => q(`
  SELECT u.usr_id, u.mbl_nm, u.dsply_nm, u.eml_tx, u.cty_nm, u.kyc_tier_cd,
         u.rtng_nm, u.a_in, u.i_ts,
         r.rle_cd, r.rle_nm, a.archtyp_cd
  FROM ${schema}.usr_lst_t u
  LEFT JOIN ${schema}.rle_lst_t r     ON r.rle_id = u.actv_rle_id
  LEFT JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
  WHERE ($1::text IS NULL OR u.dsply_nm ILIKE '%'||$1||'%' OR u.mbl_nm ILIKE '%'||$1||'%' OR u.eml_tx ILIKE '%'||$1||'%')
    AND ($2::text IS NULL OR a.archtyp_cd = $2)
  ORDER BY u.i_ts DESC
  LIMIT $3 OFFSET $4`, [search, archtyp, limit, offset], req);

/** Total for the same filter (pagination meta). */
exports.countUsersMdl = (search: string | null, archtyp: string | null, req?: any) => q(`
  SELECT count(*)::int AS n
  FROM ${schema}.usr_lst_t u
  LEFT JOIN ${schema}.rle_lst_t r     ON r.rle_id = u.actv_rle_id
  LEFT JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
  WHERE ($1::text IS NULL OR u.dsply_nm ILIKE '%'||$1||'%' OR u.mbl_nm ILIKE '%'||$1||'%' OR u.eml_tx ILIKE '%'||$1||'%')
    AND ($2::text IS NULL OR a.archtyp_cd = $2)`, [search, archtyp], req);

/** Full profile + all roles + latest KYC for the detail drawer. */
exports.getUserMdl = (usr_id: number, req?: any) => q(`
  SELECT u.usr_id, u.mbl_nm, u.dsply_nm, u.eml_tx, u.cty_nm, u.pncd_tx, u.hdln_tx, u.bio_tx,
         u.kyc_tier_cd, u.rtng_nm, u.rtng_cnt, u.day_rate_am, u.a_in, u.i_ts, u.actv_rle_id
  FROM ${schema}.usr_lst_t u WHERE u.usr_id = $1`, [usr_id], req);

exports.getUserRolesMdl = (usr_id: number, req?: any) => q(`
  SELECT r.rle_id, r.rle_cd, r.rle_nm, r.emoji_tx, a.archtyp_cd, ur.prmry_in
  FROM ${schema}.usr_rle_rel_t ur
  JOIN ${schema}.rle_lst_t r     ON r.rle_id = ur.rle_id
  JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
  WHERE ur.usr_id = $1 AND ur.a_in = 1
  ORDER BY ur.prmry_in DESC, r.sqnce_id`, [usr_id], req);

/** Activate / deactivate a login (soft). Returns the new state. */
exports.setUserActiveMdl = (usr_id: number, a_in: number, req?: any) => q(`
  UPDATE ${schema}.usr_lst_t SET a_in = $2, u_ts = now()
  WHERE usr_id = $1 RETURNING usr_id, dsply_nm, a_in`, [usr_id, a_in], req);

/** Extra capabilities granted directly to a user (feature access). */
exports.getUserGrantedCapsMdl = (usr_id: number, req?: any) => q(`
  SELECT c.cpblty_cd
  FROM ${schema}.usr_cpblty_rel_t uc
  JOIN ${schema}.cpblty_lst_t c ON c.cpblty_id = uc.cpblty_id
  WHERE uc.usr_id = $1 AND uc.a_in = 1`, [usr_id], req);

/** Grant a set of capabilities (by code) to a user. Idempotent. */
exports.grantUserCapsMdl = (usr_id: number, caps: string[], grantedBy: number, req?: any) => q(`
  INSERT INTO ${schema}.usr_cpblty_rel_t (usr_id, cpblty_id, grantd_by_usr_id, a_in)
  SELECT $1, c.cpblty_id, $3, 1
  FROM ${schema}.cpblty_lst_t c
  WHERE c.cpblty_cd = ANY($2::text[])
  ON CONFLICT (usr_id, cpblty_id) DO UPDATE SET a_in = 1, grantd_by_usr_id = EXCLUDED.grantd_by_usr_id
  RETURNING cpblty_id`, [usr_id, caps, grantedBy], req);

/** Revoke a set of capabilities (soft) from a user. */
exports.revokeUserCapsMdl = (usr_id: number, caps: string[], req?: any) => q(`
  UPDATE ${schema}.usr_cpblty_rel_t uc
  SET a_in = 0
  FROM ${schema}.cpblty_lst_t c
  WHERE uc.cpblty_id = c.cpblty_id AND uc.usr_id = $1 AND c.cpblty_cd = ANY($2::text[])
  RETURNING uc.cpblty_id`, [usr_id, caps], req);

// ── Content moderation ───────────────────────────────────────────────────────
exports.listJobsMdl = (limit: number, req?: any) => q(`
  SELECT j.job_id, j.ttl_tx, j.pay_am, j.pay_unit_cd, j.lctn_tx, j.sts_cd, j.urgnt_in,
         j.a_in, j.postd_ts, u.dsply_nm AS employer_nm, u.usr_id AS employer_usr_id
  FROM ${schema}.job_lst_t j
  JOIN ${schema}.usr_lst_t u ON u.usr_id = j.employer_usr_id
  ORDER BY j.postd_ts DESC LIMIT $1`, [limit], req);

exports.setJobActiveMdl = (job_id: number, a_in: number, req?: any) => q(`
  UPDATE ${schema}.job_lst_t SET a_in = $2 WHERE job_id = $1 RETURNING job_id, ttl_tx, a_in`, [job_id, a_in], req);

exports.listRequirementsMdl = (limit: number, req?: any) => q(`
  SELECT rq.rqrmnt_id, rq.ttl_tx, rq.lctn_tx, rq.bdgt_tx, rq.a_in, rq.postd_ts,
         st.srvc_type_nm, u.dsply_nm AS poster_nm, u.usr_id AS poster_usr_id
  FROM ${schema}.rqrmnt_lst_t rq
  LEFT JOIN ${schema}.srvc_type_lst_t st ON st.srvc_type_id = rq.srvc_type_id
  JOIN ${schema}.usr_lst_t u ON u.usr_id = rq.postd_by_usr_id
  ORDER BY rq.postd_ts DESC LIMIT $1`, [limit], req);

exports.setRequirementActiveMdl = (rqrmnt_id: number, a_in: number, req?: any) => q(`
  UPDATE ${schema}.rqrmnt_lst_t SET a_in = $2 WHERE rqrmnt_id = $1 RETURNING rqrmnt_id, ttl_tx, a_in`, [rqrmnt_id, a_in], req);

exports.listMaterialsMdl = (limit: number, req?: any) => q(`
  SELECT m.item_id, m.nm_tx, m.emoji_tx, m.price_am, m.unit_tx, m.poplr_in, m.a_in, m.img_url_tx,
         c.ctgry_nm, u.dsply_nm AS vendor_nm, m.vndr_usr_id
  FROM ${schema}.mtrl_item_lst_t m
  LEFT JOIN ${schema}.mtrl_ctgry_lst_t c ON c.ctgry_id = m.ctgry_id
  LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = m.vndr_usr_id
  ORDER BY m.item_id DESC LIMIT $1`, [limit], req);

exports.setMaterialActiveMdl = (item_id: number, a_in: number, req?: any) => q(`
  UPDATE ${schema}.mtrl_item_lst_t SET a_in = $2 WHERE item_id = $1 RETURNING item_id, nm_tx, a_in`, [item_id, a_in], req);

// ── Catalog images (admin uploads real product/category photos) ──
exports.setCategoryImageMdl = (ctgry_id: number, url: string, req?: any) => q(`
  UPDATE ${schema}.mtrl_ctgry_lst_t SET img_url_tx = $2 WHERE ctgry_id = $1 RETURNING ctgry_id, img_url_tx`, [ctgry_id, url || null], req);

exports.setItemImageMdl = (item_id: number, url: string, req?: any) => q(`
  UPDATE ${schema}.mtrl_item_lst_t SET img_url_tx = $2 WHERE item_id = $1 RETURNING item_id, img_url_tx`, [item_id, url || null], req);

exports.listBookingsMdl = (limit: number, req?: any) => q(`
  SELECT b.bookng_id, b.srvc_tx, b.sts_cd, b.amt_am, b.prgrs_pct, b.schdl_ts, b.i_ts,
         s.dsply_nm AS seeker_nm, p.dsply_nm AS pro_nm
  FROM ${schema}.bookng_lst_t b
  JOIN ${schema}.usr_lst_t s ON s.usr_id = b.seeker_usr_id
  LEFT JOIN ${schema}.usr_lst_t p ON p.usr_id = b.pro_usr_id
  WHERE b.a_in = 1
  ORDER BY b.i_ts DESC LIMIT $1`, [limit], req);

// ── Projects (workforce sites, platform-wide) ────────────────────────────────
exports.listProjectsMdl = (limit: number, req?: any) => q(`
  SELECT p.prjct_id, p.nm_tx, p.lctn_lbl, p.i_ts, p.a_in,
         u.dsply_nm AS owner_nm, u.usr_id AS owner_usr_id,
         (SELECT count(*) FROM ${schema}.wf_workr_lst_t w WHERE w.prjct_id = p.prjct_id AND w.a_in = 1)::int AS workers,
         (SELECT count(*) FROM ${schema}.wf_suprvsr_lst_t s WHERE s.prjct_id = p.prjct_id AND s.a_in = 1)::int AS supervisors
  FROM ${schema}.wf_prjct_lst_t p
  JOIN ${schema}.usr_lst_t u ON u.usr_id = p.ownr_usr_id
  WHERE p.a_in = 1
  ORDER BY p.i_ts DESC LIMIT $1`, [limit], req);

// ── Finance oversight ────────────────────────────────────────────────────────
exports.listLoansMdl = (limit: number, req?: any) => q(`
  SELECT la.aplctn_id, la.amt_am, la.tenure_tx, la.purpose_tx, la.sts_cd, la.i_ts,
         p.nm_tx AS product_nm, u.dsply_nm AS applicant_nm, u.usr_id AS applicant_usr_id
  FROM ${schema}.loan_aplctn_lst_t la
  JOIN ${schema}.loan_prdct_lst_t p ON p.prdct_id = la.prdct_id
  JOIN ${schema}.usr_lst_t u ON u.usr_id = la.aplcnt_usr_id
  WHERE la.a_in = 1
  ORDER BY la.i_ts DESC LIMIT $1`, [limit], req);

exports.listWalletTxnsMdl = (limit: number, req?: any) => q(`
  SELECT w.txn_id, w.kind_cd, w.amt_am, w.ttl_tx, w.sts_cd, w.i_ts,
         u.dsply_nm AS user_nm, u.usr_id
  FROM ${schema}.wallet_txn_lst_t w
  JOIN ${schema}.usr_lst_t u ON u.usr_id = w.usr_id
  WHERE w.a_in = 1
  ORDER BY w.i_ts DESC LIMIT $1`, [limit], req);

exports.listWagesMdl = (limit: number, req?: any) => q(`
  SELECT pymnt_id, rcpt_no_tx, amt_am, method_cd, sts_cd, paid_by_tx, crtd_ts
  FROM ${schema}.wage_pymnt_lst_t
  ORDER BY crtd_ts DESC LIMIT $1`, [limit], req);

exports.listSubscriptionsMdl = (limit: number, req?: any) => q(`
  SELECT s.id, s.plan_cd, s.cycle_cd, s.sts_cd, s.strt_ts, s.end_ts,
         u.dsply_nm AS user_nm, u.usr_id
  FROM ${schema}.usr_sbscrptn_t s
  JOIN ${schema}.usr_lst_t u ON u.usr_id = s.usr_id
  ORDER BY s.i_ts DESC LIMIT $1`, [limit], req);

exports.listMaterialOrdersMdl = (limit: number, req?: any) => q(`
  SELECT o.ordr_id, o.ttl_am, o.sts_cd, o.dlvry_tx, o.i_ts, u.dsply_nm AS buyer_nm
  FROM ${schema}.mtrl_ordr_lst_t o
  JOIN ${schema}.usr_lst_t u ON u.usr_id = o.buyer_usr_id
  WHERE o.a_in = 1 ORDER BY o.i_ts DESC LIMIT $1`, [limit], req);

exports.listCreditOrdersMdl = (limit: number, req?: any) => q(`
  SELECT o.ordr_id, o.vndr_tx, o.ttl_am, o.tenure_days, o.due_ts, o.sts_cd, o.ordrd_ts,
         u.dsply_nm AS buyer_nm
  FROM ${schema}.crdt_ordr_lst_t o
  JOIN ${schema}.usr_lst_t u ON u.usr_id = o.buyer_usr_id
  WHERE o.a_in = 1 ORDER BY o.ordrd_ts DESC LIMIT $1`, [limit], req);

// ── Messaging oversight (threads only — not message contents, for privacy) ───
exports.listThreadsMdl = (limit: number, req?: any) => q(`
  SELECT t.thrd_id, t.subj_tx, t.u_ts,
    (SELECT count(*) FROM ${schema}.msg_thrd_prtcpnt_t p WHERE p.thrd_id = t.thrd_id)::int AS participants,
    (SELECT count(*) FROM ${schema}.msg_lst_t m WHERE m.thrd_id = t.thrd_id)::int AS messages,
    (SELECT string_agg(u.dsply_nm, ', ') FROM ${schema}.msg_thrd_prtcpnt_t p
       JOIN ${schema}.usr_lst_t u ON u.usr_id = p.usr_id WHERE p.thrd_id = t.thrd_id) AS people
  FROM ${schema}.msg_thrd_lst_t t
  WHERE t.a_in = 1 ORDER BY t.u_ts DESC LIMIT $1`, [limit], req);

// ── Platform catalogs (the configurable master data) ─────────────────────────
exports.listServiceTypesMdl = (req?: any) => q(`
  SELECT srvc_type_id, srvc_type_cd, srvc_type_nm, price_hint_tx, sqnce_id, a_in
  FROM ${schema}.srvc_type_lst_t ORDER BY sqnce_id`, [], req);

exports.listMaterialCategoriesMdl = (req?: any) => q(`
  SELECT c.ctgry_id, c.ctgry_cd, c.ctgry_nm, c.sqnce_id, c.a_in,
    (SELECT count(*) FROM ${schema}.mtrl_item_lst_t i WHERE i.ctgry_id = c.ctgry_id AND i.a_in = 1)::int AS items
  FROM ${schema}.mtrl_ctgry_lst_t c ORDER BY c.sqnce_id`, [], req);

exports.listLoanProductsMdl = (limit: number, req?: any) => q(`
  SELECT p.prdct_id, p.nm_tx, p.rate_tx, p.range_tx, p.tenure_tx, p.actv_in,
    u.dsply_nm AS provider_nm,
    (SELECT count(*) FROM ${schema}.loan_aplctn_lst_t la WHERE la.prdct_id = p.prdct_id AND la.a_in = 1)::int AS applications
  FROM ${schema}.loan_prdct_lst_t p
  LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = p.provdr_usr_id
  WHERE p.a_in = 1 ORDER BY p.prdct_id DESC LIMIT $1`, [limit], req);

exports.listBillingPlansMdl = (req?: any) => q(`
  SELECT plan_id, plan_cd, cycle_cd, price_am, benefits_tx, a_in
  FROM ${schema}.sbscrptn_plan_lst_t ORDER BY plan_id`, [], req);

// ── Catalog writes (create / update the platform master data) ────────────────
const n = (v: any) => (v === undefined || v === '' ? null : v); // '' → null (keep on update)

exports.createServiceTypeMdl = (d: any, req?: any) => q(`
  INSERT INTO ${schema}.srvc_type_lst_t (srvc_type_cd, srvc_type_nm, icn_tx, price_hint_tx, sqnce_id)
  VALUES ($1,$2,$3,$4,COALESCE($5,0))
  ON CONFLICT (srvc_type_cd) DO UPDATE SET srvc_type_nm = EXCLUDED.srvc_type_nm,
    price_hint_tx = EXCLUDED.price_hint_tx, icn_tx = EXCLUDED.icn_tx, a_in = 1
  RETURNING srvc_type_id`, [d.srvc_type_cd, d.srvc_type_nm, n(d.icn_tx), n(d.price_hint_tx), n(d.sqnce_id)], req);
exports.updateServiceTypeMdl = (id: number, d: any, req?: any) => q(`
  UPDATE ${schema}.srvc_type_lst_t SET srvc_type_nm = COALESCE($2, srvc_type_nm),
    price_hint_tx = COALESCE($3, price_hint_tx), icn_tx = COALESCE($4, icn_tx),
    sqnce_id = COALESCE($5, sqnce_id), a_in = COALESCE($6, a_in)
  WHERE srvc_type_id = $1 RETURNING srvc_type_id`,
  [id, n(d.srvc_type_nm), n(d.price_hint_tx), n(d.icn_tx), n(d.sqnce_id), d.a_in ?? null], req);

exports.createMaterialCategoryMdl = (d: any, req?: any) => q(`
  INSERT INTO ${schema}.mtrl_ctgry_lst_t (ctgry_cd, ctgry_nm, icn_tx, sqnce_id)
  VALUES ($1,$2,$3,COALESCE($4,0))
  ON CONFLICT (ctgry_cd) DO UPDATE SET ctgry_nm = EXCLUDED.ctgry_nm, icn_tx = EXCLUDED.icn_tx, a_in = 1
  RETURNING ctgry_id`, [d.ctgry_cd, d.ctgry_nm, n(d.icn_tx), n(d.sqnce_id)], req);
exports.updateMaterialCategoryMdl = (id: number, d: any, req?: any) => q(`
  UPDATE ${schema}.mtrl_ctgry_lst_t SET ctgry_nm = COALESCE($2, ctgry_nm),
    icn_tx = COALESCE($3, icn_tx), sqnce_id = COALESCE($4, sqnce_id), a_in = COALESCE($5, a_in)
  WHERE ctgry_id = $1 RETURNING ctgry_id`,
  [id, n(d.ctgry_nm), n(d.icn_tx), n(d.sqnce_id), d.a_in ?? null], req);

exports.createLoanProductMdl = (d: any, req?: any) => q(`
  INSERT INTO ${schema}.loan_prdct_lst_t (nm_tx, rate_tx, range_tx, tenure_tx, dscn_tx, actv_in)
  VALUES ($1,$2,$3,$4,$5,1) RETURNING prdct_id`,
  [d.nm_tx, n(d.rate_tx), n(d.range_tx), n(d.tenure_tx), n(d.dscn_tx)], req);
exports.updateLoanProductMdl = (id: number, d: any, req?: any) => q(`
  UPDATE ${schema}.loan_prdct_lst_t SET nm_tx = COALESCE($2, nm_tx), rate_tx = COALESCE($3, rate_tx),
    range_tx = COALESCE($4, range_tx), tenure_tx = COALESCE($5, tenure_tx),
    dscn_tx = COALESCE($6, dscn_tx), actv_in = COALESCE($7, actv_in)
  WHERE prdct_id = $1 RETURNING prdct_id`,
  [id, n(d.nm_tx), n(d.rate_tx), n(d.range_tx), n(d.tenure_tx), n(d.dscn_tx), d.actv_in ?? null], req);

exports.createBillingPlanMdl = (d: any, req?: any) => q(`
  INSERT INTO ${schema}.sbscrptn_plan_lst_t (plan_cd, cycle_cd, price_am, benefits_tx)
  VALUES ($1,$2,COALESCE($3,0),$4) RETURNING plan_id`,
  [d.plan_cd, d.cycle_cd, n(d.price_am), n(d.benefits_tx)], req);
exports.updateBillingPlanMdl = (id: number, d: any, req?: any) => q(`
  UPDATE ${schema}.sbscrptn_plan_lst_t SET price_am = COALESCE($2, price_am),
    benefits_tx = COALESCE($3, benefits_tx), cycle_cd = COALESCE($4, cycle_cd), a_in = COALESCE($5, a_in)
  WHERE plan_id = $1 RETURNING plan_id`,
  [id, n(d.price_am), n(d.benefits_tx), n(d.cycle_cd), d.a_in ?? null], req);

// ── Login activity ───────────────────────────────────────────────────────────
/** Recent login attempts across the platform (success + failed), newest first. */
exports.listLoginsMdl = (limit: number, req?: any) => q(`
  SELECT l.lgn_id, l.mbl_nm, l.clnt_type_tx, l.ip_tx, l.succ_in, l.i_ts,
         u.usr_id, u.dsply_nm
  FROM ${schema}.usr_lgn_hstry_dtl_t l
  LEFT JOIN ${schema}.usr_lst_t u ON u.usr_id = l.usr_id
  ORDER BY l.i_ts DESC LIMIT $1`, [limit], req);

// ── Broadcast ────────────────────────────────────────────────────────────────
/** Insert one notification per active user (optionally only a given archetype). */
exports.broadcastMdl = (title: string, body: string | null, url: string | null, archtyp: string | null, req?: any) => q(`
  INSERT INTO ${schema}.notfcn_lst_t (usr_id, ttl_tx, body_tx, type_cd, url_tx)
  SELECT u.usr_id, $1, $2, 'broadcast', $3
  FROM ${schema}.usr_lst_t u
  LEFT JOIN ${schema}.rle_lst_t r     ON r.rle_id = u.actv_rle_id
  LEFT JOIN ${schema}.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
  WHERE u.a_in = 1 AND ($4::text IS NULL OR a.archtyp_cd = $4)
  RETURNING notfcn_id`, [title, body, url, archtyp], req);
