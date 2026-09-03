-- ════════════════════════════════════════════════════════════════════════
-- 019 — Performance indexes. Postgres does NOT auto-index foreign-key columns,
-- so joins and ON DELETE CASCADE do sequential scans at scale. This adds a
-- covering index for every FK column + a few hot-path composites.
-- (Idempotent: CREATE INDEX IF NOT EXISTS.)
-- ════════════════════════════════════════════════════════════════════════
SET search_path TO nirmaan, public;

-- ── Identity / RBAC ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usr_actv_rle        ON nirmaan.usr_lst_t (actv_rle_id);
CREATE INDEX IF NOT EXISTS idx_usr_a_in            ON nirmaan.usr_lst_t (a_in);
CREATE INDEX IF NOT EXISTS idx_archtyp_cpblty_cpb  ON nirmaan.archtyp_cpblty_rel_t (cpblty_id);
CREATE INDEX IF NOT EXISTS idx_dsgntn_dprtmnt      ON nirmaan.dsgntn_lst_t (dprtmnt_id);
CREATE INDEX IF NOT EXISTS idx_usr_rle_rle         ON nirmaan.usr_rle_rel_t (rle_id);
CREATE INDEX IF NOT EXISTS idx_usr_dprtmnt_dprtmnt ON nirmaan.usr_dprtmnt_rel_t (dprtmnt_id);
CREATE INDEX IF NOT EXISTS idx_usr_dprtmnt_dsgntn  ON nirmaan.usr_dprtmnt_rel_t (dsgntn_id);

-- ── Navigation ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_archtyp_mnu_item    ON nirmaan.archtyp_mnu_itm_rel_t (mnu_itm_id);
CREATE INDEX IF NOT EXISTS idx_mnu_archtyp_archtyp ON nirmaan.mnu_itm_archtyp_rel_t (archtyp_id);

-- ── Requirements ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_rqrmnt_srvc_type    ON nirmaan.rqrmnt_lst_t (srvc_type_id);
CREATE INDEX IF NOT EXISTS idx_rspns_rspndr        ON nirmaan.rqrmnt_rspns_t (rspndr_usr_id);

-- ── Jobs ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_rle             ON nirmaan.job_lst_t (rle_id);
CREATE INDEX IF NOT EXISTS idx_job_open            ON nirmaan.job_lst_t (sts_cd, postd_ts DESC);
CREATE INDEX IF NOT EXISTS idx_job_aplctn_aplcnt   ON nirmaan.job_aplctn_t (aplcnt_usr_id);
CREATE INDEX IF NOT EXISTS idx_job_svd_usr         ON nirmaan.job_svd_rel_t (usr_id);

-- ── Bookings ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookng_srvc_type    ON nirmaan.bookng_lst_t (srvc_type_id);

-- ── Materials ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mtrl_item_vndr      ON nirmaan.mtrl_item_lst_t (vndr_usr_id);
CREATE INDEX IF NOT EXISTS idx_mtrl_ordr_item_ordr ON nirmaan.mtrl_ordr_item_t (ordr_id);
CREATE INDEX IF NOT EXISTS idx_mtrl_ordr_item_item ON nirmaan.mtrl_ordr_item_t (item_id);

-- ── Credit ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_crdt_ordr_item_ordr ON nirmaan.crdt_ordr_item_t (ordr_id);

-- ── Workforce ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wf_suprvsr_prjct    ON nirmaan.wf_suprvsr_lst_t (prjct_id);
CREATE INDEX IF NOT EXISTS idx_wf_workr_suprvsr    ON nirmaan.wf_workr_lst_t (suprvsr_id);
CREATE INDEX IF NOT EXISTS idx_wf_expns_prjct      ON nirmaan.wf_expns_t (prjct_id);
CREATE INDEX IF NOT EXISTS idx_wf_advnc_workr      ON nirmaan.wf_advnc_t (workr_id);
CREATE INDEX IF NOT EXISTS idx_wf_payout_prjct     ON nirmaan.wf_payout_t (prjct_id);
CREATE INDEX IF NOT EXISTS idx_wf_payout_workr     ON nirmaan.wf_payout_t (workr_id);

-- ── Wages ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wage_pymnt_workr    ON nirmaan.wage_pymnt_lst_t (workr_id);
CREATE INDEX IF NOT EXISTS idx_wage_adj_prjct      ON nirmaan.wage_adjstmnt_t (prjct_id);
CREATE INDEX IF NOT EXISTS idx_wage_adj_workr      ON nirmaan.wage_adjstmnt_t (workr_id);

-- ── Lending ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_loan_prdct_for_rle  ON nirmaan.loan_prdct_lst_t (for_rle_id);
CREATE INDEX IF NOT EXISTS idx_loan_prdct_provdr   ON nirmaan.loan_prdct_lst_t (provdr_usr_id);
CREATE INDEX IF NOT EXISTS idx_loan_aplctn_prdct   ON nirmaan.loan_aplctn_lst_t (prdct_id);

-- ── Messaging ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_msg_prtcpnt_usr     ON nirmaan.msg_thrd_prtcpnt_t (usr_id);
CREATE INDEX IF NOT EXISTS idx_msg_sndr            ON nirmaan.msg_lst_t (sndr_usr_id);

-- ── Sessions (connect-pg-simple expiry sweep) ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_session_expire ON nirmaan.user_session_t (expire);
