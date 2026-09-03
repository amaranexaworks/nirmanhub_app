# Authentication & Authorization

## Model

Two cooperating mechanisms, exactly as in the WMS-web server:

1. **Session (authority)** — `express-session` persisted in Postgres via
   `connect-pg-simple` (`nirmaan.user_session_t`). The session holds `userId` and
   the `jwtToken` issued at login. It is the source of truth for "is this login
   still valid".
2. **JWT (transport)** — a short-lived **RS256** token (default 4h) carried on each
   request. It is signed from the session and re-mintable from it — **there are no
   refresh tokens**; the session IS the refresh mechanism.

On a protected request, `authenticate` verifies the JWT signature/expiry AND, when
a DB session is present, checks the request's token matches the one stored in the
session (blocks stolen/rotated tokens).

## Login flow (phone OTP)

```
POST /api/auth/otp/send    { phone }
      → generates OTP, stores it (nirmaan.usr_otp_t) with a TTL, "sends" it
      → dev mode: OTP is fixed (OTP_DEV_FIXED, default 1234) and returned as data.devOtp

POST /api/auth/otp/verify  { phone, otp, name? }
      → verifies the OTP (attempt-limited, single-use, expiry-checked)
      → finds-or-creates the user (usr_lst_t)
      → buildAuthContext(userId): user + roles + activeRole + archetype + capabilities
      → signs a JWT, saves the session
      → returns { token, user, isNewUser }
```

Use the token on subsequent calls:
```
x-access-token: <token>          # preferred
Authorization: Bearer <token>    # also accepted
```

## The auth context (also the JWT payload)

Built once by `AuthenticationService.buildAuthContext(userId)` and reused for both
the JWT and `/auth/me`:

```jsonc
{
  "userId": 4,
  "name": "Kiran Builders",
  "phone": "919000000004",
  "kycTier": "verified",
  "activeRole": { "rle_id": 42, "rle_cd": "builder", "archtyp_cd": "orchestrator", … },
  "archetype": "orchestrator",
  "roles": [ { "rle_cd": "builder", "prmry_in": 1 }, { "rle_cd": "contractor" } ],
  "capabilities": ["hire_workers","post_project","manage_sites","run_payroll", …]
}
```

`capabilities` are resolved from the **active role's archetype** (`archtyp_cpblty_rel_t`).
Switching role re-resolves them.

## Middleware

- **`authenticate`** — required on every protected route. Validates the token,
  optionally validates the session, sets `req.user`.
- **`authorize('<capability>')`** — capability-based guard. Returns `403` if the
  user's active role lacks the capability. Example:
  ```ts
  router.post('/', auth, AuthService.authorize('post_project'), Ctrl.createCtrl);
  ```

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/otp/send` | — | Request an OTP |
| POST | `/api/auth/otp/verify` | — | Verify OTP → login/signup → token + session |
| GET | `/api/auth/me` | ✓ | Current auth context (+ departments) |
| POST | `/api/auth/switch-role` | ✓ | Change active role → fresh token |
| POST | `/api/auth/logout` | ✓ | Destroy session |

## Configuration

- Token lifetime, algorithm, audience, passphrase → `config/session.config.ts`.
- Session cookie, store table, TTLs → `config/session.config.ts`.
- OTP length/TTL/dev-mode → `.env` (`OTP_*`).
- Keys → `security/private_key.pem` (encrypted) + `public_key.pem`, via `npm run keys`.

## Production checklist
- Set `NODE_ENV=production` (enables `secure` cookies over HTTPS).
- Replace the dev OTP path with a real SMS provider in
  `AuthenticationService.sendOtp` (`OTP_DEV_MODE=false`).
- Use strong `SESSION_SECRET` and `JWT_PRIVATE_KEY_PASSPHRASE`; keep keys out of git.
- Gate `rbac` assignment routes behind an admin capability.
