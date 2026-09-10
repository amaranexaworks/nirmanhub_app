# Nirmaan / ANRIX — Backend

Professional, DB-driven backend for the Nirmaan construction-network app. **Everything the app renders — roles, archetypes, capabilities, departments, bottom tabs and the side-menu — is served from the database.** Nothing is hardcoded.

Built to the same architecture as the reference WMS-web server: **Express + TypeScript + PostgreSQL**, `express-session` (persisted in Postgres) + **RS256 JWT**, and a strict `modules/<name>/{controllers, models, routes, services}` layout.

---

## Quick start

```bash
cd backend
cp .env.example .env          # then edit PG_* + SESSION_SECRET
npm install
npm run keys                  # generate the RS256 JWT key pair
createdb nirmaan              # or: psql -c 'CREATE DATABASE nirmaan;'
npm run db:migrate            # apply schema
npm run db:seed               # load archetypes, roles, menus, demo users
npm run dev                   # start on http://localhost:4300
```

One-shot: `npm run keys && createdb nirmaan && npm run db:setup` (setup = migrate + seed).

> **Full table catalog:** [`db/TABLES.md`](./db/TABLES.md) lists all 79 database tables by domain. `db:migrate` creates every one of them from `db/migrations/`.

### Try it (test users, dev OTP is fixed = `1234`)

Every role has **2 test users**. Phone = `9` + roleId(3) + n(3) + `0000`
(e.g. Builder One = `90420010000`, Mason One = `90040010000`). Find any:
```sql
SELECT u.mbl_nm, u.dsply_nm, r.rle_cd FROM nirmaan.usr_lst_t u
JOIN nirmaan.rle_lst_t r ON r.rle_id = u.actv_rle_id ORDER BY r.rle_cd;
```
```bash
BASE=http://localhost:4300/api
curl -s $BASE/auth/otp/send   -H 'Content-Type: application/json' -d '{"phone":"90420010000"}'
TOKEN=$(curl -s $BASE/auth/otp/verify -H 'Content-Type: application/json' \
  -d '{"phone":"90420010000","otp":"1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["token"])')
curl -s $BASE/nav/menu     -H "x-access-token: $TOKEN"   # tabs + drawer, from the DB
curl -s $BASE/rbac/bootstrap -H "x-access-token: $TOKEN" # full role/capability catalog
```

---

## What's inside

**Core (foundation):**

| Area | Endpoint base | From the DB |
|------|---------------|-------------|
| Auth (phone OTP → JWT + session) | `/api/auth` | users, otp, sessions, login history |
| Navigation (tabs + side menu) | `/api/nav` | `mnu_itm_lst_t`, archetype↔tab, drawer gating |
| RBAC catalog + assignment | `/api/rbac` | archetypes, roles, capabilities, departments |
| User profile | `/api/users` | `usr_lst_t`, skills, languages |

**Domain modules (all 12 built & verified):**

| Module | Base | Capability-gated writes |
|--------|------|-------------------------|
| Requirements | `/api/requirements` | `post_project`, `bid_project` |
| Hiring + market rates | `/api/hiring` | — (read) |
| Jobs | `/api/jobs` | `post_job`, `apply_job` |
| Bookings | `/api/bookings` | — |
| Materials (catalog + orders) | `/api/materials` | `list_material` |
| Credit | `/api/credit` | — |
| Workforce (projects/attendance/payouts) | `/api/workforce` | `manage_teams`, `mark_attendance`, `run_payroll` |
| Wages (register + adjustments + audit) | `/api/wages` | `run_payroll` |
| Lending (products + applications) | `/api/lending` | `list_loan_product`, `apply_loan`, `review_loan` |
| Messaging (threads + messages) | `/api/messaging` | — |
| Notifications | `/api/notifications` | — |
| KYC | `/api/kyc` | — |
| Billing (subscriptions) | `/api/billing` | — |

## Documentation

- [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md) — setup, run, troubleshoot
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layers, request lifecycle, conventions
- [`docs/AUTH.md`](docs/AUTH.md) — JWT + session model, OTP, middleware
- [`docs/RBAC-AND-MENUS.md`](docs/RBAC-AND-MENUS.md) — how roles/menus are DB-driven
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, naming conventions, migrations
- [`docs/API.md`](docs/API.md) — full endpoint reference

## Adding a feature

Every domain (jobs, bookings, materials, workforce, wages, lending …) follows the
same shape as the `requirements` module. See the **`add-backend-module`** skill in
`.claude/skills/` and `docs/ARCHITECTURE.md`.
