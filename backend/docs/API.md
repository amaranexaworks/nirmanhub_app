# API Reference

Base URL: `http://localhost:4300/api`
Auth header (protected routes): `x-access-token: <jwt>` or `Authorization: Bearer <jwt>`

All responses share the envelope:
```json
{ "status": 200, "success": true, "message": "…", "data": <payload>, "meta": {…} }
```

## Auth — `/auth`

| Method | Path | Auth | Body | Returns |
|--------|------|:---:|------|---------|
| POST | `/auth/otp/send` | — | `{ phone }` | `{ sent, expiresAt, devOtp? }` |
| POST | `/auth/otp/verify` | — | `{ phone, otp, name? }` | `{ token, user, isNewUser }` |
| GET | `/auth/me` | ✓ | — | full user + roles + departments + capabilities |
| POST | `/auth/switch-role` | ✓ | `{ rle_id }` | `{ token, user }` (new active role) |
| POST | `/auth/logout` | ✓ | — | `{ loggedOut }` |

## Navigation — `/nav`

| Method | Path | Auth | Returns |
|--------|------|:---:|---------|
| GET | `/nav/menu` | ✓ | `{ archetype, activeRole, tabs[], drawer:{sections[]} }` |
| GET | `/nav/menu-items` | ✓ | full menu-item catalog (admin) |

## RBAC — `/rbac`

| Method | Path | Auth | Body | Returns |
|--------|------|:---:|------|---------|
| GET | `/rbac/bootstrap` | ✓ | — | `{ archetypes, roles, capabilities, archetypeCapabilities, departments }` |
| GET | `/rbac/archetypes` | ✓ | — | archetype list |
| GET | `/rbac/roles?archetype=worker` | ✓ | — | roles (optionally filtered) |
| GET | `/rbac/capabilities` | ✓ | — | capability catalog |
| GET | `/rbac/departments` | ✓ | — | departments with nested designations |
| POST | `/rbac/users/:userId/roles` | ✓ | `{ rle_id, prmry_in? }` | assignment |
| DELETE | `/rbac/users/:userId/roles/:rleId` | ✓ | — | `{ removed }` |
| POST | `/rbac/users/:userId/departments` | ✓ | `{ dprtmnt_id, dsgntn_id?, prmry_in? }` | assignment |

## Users — `/users`

| Method | Path | Auth | Body | Returns |
|--------|------|:---:|------|---------|
| GET | `/users/me` | ✓ | — | own profile (+ skills) |
| PUT | `/users/me` | ✓ | any of `dsply_nm, eml_tx, cty_nm, pncd_tx, hdln_tx, bio_tx, day_rate_am, srvc_rds_km, lat, lng, lng_cd_tx, avtr_url_tx` | updated profile |
| POST | `/users/me/skills` | ✓ | `{ skill }` | `{ skills[] }` |
| GET | `/users/:id` | ✓ | — | public profile |

## Requirements — `/requirements` (sample domain, capability-gated)

| Method | Path | Auth | Capability | Body | Returns |
|--------|------|:---:|-----------|------|---------|
| GET | `/requirements/service-types` | ✓ | — | — | service-type catalog |
| GET | `/requirements?limit&offset` | ✓ | — | — | requirement feed |
| GET | `/requirements/mine` | ✓ | — | — | own posts |
| POST | `/requirements` | ✓ | `post_project` | `{ title, serviceType?, location?, budget?, areaSqft?, floors?, description? }` | created requirement |
| GET | `/requirements/:id/responses` | ✓ | — | — | responses to a requirement |
| POST | `/requirements/:id/responses` | ✓ | `bid_project` | `{ price?, message? }` | created response |

## Hiring — `/hiring`
- `GET /hiring/search?trade=&city=&q=` — search hireable workers/experts
- `GET /hiring/market-rates` — day-rate references per trade

## Jobs — `/jobs`
- `GET /jobs?trade=&city=` · `GET /jobs/mine` · `GET /jobs/applied` · `GET /jobs/saved`
- `POST /jobs` *(post_job)* · `POST /jobs/:id/apply` *(apply_job)* · `POST /jobs/:id/save`
- `GET /jobs/:id/applicants`

## Bookings — `/bookings`
- `GET /bookings?role=seeker|pro&status=` · `GET /bookings/:id`
- `POST /bookings` · `PATCH /bookings/:id` (status/progress)

## Materials — `/materials`
- `GET /materials/categories` · `GET /materials/catalog?category=&q=`
- `POST /materials/catalog` *(list_material)* · `POST /materials/orders` · `GET /materials/orders` · `GET /materials/orders/:id`

## Credit — `/credit`
- `GET /credit/orders?status=` · `POST /credit/orders` · `POST /credit/orders/:id/pay`

## Workforce — `/workforce` *(orchestrator)*
- Projects: `GET/POST /workforce/projects` *(manage_teams)*
- Supervisors/Workers: `GET/POST /workforce/projects/:projectId/{supervisors,workers}` *(manage_teams)*
- Attendance: `GET /…/attendance?from=&to=` · `POST /…/attendance` *(mark_attendance)*
- Expenses: `GET/POST /…/expenses` · Advances: `GET/POST /workforce/workers/:workerId/advances` *(run_payroll)*
- Payouts: `GET/POST /…/payouts` *(run_payroll)*

## Wages — `/wages`
- `GET/POST /wages/payments` *(run_payroll)* · `GET/POST /wages/adjustments` *(run_payroll)* · `GET /wages/audit`

## Lending — `/lending`
- `GET /lending/products` · `POST /lending/products` *(list_loan_product)*
- `POST /lending/products/:id/apply` *(apply_loan)* · `GET /lending/applications`
- `GET /lending/review-queue` *(review_loan)* · `PATCH /lending/applications/:id` *(review_loan)*

## Messaging — `/messaging`
- `GET /messaging/threads` · `POST /messaging/threads` `{userId}`
- `GET /messaging/threads/:id/messages` · `POST /messaging/threads/:id/messages`

## Notifications — `/notifications`
- `GET /notifications?unread=true` · `GET /notifications/unread-count`
- `POST /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all`

## KYC — `/kyc`
- `GET /kyc/status` · `POST /kyc/submit` · `GET /kyc/pending` · `PATCH /kyc/:id/review`

## Billing — `/billing`
- `GET /billing/plans` · `GET /billing/subscription` · `POST /billing/subscribe` `{plan,cycle}`

## Health
- `GET /api/health` — service heartbeat (no auth)
- `GET /api/auth/health` — auth module heartbeat

## Error codes
`400` validation · `401` missing/invalid/expired token (`code`: `TOKEN_NOT_PROVIDED`,
`TOKEN_EXPIRED`, `TOKEN_INVALID`, `SESSION_MISMATCH`) · `403` capability denied
(`code: FORBIDDEN`) · `404` not found · `500` server error.
