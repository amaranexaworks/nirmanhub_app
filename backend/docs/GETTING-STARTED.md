# Getting Started

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ running locally (or a reachable instance)

## 1. Configure
```bash
cd backend
cp .env.example .env
```
Edit `.env` — set `PG_HOST/PG_PORT/PG_USER/PG_PASSWORD/PG_DATABASE` and a strong
`SESSION_SECRET`. Leave `OTP_DEV_MODE=true` for local development (OTP is fixed to
`OTP_DEV_FIXED`, default `1234`, and returned in the API response so you can log in
without an SMS gateway).

## 2. Install & generate keys
```bash
npm install
npm run keys          # writes security/private_key.pem + public_key.pem (RS256)
```

## 3. Create the database & load data
```bash
createdb nirmaan       # or psql -c 'CREATE DATABASE nirmaan;'
npm run db:migrate     # apply migrations in db/migrations
npm run db:seed        # load archetypes, roles, capabilities, departments, menus, demo users
```
Handy combos:
- `npm run db:setup` — keys + migrate + seed
- `npm run db:reset` — **drops** the schema, then migrate + seed (destructive; dev only)

## 4. Run
```bash
npm run dev            # nodemon + ts-node, restarts on change
# or
npm run start          # single run
```
Server: `http://localhost:4300`, API base `http://localhost:4300/api`.

## 5. Smoke test
```bash
BASE=http://localhost:4300/api
curl -s $BASE/auth/otp/send   -H 'Content-Type: application/json' -d '{"phone":"919000000004"}'
curl -s $BASE/auth/otp/verify -H 'Content-Type: application/json' -d '{"phone":"919000000004","otp":"1234"}'
# copy data.token, then:
curl -s $BASE/nav/menu -H "x-access-token: <TOKEN>"
```

## Test users (2 per role — all use OTP `1234` in dev)

There are **120 users: exactly 2 for every one of the 60 roles**, named
`"<Role> One"` / `"<Role> Two"`. Phone = `9` + roleId(3) + n(3) + `0000`.

List them:
```sql
SELECT u.mbl_nm, u.dsply_nm, r.rle_cd, a.archtyp_cd
FROM nirmaan.usr_lst_t u
JOIN nirmaan.rle_lst_t r ON r.rle_id = u.actv_rle_id
JOIN nirmaan.archtyp_lst_t a ON a.archtyp_id = r.archtyp_id
ORDER BY a.sqnce_id, r.sqnce_id, u.mbl_nm;
```
Examples: `90040010000` Mason One · `90420010000` Builder One ·
`90480010000` Material Supplier One · `90580010000` Banker One.
Eight users also belong to a department (project_manager/site_supervisor→OPS,
contractor/real_estate_agent→SALES, material_supplier→CATLG, loan_agent/banker→FIN,
architect→TECH) so the departments feature has data.

## Troubleshooting
- **`Database not reachable`** — check Postgres is up and `.env` PG_* values. On macOS/Homebrew the default superuser is your OS username with no password.
- **`JWT keys missing`** — run `npm run keys`.
- **`Schema not migrated yet`** — run `npm run db:migrate && npm run db:seed`.
- **401 on a protected route** — pass the token as `x-access-token: <token>` (or `Authorization: Bearer <token>`).
- **OTP expired / not requested** — call `/auth/otp/send` before `/auth/otp/verify`; the OTP row must exist even in dev.
