/** WorkforceMdl — projects, supervisors, workers, attendance, expenses, advances, payouts. */
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;
const q = (sql: string, p: any[], req?: any) => dbutil.execQuery(sqldb.AppPool, sql, p, cntxtDtls, req);

// ── Ownership guards (IDOR defence) ──
// Every workforce entity hangs off a project, and a project has exactly one owner.
// The controller calls the matching guard with req.user.id BEFORE any id-based read /
// write; each returns the project row when the caller owns it, or [] otherwise. This
// stops one builder from reading or mutating another builder's workers, attendance,
// payouts, bills, compliance, PII, etc. by guessing ids.
exports.assertProjectOwnerMdl = (ownr: number, prjct: number, req?: any) => q(
  `SELECT prjct_id FROM ${schema}.wf_prjct_lst_t WHERE prjct_id = $1 AND ownr_usr_id = $2 AND a_in = 1`, [prjct, ownr], req);

exports.assertWorkerOwnerMdl = (ownr: number, workr: number, req?: any) => q(
  `SELECT w.workr_id FROM ${schema}.wf_workr_lst_t w
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = w.prjct_id
   WHERE w.workr_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [workr, ownr], req);

exports.assertContractorOwnerMdl = (ownr: number, cntrctr: number, req?: any) => q(
  `SELECT c.cntrctr_id FROM ${schema}.wf_cntrctr_lst_t c
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = c.prjct_id
   WHERE c.cntrctr_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [cntrctr, ownr], req);

exports.assertBillOwnerMdl = (ownr: number, bill: number, req?: any) => q(
  `SELECT b.bill_id FROM ${schema}.wf_cntrctr_bill_lst_t b
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = b.prjct_id
   WHERE b.bill_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [bill, ownr], req);

exports.assertIncidentOwnerMdl = (ownr: number, incdnt: number, req?: any) => q(
  `SELECT i.incdnt_id FROM ${schema}.wf_incdnt_lst_t i
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = i.prjct_id
   WHERE i.incdnt_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [incdnt, ownr], req);

// ── Projects ──
exports.listProjectsMdl = (ownr: number, req?: any) => q(`
  SELECT p.prjct_id, p.nm_tx, p.lctn_lbl, p.lctn_lat, p.lctn_lng, p.notes_tx, p.sts_cd, p.i_ts,
         (SELECT count(*) FROM ${schema}.wf_workr_lst_t w WHERE w.prjct_id = p.prjct_id AND w.a_in = 1) AS worker_count
  FROM ${schema}.wf_prjct_lst_t p WHERE p.a_in = 1 AND p.ownr_usr_id = $1 ORDER BY p.i_ts DESC`, [ownr], req);

exports.createProjectMdl = (ownr: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_prjct_lst_t (ownr_usr_id, nm_tx, lctn_lat, lctn_lng, lctn_lbl, notes_tx, sts_cd)
  VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'in_progress')) RETURNING prjct_id, nm_tx, sts_cd, i_ts`,
  [ownr, d.name, d.lat || null, d.lng || null, d.locationLabel || null, d.notes || null, d.status || null], req);

exports.updateProjectStatusMdl = (ownr: number, prjct: number, status: string, req?: any) => q(`
  UPDATE ${schema}.wf_prjct_lst_t SET sts_cd = $3
  WHERE prjct_id = $2 AND ownr_usr_id = $1 AND a_in = 1 RETURNING prjct_id, sts_cd`,
  [ownr, prjct, status], req);

// ── Supervisors ──
// suprvsr_cd (e.g. BLD-0001-S01) is auto-assigned by a BEFORE INSERT trigger.
exports.listSupervisorsMdl = (prjct: number, req?: any) => q(`
  SELECT suprvsr_id, suprvsr_cd, bldr_id, nm_tx, phone_tx, site_tx FROM ${schema}.wf_suprvsr_lst_t
  WHERE prjct_id = $1 AND a_in = 1 ORDER BY suprvsr_cd`, [prjct], req);

exports.addSupervisorMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_suprvsr_lst_t (prjct_id, nm_tx, phone_tx, site_tx)
  VALUES ($1,$2,$3,$4) RETURNING suprvsr_id, suprvsr_cd, bldr_id, nm_tx`,
  [prjct, d.name, d.phone || null, d.site || null], req);

// ── Workers ──
// emp_cd (e.g. BLD-0001-S01-E001) is auto-assigned by a BEFORE INSERT trigger.
exports.listWorkersMdl = (prjct: number, req?: any) => q(`
  SELECT workr_id, emp_cd, prjct_id, suprvsr_id, bldr_id, nm_tx, trade_tx, emoji_tx, day_rate_am, mobile_tx,
         skill_cd, joined_dt, upi_tx
  FROM ${schema}.wf_workr_lst_t WHERE prjct_id = $1 AND a_in = 1 ORDER BY emp_cd`, [prjct], req);

// Ghost-worker check — find already-enrolled active workers (in THIS owner's projects)
// that share an Aadhaar or mobile with the person being enrolled. Surfaced at enrolment
// so a duplicate can be caught before it becomes a duplicate wage. Scoped to the owner's
// own workforce so no other builder's PII leaks.
exports.checkDuplicateWorkerMdl = (ownr: number, aadhaar: string | null, mobile: string | null, req?: any) => q(`
  SELECT w.workr_id, w.emp_cd, w.nm_tx, w.trade_tx, w.mobile_tx, w.aadhaar_tx,
         w.prjct_id, p.nm_tx AS project_nm, w.suprvsr_id,
         CASE WHEN $2::text IS NOT NULL AND w.aadhaar_tx = $2 THEN 'aadhaar' ELSE 'mobile' END AS match_on
  FROM ${schema}.wf_workr_lst_t w
  JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = w.prjct_id
  WHERE w.a_in = 1 AND p.ownr_usr_id = $1
    AND ( ($2::text IS NOT NULL AND w.aadhaar_tx = $2)
       OR ($3::text IS NOT NULL AND w.mobile_tx = $3) )
  ORDER BY w.emp_cd`, [ownr, aadhaar, mobile], req);

exports.addWorkerMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_workr_lst_t
    (prjct_id, suprvsr_id, nm_tx, trade_tx, emoji_tx, day_rate_am, photo_url_tx, mobile_tx, dob_dt,
     gender_cd, addr_tx, skill_cd, joined_dt, aadhaar_tx, pan_tx, bank_nm_tx, acct_no_tx, ifsc_tx,
     upi_tx, emrgncy_nm_tx, emrgncy_phone_tx)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
  RETURNING workr_id, emp_cd, suprvsr_id, bldr_id, nm_tx, trade_tx`,
  [prjct, d.supervisorId || null, d.name, d.trade || null, d.emoji || null, d.dayRate || null,
   d.photo || null, d.mobile || null, d.dob || null, d.gender || null, d.address || null,
   d.skill || null, d.joinedOn || null, d.aadhaar || null, d.pan || null, d.bankName || null,
   d.accountNo || null, d.ifsc || null, d.upiId || null, d.emergencyName || null, d.emergencyPhone || null], req);

// ── Attendance ──
exports.getAttendanceMdl = (prjct: number, from: string, to: string, req?: any) => q(`
  SELECT workr_id, atndnc_dt, sts_cd, ot_hrs, dist_m, geo_ok_in, vrfy_sts_cd,
         selfie_url_tx, chk_in_lat, chk_in_lng, chk_in_ts
  FROM ${schema}.wf_atndnc_t
  WHERE prjct_id = $1 AND atndnc_dt BETWEEN $2 AND $3 ORDER BY atndnc_dt`, [prjct, from, to], req);

// A verified punch. The geofence check is computed server-side from the project's
// location + radius — the client's opinion is never trusted. dist_m is the haversine
// distance (metres) from the site; vrfy_sts is derived: verified (inside fence),
// flagged (outside), or manual (no GPS supplied). Selfie is stored for face review.
exports.markAttendanceMdl = (prjct: number, d: any, req?: any) => q(`
  WITH prj AS (
    SELECT lctn_lat, lctn_lng, geofence_m FROM ${schema}.wf_prjct_lst_t WHERE prjct_id = $1
  ),
  calc AS (
    SELECT geofence_m,
      CASE WHEN $6::numeric IS NULL OR lctn_lat IS NULL THEN NULL
        ELSE round((6371000 * 2 * asin(sqrt(
          power(sin(radians(($6::numeric - lctn_lat)/2)),2) +
          cos(radians(lctn_lat)) * cos(radians($6::numeric)) *
          power(sin(radians(($7::numeric - lctn_lng)/2)),2)
        )))::numeric, 2) END AS dist_m
    FROM prj
  )
  INSERT INTO ${schema}.wf_atndnc_t
    (prjct_id, workr_id, atndnc_dt, sts_cd, ot_hrs, chk_in_lat, chk_in_lng, dist_m, geo_ok_in,
     selfie_url_tx, vrfy_sts_cd, chk_in_ts, mrkd_by_usr_id)
  SELECT $1,$2,$3,$4,$5,$6,$7, c.dist_m,
    CASE WHEN c.dist_m IS NULL THEN NULL WHEN c.dist_m <= c.geofence_m THEN 1 ELSE 0 END,
    $8,
    CASE WHEN c.dist_m IS NULL THEN 'manual'
         WHEN c.dist_m <= c.geofence_m THEN 'verified' ELSE 'flagged' END,
    now(), $9
  FROM calc c
  ON CONFLICT (workr_id, atndnc_dt) DO UPDATE SET
    sts_cd = EXCLUDED.sts_cd, ot_hrs = EXCLUDED.ot_hrs,
    chk_in_lat = EXCLUDED.chk_in_lat, chk_in_lng = EXCLUDED.chk_in_lng, dist_m = EXCLUDED.dist_m,
    geo_ok_in = EXCLUDED.geo_ok_in,
    selfie_url_tx = COALESCE(EXCLUDED.selfie_url_tx, ${schema}.wf_atndnc_t.selfie_url_tx),
    vrfy_sts_cd = EXCLUDED.vrfy_sts_cd, chk_in_ts = EXCLUDED.chk_in_ts, mrkd_by_usr_id = EXCLUDED.mrkd_by_usr_id
  RETURNING id, workr_id, atndnc_dt, sts_cd, ot_hrs, dist_m, geo_ok_in, vrfy_sts_cd, selfie_url_tx, chk_in_ts`,
  [prjct, d.workerId, d.date, d.status || 'P', d.overtime || 0,
   d.lat ?? null, d.lng ?? null, d.selfie || null, d.markedBy || null], req);

// Digital muster roll for one month (param $2 = 'YYYY-MM'). One row per active worker,
// their marks folded into a day-of-month → {status, ot, verify} map, plus the totals a
// statutory register needs: paid days (P=1, H=0.5), OT hours, absent days, and how many
// punches were geo-verified vs flagged (the fraud signal).
exports.getMusterRollMdl = (prjct: number, month: string, req?: any) => q(`
  SELECT w.workr_id, w.emp_cd, w.nm_tx, w.trade_tx, w.skill_cd, w.day_rate_am,
    COALESCE(jsonb_object_agg(EXTRACT(DAY FROM a.atndnc_dt)::int,
        jsonb_build_object('s', a.sts_cd, 'ot', a.ot_hrs, 'v', a.vrfy_sts_cd))
        FILTER (WHERE a.atndnc_dt IS NOT NULL), '{}'::jsonb) AS days,
    COALESCE(SUM(CASE WHEN a.sts_cd='P' THEN 1 WHEN a.sts_cd='H' THEN 0.5 ELSE 0 END),0) AS paid_days,
    COALESCE(SUM(a.ot_hrs),0) AS ot_hours,
    COUNT(*) FILTER (WHERE a.sts_cd='A') AS absent_days,
    COUNT(*) FILTER (WHERE a.vrfy_sts_cd='verified') AS verified_cnt,
    COUNT(*) FILTER (WHERE a.vrfy_sts_cd='flagged')  AS flagged_cnt
  FROM ${schema}.wf_workr_lst_t w
  LEFT JOIN ${schema}.wf_atndnc_t a
    ON a.workr_id = w.workr_id AND to_char(a.atndnc_dt,'YYYY-MM') = $2
  WHERE w.prjct_id = $1 AND w.a_in = 1
  GROUP BY w.workr_id, w.emp_cd, w.nm_tx, w.trade_tx, w.skill_cd, w.day_rate_am
  ORDER BY w.emp_cd`, [prjct, month], req);

// ── Expenses ──
exports.listExpensesMdl = (prjct: number, req?: any) => q(`
  SELECT expns_id, ctgry_cd, ttl_tx, amt_am, expns_dt, paid_by_tx, setld_in, i_ts
  FROM ${schema}.wf_expns_t WHERE prjct_id = $1 ORDER BY expns_dt DESC, i_ts DESC`, [prjct], req);

exports.addExpenseMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_expns_t (prjct_id, ctgry_cd, ttl_tx, amt_am, expns_dt, paid_by_tx, setld_in, rcpt_url_tx)
  VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE),$6,$7,$8) RETURNING expns_id, ttl_tx, amt_am`,
  [prjct, d.category || 'misc', d.title, d.amount, d.date || null, d.paidBy || null, d.settled ? 1 : 0, d.receipt || null], req);

// ── Advances ──
exports.addAdvanceMdl = (workr: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_advnc_t (workr_id, amt_am, advnc_dt, note_tx)
  VALUES ($1,$2,COALESCE($3,CURRENT_DATE),$4) RETURNING advnc_id, amt_am, advnc_dt`,
  [workr, d.amount, d.date || null, d.note || null], req);

exports.listAdvancesMdl = (workr: number, req?: any) => q(`
  SELECT advnc_id, amt_am, advnc_dt, note_tx FROM ${schema}.wf_advnc_t
  WHERE workr_id = $1 ORDER BY advnc_dt DESC`, [workr], req);

// ── Payouts ──
exports.addPayoutMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_payout_t (prjct_id, workr_id, amt_am, period_key_tx, payout_dt)
  VALUES ($1,$2,$3,$4,COALESCE($5,CURRENT_DATE)) RETURNING payout_id, amt_am, payout_dt`,
  [prjct, d.workerId, d.amount, d.periodKey || null, d.date || null], req);

exports.listPayoutsMdl = (prjct: number, req?: any) => q(`
  SELECT p.payout_id, p.workr_id, w.nm_tx AS workr_nm, p.amt_am, p.period_key_tx, p.payout_dt
  FROM ${schema}.wf_payout_t p JOIN ${schema}.wf_workr_lst_t w ON w.workr_id = p.workr_id
  WHERE p.prjct_id = $1 ORDER BY p.payout_dt DESC`, [prjct], req);

// ── Contractors & billing ──
exports.listContractorsMdl = (prjct: number, req?: any) => q(`
  SELECT c.cntrctr_id, c.nm_tx, c.phone_tx, c.gst_tx, c.svc_chrg_pct, c.i_ts,
         (SELECT count(*) FROM ${schema}.wf_workr_lst_t w WHERE w.cntrctr_id = c.cntrctr_id AND w.a_in = 1) AS worker_count
  FROM ${schema}.wf_cntrctr_lst_t c WHERE c.prjct_id = $1 AND c.a_in = 1 ORDER BY c.nm_tx`, [prjct], req);

exports.addContractorMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_cntrctr_lst_t (prjct_id, nm_tx, phone_tx, gst_tx, svc_chrg_pct)
  VALUES ($1,$2,$3,$4,COALESCE($5,0)) RETURNING cntrctr_id, nm_tx, phone_tx, gst_tx, svc_chrg_pct`,
  [prjct, d.name, d.phone || null, d.gst || null, d.serviceChargePct ?? 0], req);

// Reconcile a contractor for a period straight from the muster: what their workers
// actually earned (verified attendance × day-rate + OT), plus their service charge.
// This is the "system truth" a claimed bill is checked against.
exports.reconcileContractorMdl = (cntrctr: number, from: string, to: string, req?: any) => q(`
  WITH wk AS (
    SELECT w.workr_id, w.day_rate_am,
      COALESCE(SUM(CASE WHEN a.sts_cd='P' THEN 1 WHEN a.sts_cd='H' THEN 0.5 ELSE 0 END),0) AS paid_days,
      COALESCE(SUM(a.ot_hrs),0) AS ot_hours
    FROM ${schema}.wf_workr_lst_t w
    LEFT JOIN ${schema}.wf_atndnc_t a ON a.workr_id = w.workr_id AND a.atndnc_dt BETWEEN $2 AND $3
    WHERE w.cntrctr_id = $1 AND w.a_in = 1
    GROUP BY w.workr_id, w.day_rate_am
  ), agg AS (
    SELECT COUNT(*) AS worker_cnt,
      COALESCE(SUM(paid_days),0) AS paid_days_am,
      COALESCE(SUM(paid_days * day_rate_am),0) AS wages_am,
      COALESCE(SUM(ot_hours * (day_rate_am/8.0) * 1.5),0) AS ot_am
    FROM wk
  )
  SELECT c.cntrctr_id, c.nm_tx, c.svc_chrg_pct,
    agg.worker_cnt, round(agg.paid_days_am,2) AS paid_days_am,
    round(agg.wages_am,2) AS wages_am, round(agg.ot_am,2) AS ot_am,
    round((agg.wages_am + agg.ot_am) * c.svc_chrg_pct / 100.0, 2) AS svc_chrg_am,
    round((agg.wages_am + agg.ot_am) * (1 + c.svc_chrg_pct / 100.0), 2) AS computed_am
  FROM ${schema}.wf_cntrctr_lst_t c, agg WHERE c.cntrctr_id = $1`, [cntrctr, from, to], req);

// Persist a bill — recomputes the muster figures server-side (never trusts a client
// total) and stores the variance against the contractor's claimed amount.
exports.createContractorBillMdl = (d: any, req?: any) => q(`
  WITH wk AS (
    SELECT w.workr_id, w.day_rate_am,
      COALESCE(SUM(CASE WHEN a.sts_cd='P' THEN 1 WHEN a.sts_cd='H' THEN 0.5 ELSE 0 END),0) AS paid_days,
      COALESCE(SUM(a.ot_hrs),0) AS ot_hours
    FROM ${schema}.wf_workr_lst_t w
    LEFT JOIN ${schema}.wf_atndnc_t a ON a.workr_id = w.workr_id AND a.atndnc_dt BETWEEN $2 AND $3
    WHERE w.cntrctr_id = $1 AND w.a_in = 1
    GROUP BY w.workr_id, w.day_rate_am
  ), agg AS (
    SELECT COUNT(*) AS worker_cnt,
      COALESCE(SUM(paid_days),0) AS paid_days_am,
      COALESCE(SUM(paid_days * day_rate_am),0) AS wages_am,
      COALESCE(SUM(ot_hours * (day_rate_am/8.0) * 1.5),0) AS ot_am
    FROM wk
  ), calc AS (
    SELECT c.prjct_id, c.svc_chrg_pct, agg.worker_cnt, agg.paid_days_am, agg.wages_am, agg.ot_am,
      round((agg.wages_am + agg.ot_am) * c.svc_chrg_pct / 100.0, 2) AS svc_chrg_am,
      round((agg.wages_am + agg.ot_am) * (1 + c.svc_chrg_pct / 100.0), 2) AS computed_am
    FROM ${schema}.wf_cntrctr_lst_t c, agg WHERE c.cntrctr_id = $1
  )
  INSERT INTO ${schema}.wf_cntrctr_bill_lst_t
    (cntrctr_id, prjct_id, period_from_dt, period_to_dt, worker_cnt, paid_days_am,
     wages_am, ot_am, svc_chrg_am, computed_am, claimed_am, variance_am, notes_tx)
  SELECT $1, calc.prjct_id, $2, $3, calc.worker_cnt, calc.paid_days_am,
    round(calc.wages_am,2), round(calc.ot_am,2), calc.svc_chrg_am, calc.computed_am,
    $4, CASE WHEN $4::numeric IS NULL THEN NULL ELSE round($4::numeric - calc.computed_am, 2) END, $5
  FROM calc
  RETURNING bill_id, cntrctr_id, prjct_id, period_from_dt, period_to_dt, worker_cnt,
            paid_days_am, wages_am, ot_am, svc_chrg_am, computed_am, claimed_am, variance_am, sts_cd`,
  [d.contractorId, d.from, d.to, d.claimedAmount ?? null, d.notes || null], req);

exports.listContractorBillsMdl = (prjct: number, req?: any) => q(`
  SELECT b.bill_id, b.cntrctr_id, c.nm_tx AS cntrctr_nm, b.period_from_dt, b.period_to_dt,
         b.worker_cnt, b.paid_days_am, b.wages_am, b.ot_am, b.svc_chrg_am, b.computed_am,
         b.claimed_am, b.variance_am, b.sts_cd, b.notes_tx, b.i_ts
  FROM ${schema}.wf_cntrctr_bill_lst_t b JOIN ${schema}.wf_cntrctr_lst_t c ON c.cntrctr_id = b.cntrctr_id
  WHERE b.prjct_id = $1 AND b.a_in = 1 ORDER BY b.i_ts DESC`, [prjct], req);

exports.setContractorBillStatusMdl = (bill: number, status: string, req?: any) => q(`
  UPDATE ${schema}.wf_cntrctr_bill_lst_t SET sts_cd = $2 WHERE bill_id = $1 AND a_in = 1
  RETURNING bill_id, sts_cd`, [bill, status], req);

// ── Digital Worker Passport ──
// The person's aggregated record, resolved across every enrolment that shares their
// Aadhaar (falls back to the single worker row when no Aadhaar). Returns one row:
// identity + lifetime stats (projects, builders, tenure) + attendance reliability +
// the verified-punch trust ratio that only Nirmanam can offer.
exports.getWorkerPassportMdl = (workr: number, req?: any) => q(`
  WITH me AS (
    SELECT workr_id, aadhaar_tx, mobile_tx, nm_tx, trade_tx, skill_cd, photo_url_tx, emp_cd
    FROM ${schema}.wf_workr_lst_t WHERE workr_id = $1
  ),
  kin AS (
    SELECT w.workr_id, w.prjct_id, w.bldr_id, w.joined_dt
    FROM ${schema}.wf_workr_lst_t w, me
    WHERE w.a_in = 1 AND (
      (me.aadhaar_tx IS NOT NULL AND w.aadhaar_tx = me.aadhaar_tx)
      OR (me.aadhaar_tx IS NULL AND w.workr_id = me.workr_id)
    )
  ),
  att AS (
    SELECT
      COUNT(*) FILTER (WHERE a.sts_cd IN ('P','H','A','L')) AS marked_days,
      COALESCE(SUM(CASE WHEN a.sts_cd='P' THEN 1 WHEN a.sts_cd='H' THEN 0.5 ELSE 0 END),0) AS present_days,
      COUNT(*) FILTER (WHERE a.vrfy_sts_cd = 'verified') AS verified_cnt,
      COUNT(*) FILTER (WHERE a.vrfy_sts_cd = 'flagged')  AS flagged_cnt
    FROM ${schema}.wf_atndnc_t a WHERE a.workr_id IN (SELECT workr_id FROM kin)
  )
  SELECT me.workr_id, me.nm_tx, me.trade_tx, me.skill_cd, me.photo_url_tx, me.emp_cd, me.mobile_tx,
    (SELECT COUNT(DISTINCT prjct_id) FROM kin) AS projects_cnt,
    (SELECT COUNT(DISTINCT bldr_id)  FROM kin) AS builders_cnt,
    (SELECT MIN(joined_dt) FROM kin) AS first_joined_dt,
    att.marked_days, att.present_days, att.verified_cnt, att.flagged_cnt
  FROM me, att`, [workr], req);

exports.listWorkerCertsMdl = (workr: number, req?: any) => q(`
  SELECT c.cert_id, c.nm_tx, c.issuer_tx, c.issued_dt, c.expiry_dt, c.doc_url_tx, c.vrfy_in, c.i_ts
  FROM ${schema}.wf_workr_cert_lst_t c
  WHERE c.a_in = 1 AND (
    c.workr_id = $1
    OR c.aadhaar_tx = (SELECT aadhaar_tx FROM ${schema}.wf_workr_lst_t WHERE workr_id = $1)
  )
  ORDER BY c.issued_dt DESC NULLS LAST, c.i_ts DESC`, [workr], req);

exports.addWorkerCertMdl = (workr: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_workr_cert_lst_t (workr_id, aadhaar_tx, nm_tx, issuer_tx, issued_dt, expiry_dt, doc_url_tx, vrfy_in)
  VALUES ($1, (SELECT aadhaar_tx FROM ${schema}.wf_workr_lst_t WHERE workr_id = $1), $2,$3,$4,$5,$6,COALESCE($7,0))
  RETURNING cert_id, nm_tx, issuer_tx, issued_dt, expiry_dt, vrfy_in`,
  [workr, d.name, d.issuer || null, d.issuedOn || null, d.expiresOn || null, d.docUrl || null, d.verified ? 1 : 0], req);

// ── Statutory compliance (PF / ESI / BOCW) ──
// For a project + month, join the muster to the statutory param table and produce a
// per-worker compliance line: gross (from verified attendance), PF (employee+employer,
// capped at the PF ceiling), ESI (only when gross ≤ the ESI ceiling), and net-in-hand.
// Rates are read from cmplnc_param_lst_t so a statute change never touches code.
exports.computeComplianceMdl = (prjct: number, month: string, req?: any) => q(`
  WITH cfg AS (
    SELECT
      max(param_val) FILTER (WHERE param_cd='PF_RATE')        AS pf_rate,
      max(param_val) FILTER (WHERE param_cd='PF_CEILING')     AS pf_ceiling,
      max(param_val) FILTER (WHERE param_cd='ESI_EMP_RATE')   AS esi_emp_rate,
      max(param_val) FILTER (WHERE param_cd='ESI_ER_RATE')    AS esi_er_rate,
      max(param_val) FILTER (WHERE param_cd='ESI_CEILING')    AS esi_ceiling,
      max(param_val) FILTER (WHERE param_cd='BOCW_CESS_RATE') AS bocw_rate
    FROM ${schema}.cmplnc_param_lst_t WHERE a_in = 1
  ),
  wk AS (
    SELECT w.workr_id, w.emp_cd, w.nm_tx, w.trade_tx, w.day_rate_am,
      COALESCE(SUM(CASE WHEN a.sts_cd='P' THEN 1 WHEN a.sts_cd='H' THEN 0.5 ELSE 0 END),0) AS paid_days,
      COALESCE(SUM(a.ot_hrs),0) AS ot_hours
    FROM ${schema}.wf_workr_lst_t w
    LEFT JOIN ${schema}.wf_atndnc_t a ON a.workr_id = w.workr_id AND to_char(a.atndnc_dt,'YYYY-MM') = $2
    WHERE w.prjct_id = $1 AND w.a_in = 1
    GROUP BY w.workr_id, w.emp_cd, w.nm_tx, w.trade_tx, w.day_rate_am
  ),
  g AS (
    SELECT wk.*, round(wk.paid_days * wk.day_rate_am + wk.ot_hours * (wk.day_rate_am/8.0) * 1.5, 2) AS gross_am
    FROM wk
  )
  SELECT g.workr_id, g.emp_cd, g.nm_tx, g.trade_tx, g.paid_days, g.ot_hours, g.gross_am,
    round(LEAST(g.gross_am, cfg.pf_ceiling) * cfg.pf_rate / 100.0, 2) AS pf_employee_am,
    round(LEAST(g.gross_am, cfg.pf_ceiling) * cfg.pf_rate / 100.0, 2) AS pf_employer_am,
    (g.gross_am <= cfg.esi_ceiling) AS esi_applicable,
    CASE WHEN g.gross_am <= cfg.esi_ceiling THEN round(g.gross_am * cfg.esi_emp_rate / 100.0, 2) ELSE 0 END AS esi_employee_am,
    CASE WHEN g.gross_am <= cfg.esi_ceiling THEN round(g.gross_am * cfg.esi_er_rate  / 100.0, 2) ELSE 0 END AS esi_employer_am,
    round(g.gross_am
          - LEAST(g.gross_am, cfg.pf_ceiling) * cfg.pf_rate / 100.0
          - CASE WHEN g.gross_am <= cfg.esi_ceiling THEN g.gross_am * cfg.esi_emp_rate / 100.0 ELSE 0 END, 2) AS net_am,
    cfg.bocw_rate
  FROM g, cfg
  ORDER BY g.emp_cd`, [prjct, month], req);

// ── Daily Progress Report + cost tracking ──
exports.listDprMdl = (prjct: number, req?: any) => q(`
  SELECT dpr_id, dpr_dt, manpower_cnt, wthr_tx, activities_tx, issues_tx, materials_tx, photo_url_tx, i_ts
  FROM ${schema}.wf_dpr_lst_t WHERE prjct_id = $1 AND a_in = 1 ORDER BY dpr_dt DESC, i_ts DESC`, [prjct], req);

// Manpower defaults to the present-count from the muster for that day if not supplied.
exports.addDprMdl = (prjct: number, d: any, userId: number, req?: any) => q(`
  INSERT INTO ${schema}.wf_dpr_lst_t
    (prjct_id, dpr_dt, manpower_cnt, wthr_tx, activities_tx, issues_tx, materials_tx, photo_url_tx, crtd_by_usr_id)
  VALUES ($1, COALESCE($2,CURRENT_DATE),
    COALESCE($3, (SELECT COUNT(*) FROM ${schema}.wf_atndnc_t a
                  WHERE a.prjct_id = $1 AND a.atndnc_dt = COALESCE($2,CURRENT_DATE) AND a.sts_cd IN ('P','H'))),
    $4,$5,$6,$7,$8,$9)
  RETURNING dpr_id, dpr_dt, manpower_cnt`,
  [prjct, d.date || null, d.manpower ?? null, d.weather || null, d.activities || null,
   d.issues || null, d.materials || null, d.photo || null, userId], req);

// Budget-vs-actual: labour cost from the muster + expenses by category + project budget.
// Optional $2 = 'YYYY-MM' to scope to a month (null = project lifetime).
exports.getCostSummaryMdl = (prjct: number, month: string | null, req?: any) => q(`
  WITH labour AS (
    SELECT COALESCE(SUM(
      CASE WHEN a.sts_cd='P' THEN w.day_rate_am WHEN a.sts_cd='H' THEN w.day_rate_am/2 ELSE 0 END
      + a.ot_hrs * (w.day_rate_am/8.0) * 1.5), 0) AS labour_am
    FROM ${schema}.wf_atndnc_t a JOIN ${schema}.wf_workr_lst_t w ON w.workr_id = a.workr_id
    WHERE a.prjct_id = $1 AND ($2::text IS NULL OR to_char(a.atndnc_dt,'YYYY-MM') = $2)
  ),
  exp AS (
    SELECT ctgry_cd, COALESCE(SUM(amt_am),0) AS amt
    FROM ${schema}.wf_expns_t
    WHERE prjct_id = $1 AND ($2::text IS NULL OR to_char(expns_dt,'YYYY-MM') = $2)
    GROUP BY ctgry_cd
  )
  SELECT
    (SELECT budget_am FROM ${schema}.wf_prjct_lst_t WHERE prjct_id = $1) AS budget_am,
    (SELECT round(labour_am,2) FROM labour) AS labour_am,
    COALESCE((SELECT amt FROM exp WHERE ctgry_cd='material'),0)  AS material_am,
    COALESCE((SELECT amt FROM exp WHERE ctgry_cd='equipment'),0) AS equipment_am,
    COALESCE((SELECT amt FROM exp WHERE ctgry_cd='transport'),0) AS transport_am,
    COALESCE((SELECT amt FROM exp WHERE ctgry_cd='misc'),0)      AS misc_am,
    COALESCE((SELECT SUM(amt) FROM exp),0) AS expenses_am`, [prjct, month], req);

exports.setProjectBudgetMdl = (ownr: number, prjct: number, budget: number, req?: any) => q(`
  UPDATE ${schema}.wf_prjct_lst_t SET budget_am = $3
  WHERE prjct_id = $2 AND ownr_usr_id = $1 AND a_in = 1 RETURNING prjct_id, budget_am`,
  [ownr, prjct, budget], req);

// ── Safety & incidents ──
exports.listIncidentsMdl = (prjct: number, req?: any) => q(`
  SELECT i.incdnt_id, i.incdnt_dt, i.type_cd, i.svrty_cd, i.workr_id, w.nm_tx AS workr_nm,
         i.descr_tx, i.action_tx, i.photo_url_tx, i.sts_cd, i.i_ts
  FROM ${schema}.wf_incdnt_lst_t i
  LEFT JOIN ${schema}.wf_workr_lst_t w ON w.workr_id = i.workr_id
  WHERE i.prjct_id = $1 AND i.a_in = 1 ORDER BY i.incdnt_dt DESC, i.i_ts DESC`, [prjct], req);

exports.addIncidentMdl = (prjct: number, d: any, userId: number, req?: any) => q(`
  INSERT INTO ${schema}.wf_incdnt_lst_t
    (prjct_id, incdnt_dt, type_cd, svrty_cd, workr_id, descr_tx, action_tx, photo_url_tx, rptd_by_usr_id)
  VALUES ($1, COALESCE($2,CURRENT_DATE), $3, COALESCE($4,'low'), $5, $6, $7, $8, $9)
  RETURNING incdnt_id, incdnt_dt, type_cd, svrty_cd, sts_cd`,
  [prjct, d.date || null, d.type, d.severity || null, d.workerId || null, d.description,
   d.action || null, d.photo || null, userId], req);

exports.setIncidentStatusMdl = (incdnt: number, status: string, req?: any) => q(`
  UPDATE ${schema}.wf_incdnt_lst_t SET sts_cd = $2 WHERE incdnt_id = $1 AND a_in = 1
  RETURNING incdnt_id, sts_cd`, [incdnt, status], req);

// Site safety scorecard: total/open counts, open-by-severity, and days since the last
// incident (the number that goes on the site board).
exports.getSafetySummaryMdl = (prjct: number, req?: any) => q(`
  SELECT
    COUNT(*) AS total_cnt,
    COUNT(*) FILTER (WHERE sts_cd='open') AS open_cnt,
    COUNT(*) FILTER (WHERE sts_cd='open' AND svrty_cd IN ('high','critical')) AS open_serious_cnt,
    COUNT(*) FILTER (WHERE svrty_cd='critical') AS critical_cnt,
    COUNT(*) FILTER (WHERE type_cd='ppe_violation') AS ppe_cnt,
    (CURRENT_DATE - MAX(incdnt_dt)) AS days_since_last
  FROM ${schema}.wf_incdnt_lst_t WHERE prjct_id = $1 AND a_in = 1`, [prjct], req);

// ── Management KPIs / dashboard ──
// One-shot project scorecard for a month: headcount, present-today, the month's wage
// bill, the verified/flagged punch split (fraud health), open + serious incidents, and
// contractor bills that over-claim and still await action. Powers the PM dashboard and
// the "needs attention" inbox (the pragmatic approvals surface).
exports.getProjectKpisMdl = (prjct: number, month: string, req?: any) => q(`
  SELECT
    (SELECT COUNT(*) FROM ${schema}.wf_workr_lst_t w WHERE w.prjct_id=$1 AND w.a_in=1) AS worker_cnt,
    (SELECT COUNT(*) FROM ${schema}.wf_atndnc_t a WHERE a.prjct_id=$1 AND a.atndnc_dt=CURRENT_DATE AND a.sts_cd IN ('P','H')) AS present_today,
    (SELECT COALESCE(round(SUM(
        CASE WHEN a.sts_cd='P' THEN w.day_rate_am WHEN a.sts_cd='H' THEN w.day_rate_am/2 ELSE 0 END
        + a.ot_hrs*(w.day_rate_am/8.0)*1.5),2),0)
      FROM ${schema}.wf_atndnc_t a JOIN ${schema}.wf_workr_lst_t w ON w.workr_id=a.workr_id
      WHERE a.prjct_id=$1 AND to_char(a.atndnc_dt,'YYYY-MM')=$2) AS month_wage_am,
    (SELECT COUNT(*) FROM ${schema}.wf_atndnc_t a WHERE a.prjct_id=$1 AND to_char(a.atndnc_dt,'YYYY-MM')=$2 AND a.vrfy_sts_cd='verified') AS verified_cnt,
    (SELECT COUNT(*) FROM ${schema}.wf_atndnc_t a WHERE a.prjct_id=$1 AND to_char(a.atndnc_dt,'YYYY-MM')=$2 AND a.vrfy_sts_cd='flagged') AS flagged_cnt,
    (SELECT COUNT(*) FROM ${schema}.wf_incdnt_lst_t i WHERE i.prjct_id=$1 AND i.a_in=1 AND i.sts_cd='open') AS open_incidents,
    (SELECT COUNT(*) FROM ${schema}.wf_incdnt_lst_t i WHERE i.prjct_id=$1 AND i.a_in=1 AND i.sts_cd='open' AND i.svrty_cd IN ('high','critical')) AS serious_incidents,
    (SELECT COUNT(*) FROM ${schema}.wf_cntrctr_bill_lst_t b WHERE b.prjct_id=$1 AND b.a_in=1 AND b.variance_am > 0 AND b.sts_cd NOT IN ('paid','disputed')) AS overclaim_bills,
    (SELECT budget_am FROM ${schema}.wf_prjct_lst_t WHERE prjct_id=$1) AS budget_am`, [prjct, month], req);

// ── AI insights (grounded analytics over real workforce data) ──
// Attendance fraud: workers whose punches were flagged outside the geofence this month,
// ranked by flagged ratio (the higher the ratio, the more suspicious).
exports.detectAttendanceFraudMdl = (prjct: number, month: string, req?: any) => q(`
  SELECT w.workr_id, w.emp_cd, w.nm_tx,
    COUNT(*) FILTER (WHERE a.vrfy_sts_cd='flagged')  AS flagged_cnt,
    COUNT(*) FILTER (WHERE a.vrfy_sts_cd IN ('verified','flagged')) AS gps_cnt,
    round(COUNT(*) FILTER (WHERE a.vrfy_sts_cd='flagged')::numeric
          / NULLIF(COUNT(*) FILTER (WHERE a.vrfy_sts_cd IN ('verified','flagged')),0) * 100, 0) AS flagged_pct
  FROM ${schema}.wf_workr_lst_t w
  JOIN ${schema}.wf_atndnc_t a ON a.workr_id=w.workr_id AND to_char(a.atndnc_dt,'YYYY-MM')=$2
  WHERE w.prjct_id=$1 AND w.a_in=1
  GROUP BY w.workr_id, w.emp_cd, w.nm_tx
  HAVING COUNT(*) FILTER (WHERE a.vrfy_sts_cd='flagged') > 0
  ORDER BY flagged_pct DESC NULLS LAST, flagged_cnt DESC LIMIT 20`, [prjct, month], req);

// Duplicate identities among active workers on this project (ghost-worker signal).
exports.detectDuplicatesInProjectMdl = (prjct: number, req?: any) => q(`
  SELECT key_tx AS identity, match_on, array_agg(nm_tx) AS names, array_agg(emp_cd) AS codes, COUNT(*) AS cnt FROM (
    SELECT aadhaar_tx AS key_tx, 'aadhaar' AS match_on, nm_tx, emp_cd FROM ${schema}.wf_workr_lst_t
      WHERE prjct_id=$1 AND a_in=1 AND aadhaar_tx IS NOT NULL
    UNION ALL
    SELECT mobile_tx AS key_tx, 'mobile' AS match_on, nm_tx, emp_cd FROM ${schema}.wf_workr_lst_t
      WHERE prjct_id=$1 AND a_in=1 AND mobile_tx IS NOT NULL
  ) s GROUP BY key_tx, match_on HAVING COUNT(*) > 1 ORDER BY cnt DESC LIMIT 20`, [prjct], req);

// Labour forecast: average present headcount over the last 21 days that had any
// attendance, as the suggested manpower for planning.
exports.forecastManpowerMdl = (prjct: number, req?: any) => q(`
  WITH daily AS (
    SELECT atndnc_dt, COUNT(*) FILTER (WHERE sts_cd IN ('P','H')) AS present
    FROM ${schema}.wf_atndnc_t
    WHERE prjct_id=$1 AND atndnc_dt >= CURRENT_DATE - INTERVAL '21 days'
    GROUP BY atndnc_dt HAVING COUNT(*) > 0
  )
  SELECT COALESCE(round(AVG(present)),0) AS avg_present, COALESCE(MAX(present),0) AS peak_present, COUNT(*) AS days_sampled
  FROM daily`, [prjct], req);

// Contractor rating from reconciliation history: bill count, average over-claim %,
// dispute rate. Lower avg over-claim + fewer disputes ⇒ more trustworthy.
exports.rateContractorsMdl = (prjct: number, req?: any) => q(`
  SELECT c.cntrctr_id, c.nm_tx,
    COUNT(b.bill_id) AS bills,
    COALESCE(round(AVG(CASE WHEN b.claimed_am>0 THEN b.variance_am/b.claimed_am*100 END),1),0) AS avg_overclaim_pct,
    COUNT(*) FILTER (WHERE b.sts_cd='disputed') AS disputes
  FROM ${schema}.wf_cntrctr_lst_t c
  LEFT JOIN ${schema}.wf_cntrctr_bill_lst_t b ON b.cntrctr_id=c.cntrctr_id AND b.a_in=1
  WHERE c.prjct_id=$1 AND c.a_in=1
  GROUP BY c.cntrctr_id, c.nm_tx ORDER BY avg_overclaim_pct DESC`, [prjct], req);

// Payroll audit: workers missing payout details or whose month advances exceed earnings.
exports.auditPayrollMdl = (prjct: number, month: string, req?: any) => q(`
  WITH earn AS (
    SELECT w.workr_id, w.nm_tx, w.emp_cd, w.upi_tx, w.acct_no_tx, w.aadhaar_tx,
      COALESCE(round(SUM(CASE WHEN a.sts_cd='P' THEN w.day_rate_am WHEN a.sts_cd='H' THEN w.day_rate_am/2 ELSE 0 END
        + a.ot_hrs*(w.day_rate_am/8.0)*1.5),2),0) AS earned_am
    FROM ${schema}.wf_workr_lst_t w
    LEFT JOIN ${schema}.wf_atndnc_t a ON a.workr_id=w.workr_id AND to_char(a.atndnc_dt,'YYYY-MM')=$2
    WHERE w.prjct_id=$1 AND w.a_in=1
    GROUP BY w.workr_id, w.nm_tx, w.emp_cd, w.upi_tx, w.acct_no_tx, w.aadhaar_tx
  ), adv AS (
    SELECT workr_id, COALESCE(SUM(amt_am),0) AS advance_am FROM ${schema}.wf_advnc_t
    WHERE to_char(advnc_dt,'YYYY-MM')=$2 GROUP BY workr_id
  )
  SELECT e.workr_id, e.nm_tx, e.emp_cd, e.earned_am, COALESCE(a.advance_am,0) AS advance_am,
    (e.upi_tx IS NULL AND e.acct_no_tx IS NULL) AS missing_payment,
    (e.aadhaar_tx IS NULL) AS missing_kyc,
    (COALESCE(a.advance_am,0) > e.earned_am) AS advance_over_earning
  FROM earn e LEFT JOIN adv a ON a.workr_id=e.workr_id
  WHERE (e.upi_tx IS NULL AND e.acct_no_tx IS NULL) OR e.aadhaar_tx IS NULL OR COALESCE(a.advance_am,0) > e.earned_am
  ORDER BY advance_over_earning DESC, missing_payment DESC LIMIT 30`, [prjct, month], req);

// ── Flats / units + sales (035) ──
exports.assertUnitOwnerMdl = (ownr: number, unit: number, req?: any) => q(
  `SELECT u.unit_id FROM ${schema}.wf_unit_lst_t u
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = u.prjct_id
   WHERE u.unit_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [unit, ownr], req);

exports.listUnitsMdl = (prjct: number, req?: any) => q(`
  SELECT u.unit_id, u.prjct_id, u.floor_no, u.flat_no_tx, u.unit_type_tx, u.area_sqft, u.price_am,
         u.sts_cd, u.buyer_nm_tx, u.buyer_phone_tx, u.amt_rcvd_am, u.booked_dt, u.sold_dt, u.regd_dt, u.notes_tx, u.i_ts,
         (SELECT count(*) FROM ${schema}.wf_unit_doc_lst_t d WHERE d.unit_id = u.unit_id) AS doc_count
  FROM ${schema}.wf_unit_lst_t u WHERE u.prjct_id = $1 AND u.a_in = 1
  ORDER BY u.floor_no DESC, u.flat_no_tx ASC`, [prjct], req);

exports.addUnitMdl = (prjct: number, d: any, req?: any) => q(`
  INSERT INTO ${schema}.wf_unit_lst_t
    (prjct_id, floor_no, flat_no_tx, unit_type_tx, area_sqft, price_am, sts_cd, buyer_nm_tx, buyer_phone_tx, amt_rcvd_am, booked_dt, sold_dt, regd_dt, notes_tx)
  VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'available'),$8,$9,$10,$11,$12,$13,$14)
  RETURNING *`,
  [prjct, d.floor || 0, d.number, d.unitType || null, d.areaSqft || null, d.price || null, d.status || null,
   d.buyerName || null, d.buyerPhone || null, d.amountReceived || null, d.bookedOn || null, d.soldOn || null, d.registeredOn || null, d.notes || null], req);

exports.updateUnitMdl = (unit: number, d: any, req?: any) => q(`
  UPDATE ${schema}.wf_unit_lst_t SET
    floor_no      = COALESCE($2, floor_no),
    flat_no_tx    = COALESCE($3, flat_no_tx),
    unit_type_tx  = COALESCE($4, unit_type_tx),
    area_sqft     = COALESCE($5, area_sqft),
    price_am      = COALESCE($6, price_am),
    sts_cd        = COALESCE($7, sts_cd),
    buyer_nm_tx   = COALESCE($8, buyer_nm_tx),
    buyer_phone_tx= COALESCE($9, buyer_phone_tx),
    amt_rcvd_am   = COALESCE($10, amt_rcvd_am),
    booked_dt     = COALESCE($11, booked_dt),
    sold_dt       = COALESCE($12, sold_dt),
    regd_dt       = COALESCE($13, regd_dt),
    notes_tx      = COALESCE($14, notes_tx)
  WHERE unit_id = $1 AND a_in = 1 RETURNING *`,
  [unit, d.floor ?? null, d.number ?? null, d.unitType ?? null, d.areaSqft ?? null, d.price ?? null, d.status ?? null,
   d.buyerName ?? null, d.buyerPhone ?? null, d.amountReceived ?? null, d.bookedOn ?? null, d.soldOn ?? null, d.registeredOn ?? null, d.notes ?? null], req);

exports.removeUnitMdl = (unit: number, req?: any) => q(
  `UPDATE ${schema}.wf_unit_lst_t SET a_in = 0 WHERE unit_id = $1 RETURNING unit_id`, [unit], req);

exports.listUnitDocsMdl = (unit: number, req?: any) => q(
  `SELECT doc_id, unit_id, nm_tx, kind_cd, url_tx, i_ts FROM ${schema}.wf_unit_doc_lst_t WHERE unit_id = $1 ORDER BY i_ts DESC`, [unit], req);

exports.addUnitDocMdl = (unit: number, d: any, req?: any) => q(
  `INSERT INTO ${schema}.wf_unit_doc_lst_t (unit_id, nm_tx, kind_cd, url_tx) VALUES ($1,$2,$3,$4) RETURNING *`,
  [unit, d.name, d.kind || null, d.url || null], req);

exports.removeUnitDocMdl = (docId: number, req?: any) => q(
  `DELETE FROM ${schema}.wf_unit_doc_lst_t WHERE doc_id = $1 RETURNING doc_id`, [docId], req);

exports.assertUnitDocOwnerMdl = (ownr: number, docId: number, req?: any) => q(
  `SELECT d.doc_id FROM ${schema}.wf_unit_doc_lst_t d
   JOIN ${schema}.wf_unit_lst_t u ON u.unit_id = d.unit_id
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = u.prjct_id
   WHERE d.doc_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [docId, ownr], req);

exports.salesSummaryMdl = (prjct: number, req?: any) => q(`
  SELECT count(*) AS total_units,
         count(*) FILTER (WHERE sts_cd IN ('sold','registered')) AS sold_units,
         count(*) FILTER (WHERE sts_cd = 'booked') AS booked_units,
         count(*) FILTER (WHERE sts_cd = 'available') AS available_units,
         COALESCE(sum(amt_rcvd_am),0) AS revenue_received_am,
         COALESCE(sum(price_am),0) AS inventory_value_am
  FROM ${schema}.wf_unit_lst_t WHERE prjct_id = $1 AND a_in = 1`, [prjct], req);

// ── Staged project documents (permission → completion → sales) ──
exports.listProjectDocsMdl = (prjct: number, req?: any) => q(
  `SELECT doc_id, prjct_id, stage_cd, kind_cd, nm_tx, url_tx, issued_dt, i_ts
   FROM ${schema}.wf_prjct_doc_lst_t WHERE prjct_id = $1 AND a_in = 1 ORDER BY i_ts DESC`, [prjct], req);

exports.addProjectDocMdl = (prjct: number, d: any, req?: any) => q(
  `INSERT INTO ${schema}.wf_prjct_doc_lst_t (prjct_id, stage_cd, kind_cd, nm_tx, url_tx, issued_dt)
   VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [prjct, d.stage || 'approvals', d.kind || null, d.name, d.url || null, d.issuedOn || null], req);

exports.removeProjectDocMdl = (docId: number, req?: any) => q(
  `UPDATE ${schema}.wf_prjct_doc_lst_t SET a_in = 0 WHERE doc_id = $1 RETURNING doc_id`, [docId], req);

exports.assertProjectDocOwnerMdl = (ownr: number, docId: number, req?: any) => q(
  `SELECT d.doc_id FROM ${schema}.wf_prjct_doc_lst_t d
   JOIN ${schema}.wf_prjct_lst_t p ON p.prjct_id = d.prjct_id
   WHERE d.doc_id = $1 AND p.ownr_usr_id = $2 AND p.a_in = 1`, [docId, ownr], req);

// ── Multi-site: shift a worker to another site (+ audit history) ──
exports.moveWorkerMdl = async (ownr: number, workr: number, toPrjct: number, toSuprvsr: number | null, req?: any) => {
  const cur = await q(`SELECT prjct_id FROM ${schema}.wf_workr_lst_t WHERE workr_id = $1`, [workr], req);
  const fromPrjct = cur[0]?.prjct_id ?? null;
  await q(`INSERT INTO ${schema}.wf_asgnmnt_hstry_t (workr_id, from_prjct_id, to_prjct_id, moved_by_usr_id) VALUES ($1,$2,$3,$4)`,
    [workr, fromPrjct, toPrjct, ownr], req);
  return q(`UPDATE ${schema}.wf_workr_lst_t SET prjct_id = $2, suprvsr_id = $3 WHERE workr_id = $1 RETURNING workr_id, prjct_id, suprvsr_id`,
    [workr, toPrjct, toSuprvsr], req);
};

exports.listWorkerAssignmentsMdl = (workr: number, req?: any) => q(
  `SELECT asgnmnt_id, from_prjct_id, to_prjct_id, i_ts FROM ${schema}.wf_asgnmnt_hstry_t WHERE workr_id = $1 ORDER BY i_ts DESC`, [workr], req);
