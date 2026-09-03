# Database

PostgreSQL, single schema **`nirmaan`**. Migrations are plain `.sql` applied in
filename order and tracked in `nirmaan._migrations_t`; seeds are idempotent `.sql`.

## Naming convention (inherited from WMS-web)

| Suffix / token | Meaning | Example |
|----------------|---------|---------|
| `_lst_t` | master / list table | `rle_lst_t` |
| `_rel_t` | relation (mapping) table | `usr_rle_rel_t` |
| `_dtl_t` | detail / history table | `usr_lgn_hstry_dtl_t` |
| `_t` | table | `usr_otp_t` |
| `_id` | surrogate key / FK | `usr_id`, `archtyp_id` |
| `_cd` | business code | `rle_cd = 'mason'` |
| `_nm` | name / label | `rle_nm = 'Mason'` |
| `_tx` | free text | `bio_tx` |
| `_in` | indicator (0/1 boolean) | `a_in`, `prmry_in`, `emphss_in` |
| `_ts` | timestamp | `i_ts`, `postd_ts` |
| `_am` | amount | `day_rate_am` |

`a_in` = active flag (soft-delete: set `0` instead of deleting).
`i_ts` / `u_ts` = insert / update timestamps.

## Tables by area

**Identity** (`002_auth_identity.sql`)
- `usr_lst_t` — users (phone `mbl_nm` is the login id; `actv_rle_id` = active role)
- `usr_skll_rel_t`, `usr_lang_rel_t` — profile skills / languages
- `usr_otp_t` — one-time passwords
- `usr_lgn_hstry_dtl_t` — login history
- `user_session_t` — express-session store (`001`)

**RBAC** (`003_rbac.sql`)
- `archtyp_lst_t`, `rle_lst_t`, `cpblty_lst_t`, `archtyp_cpblty_rel_t`
- `dprtmnt_lst_t`, `dsgntn_lst_t`
- `usr_rle_rel_t`, `usr_dprtmnt_rel_t`

**Navigation** (`004_navigation.sql`)
- `mnu_itm_lst_t`, `archtyp_mnu_itm_rel_t`, `mnu_itm_archtyp_rel_t`

**Domain sample** (`005_domain_requirements.sql`)
- `srvc_type_lst_t`, `rqrmnt_lst_t`, `rqrmnt_rspns_t`

## ER sketch (core)

```
usr_lst_t ─actv_rle_id─▶ rle_lst_t ─archtyp_id─▶ archtyp_lst_t ─┬─< archtyp_cpblty_rel_t >─ cpblty_lst_t
   │  ▲                     ▲                                   └─< archtyp_mnu_itm_rel_t >─ mnu_itm_lst_t
   │  └── usr_rle_rel_t ────┘                                        (mnu_type_cd = tab|drawer)  │
   │                                                            mnu_itm_archtyp_rel_t >───────────┘  (drawer gating)
   └── usr_dprtmnt_rel_t ─▶ dprtmnt_lst_t ─< dsgntn_lst_t
```

## Migrations

- Location: `db/migrations/NNN_name.sql`, run in ascending filename order.
- Each is wrapped in a transaction and recorded in `nirmaan._migrations_t` so it
  runs once. Re-running `npm run db:migrate` applies only new files.
- **Never edit an applied migration** — add a new one.

Commands:
```bash
npm run db:migrate   # apply pending
npm run db:seed      # (re)run idempotent seeds
npm run db:reset     # DROP schema + migrate + seed  (dev only, destructive)
```

## Seeds

`db/seeds/NNN_name.sql`, all idempotent via `ON CONFLICT … DO UPDATE/NOTHING`, so
they double as the canonical definition of archetypes/roles/menus/departments.
Editing the catalog = editing a seed and re-running `npm run db:seed`.
