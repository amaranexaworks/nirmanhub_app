---
name: add-backend-module
description: Step-by-step recipe to add a new domain module (jobs, bookings, materials, workforce, wages, lending, messaging, notifications, kyc, billing…) to the Nirmaan backend. Use when asked to build a new feature/endpoint/table set on the backend.
---

# Add a Backend Module

The `requirements` module is the reference implementation — copy its shape. A
module = a migration (+ optional seed), a model, a controller, a router, and one
line in `apiRoutes.ts`.

## 1. Design the tables
Add `db/migrations/NNN_<area>.sql` (next number in sequence). Follow the naming
convention (`_lst_t`, `_rel_t`, `_id/_cd/_nm/_tx/_in/_ts/_am`, `a_in`, `i_ts`).
Schema-qualify with `nirmaan.`. Master rows/catalog go in a seed
`db/seeds/NNN_<area>.sql` using idempotent `ON CONFLICT`.

Run: `npm run db:migrate && npm run db:seed`.

## 2. Model — `api/modules/<name>/models/<Noun>Mdl.ts`
```ts
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const sqldb = require((global as any).appRoot + '/config/db.config');
const dbutil = require((global as any).appRoot + '/utils/pg.db.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const schema = sqldb.schema;

exports.listMdl = function (limit: number, offset: number, req?: any) {
  const QRY = `SELECT … FROM ${schema}.<table>_lst_t WHERE a_in = 1 ORDER BY … LIMIT $1 OFFSET $2`;
  return dbutil.execQuery(sqldb.AppPool, QRY, [limit, offset], cntxtDtls, req);
};
```
Rule: every value is a bound `$n` param — never interpolate input into SQL.

## 3. Controller — `api/modules/<name>/controllers/<Noun>Ctrl.ts`
```ts
export {};
const df = require((global as any).appRoot + '/utils/dflower.utils');
const validate = require((global as any).appRoot + '/utils/validate.utils');
const cntxtDtls = df.getModuleMetaData(__dirname, __filename);
const Mdl = require('../models/<Noun>Mdl');

exports.listCtrl = async function (req: any, res: any) {
  const fnm = 'listCtrl';
  try {
    const rows = await Mdl.listMdl(Number(req.query.limit)||20, Number(req.query.offset)||0, req);
    return df.formatSucessRes(req, res, rows, cntxtDtls, fnm, {});
  } catch (e: any) {
    return df.formatErrorRes(res, null, cntxtDtls, fnm, { error_status: 500, err_message: e.message });
  }
};
```
Access `req.user` for the caller (id, activeRole, archetype, capabilities).

## 4. Router — `api/modules/<name>/routes/<name>.routes.ts`
```ts
export {};
const express = require('express');
const Ctrl = require('../controllers/<Noun>Ctrl');
const AuthService = require((global as any).appRoot + '/api/modules/auth/services/AuthenticationService');
const router = express.Router();
const auth = AuthService.authenticate;

router.get('/', auth, Ctrl.listCtrl);
router.post('/', auth, AuthService.authorize('<capability>'), Ctrl.createCtrl); // gate writes
module.exports = router;
```

## 5. Mount it — `api/routes/apiRoutes.ts`
```ts
router.use('/<name>', require('../modules/<name>/routes/<name>.routes'));
```

## 6. Verify
```bash
npx tsc --noEmit
npm run dev
# smoke test with a demo user token (see docs/GETTING-STARTED.md)
```

## Capability reference (pick the right guard)
`browse_marketplace, hire_workers, post_job, apply_job, bid_project, post_project,
manage_sites, manage_teams, mark_attendance, run_payroll, list_material,
list_equipment, list_property, set_availability, create_quotation, manage_portfolio,
list_loan_product, review_loan, apply_loan`. If a new capability is needed, add it to
`cpblty_lst_t` and grant it to the relevant archetypes in `archtyp_cpblty_rel_t` (via
a seed).

## Already built (copy any of these as a template)
`requirements, hiring, jobs, bookings, materials, credit, workforce, wages,
lending, messaging, notifications, kyc, billing` — all mounted in
`api/routes/apiRoutes.ts`. `requirements` is the simplest reference; `workforce`
and `wages` show transactions (`dbutil.withTransaction`) and multi-table writes.

## Enhancements still open
- Real-time messaging over WebSocket (currently REST polling).
- SMS provider for OTP (dev OTP is fixed `1234`).
- Admin capability gating on `rbac` assignment + `kyc`/`lending` review routes.
