# Nirmaan — Database Tables

All tables live in the **`nirmaan`** schema and are created by the SQL migrations in
[`migrations/`](./migrations), applied in filename order by [`run.ts`](./run.ts).

- **79** application tables (listed below)
- **+1** `_migrations_t` — bookkeeping table the runner creates automatically to track
  which migrations have already applied.

Everything here is committed to the repo, so a fresh clone can recreate the entire
database from scratch — no manual table creation needed.

---

## Get all tables (fresh clone → full DB)

```bash
cd backend
cp .env.example .env          # set PG_HOST / PG_PORT / PG_USER / PG_PASSWORD / PG_DATABASE
npm install
npm run keys                  # RS256 JWT key pair
createdb nirmaan              # or: psql -c 'CREATE DATABASE nirmaan;'
npm run db:migrate            # creates all 79 tables (runs every migrations/*.sql in order)
npm run db:seed               # loads archetypes, roles, menus, catalog, demo users
```

One-shot: `npm run keys && createdb nirmaan && npm run db:setup`  (`db:setup` = migrate + seed).

| Command | What it does |
|---------|--------------|
| `npm run db:migrate` | Applies pending migrations only (skips already-applied ones). Idempotent. |
| `npm run db:seed`    | Runs all seed files (idempotent; safe to re-run). |
| `npm run db:reset`   | **DROPs the `nirmaan` schema (CASCADE)** then re-migrates + re-seeds from scratch. |

Verify the count after migrating:

```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'nirmaan' AND table_type = 'BASE TABLE';
-- → 80  (79 app tables + _migrations_t)
```

---

## Table catalog (by domain)

### Foundation — auth, identity, RBAC, navigation  (migrations 001–004)
| Table | Purpose |
|-------|---------|
| `user_session_t` | express-session store (connect-pg-simple) |
| `usr_lst_t` | Users (accounts) |
| `usr_otp_t` | Phone OTP codes |
| `usr_lgn_hstry_dtl_t` | Login history |
| `usr_lang_rel_t` | User ↔ language |
| `usr_skll_rel_t` | User ↔ skill |
| `rle_lst_t` | Roles |
| `archtyp_lst_t` | Archetypes (user personas) |
| `cpblty_lst_t` | Capabilities (permissions) |
| `dprtmnt_lst_t` | Departments |
| `dsgntn_lst_t` | Designations |
| `archtyp_cpblty_rel_t` | Archetype ↔ capability |
| `usr_rle_rel_t` | User ↔ role |
| `usr_dprtmnt_rel_t` | User ↔ department |
| `mnu_itm_lst_t` | Menu items (bottom tabs + side drawer) |
| `archtyp_mnu_itm_rel_t` | Archetype ↔ menu item |
| `mnu_itm_archtyp_rel_t` | Menu item ↔ archetype (gating) |

### Requirements & services  (migration 005, 041)
| Table | Purpose |
|-------|---------|
| `srvc_type_lst_t` | Service / trade types |
| `rqrmnt_lst_t` | Requirements (projects posted) |
| `rqrmnt_rspns_t` | Bids / responses to requirements |
| `rqrmnt_invit_t` | Requirement invitations |

### Hiring & jobs  (migrations 006–007)
| Table | Purpose |
|-------|---------|
| `mkt_rate_lst_t` | Market wage rates |
| `job_lst_t` | Job posts |
| `job_aplctn_t` | Job applications |
| `job_svd_rel_t` | Saved jobs |

### Bookings  (migration 008)
| Table | Purpose |
|-------|---------|
| `bookng_lst_t` | Service bookings |

### Materials, storefront & orders  (migrations 009, 050, 051, 054)
| Table | Purpose |
|-------|---------|
| `mtrl_ctgry_lst_t` | Material categories |
| `mtrl_item_lst_t` | Material items / products |
| `mtrl_ordr_lst_t` | Material orders |
| `mtrl_ordr_item_t` | Order line items |
| `mtrl_item_variant_t` | Product variants (colour, size…) |
| `mtrl_item_spec_t` | Product specs |
| `mtrl_highlight_lst_t` | Storefront highlights |
| `mtrl_pack_lst_t` | Product packs |
| `mtrl_promo_lst_t` | Promotions |
| `mtrl_kit_lst_t` | Material kits |
| `mtrl_kit_item_rel_t` | Kit ↔ item |

### Credit orders  (migration 010)
| Table | Purpose |
|-------|---------|
| `crdt_ordr_lst_t` | Credit orders |
| `crdt_ordr_item_t` | Credit order line items |

### Workforce management  (migrations 011, 022, 026, 027, 029, 030, 035_units)
| Table | Purpose |
|-------|---------|
| `wf_prjct_lst_t` | Workforce projects / sites |
| `wf_workr_lst_t` | Workers |
| `wf_suprvsr_lst_t` | Supervisors |
| `wf_bldr_lst_t` | Builders |
| `wf_cntrctr_lst_t` | Contractors |
| `wf_cntrctr_bill_lst_t` | Contractor bills |
| `wf_atndnc_t` | Attendance records |
| `wf_advnc_t` | Worker advances |
| `wf_expns_t` | Expenses |
| `wf_payout_t` | Payouts |
| `wf_workr_cert_lst_t` | Worker certificates (passport) |
| `wf_dpr_lst_t` | Daily progress reports |
| `wf_incdnt_lst_t` | Safety incidents |
| `wf_unit_lst_t` | Units (sales) |
| `wf_unit_doc_lst_t` | Unit documents |
| `wf_prjct_doc_lst_t` | Project documents |
| `wf_asgnmnt_hstry_t` | Worker assignment history |

### Wages  (migration 012)
| Table | Purpose |
|-------|---------|
| `wage_pymnt_lst_t` | Wage payments |
| `wage_adjstmnt_t` | Wage adjustments |
| `wage_audit_dtl_t` | Wage audit trail |

### Lending  (migration 013)
| Table | Purpose |
|-------|---------|
| `loan_prdct_lst_t` | Loan products |
| `loan_aplctn_lst_t` | Loan applications |

### Messaging  (migration 014)
| Table | Purpose |
|-------|---------|
| `msg_thrd_lst_t` | Message threads |
| `msg_thrd_prtcpnt_t` | Thread participants |
| `msg_lst_t` | Messages |

### Notifications  (migration 015)
| Table | Purpose |
|-------|---------|
| `notfcn_lst_t` | Notifications |

### KYC & admin  (migrations 016, 031)
| Table | Purpose |
|-------|---------|
| `kyc_submsn_lst_t` | KYC submissions |
| `admin_audit_lst_t` | Admin audit log |

### Billing & subscriptions  (migration 017)
| Table | Purpose |
|-------|---------|
| `sbscrptn_plan_lst_t` | Subscription plans |
| `usr_sbscrptn_t` | User subscriptions |

### Wallet & cashbook  (migrations 020, 035)
| Table | Purpose |
|-------|---------|
| `wallet_txn_lst_t` | Wallet transactions |
| `cashbook_txn_lst_t` | Per-project cashbook transactions |

### Files  (migration 021)
| Table | Purpose |
|-------|---------|
| `document_lst_t` | Documents (path on disk) |
| `image_lst_t` | Images (path on disk) |

### Compliance  (migration 028)
| Table | Purpose |
|-------|---------|
| `cmplnc_param_lst_t` | Compliance parameters (PF / ESI / BOCW) |

### User capabilities  (migration 032)
| Table | Purpose |
|-------|---------|
| `usr_cpblty_rel_t` | User ↔ capability (per-user overrides) |

### Equipment  (migration 037)
| Table | Purpose |
|-------|---------|
| `equip_lst_t` | Equipment |
| `equip_rental_t` | Equipment rentals |

### Referrals & portfolio  (migrations 039, 040)
| Table | Purpose |
|-------|---------|
| `rfrl_lst_t` | Referrals |
| `prtfl_lst_t` | Portfolio entries |

---

> Migrations that only `ALTER` existing tables, add indexes, seed data, or store images
> (e.g. 018, 019, 023–025, 032_file_disk_storage, 033, 034, 036, 038, 042–049, 052, 053)
> don't appear above because they don't `CREATE TABLE` — but they **are** required and run
> automatically as part of `npm run db:migrate`.
