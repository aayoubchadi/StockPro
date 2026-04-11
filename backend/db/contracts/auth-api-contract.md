# Auth API Contract (Draft v1)

Date: 2026-04-11
Status: Draft - Part 1 (flows + payload contracts)
Scope: Backend auth endpoints for tenant users and platform admin

## 1. Goals and auth model

This contract defines payloads and responses for authentication endpoints.

Supported principals:
- Tenant user (`users` table): `company_admin` or `employee`
- Platform admin (`platform_admins` table)

Identity rules:
- Email lookup is case-insensitive.
- Disabled account (`is_active = FALSE`) cannot login.
- Auth endpoints do not expose whether an email exists.

## 2. Base path and content type

- Base path: `/api/v1/auth`
- Content type: `application/json`

## 3. Error contract (shared)

All non-2xx responses follow this shape:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": []
  }
}
```

Standard auth error codes:
- `AUTH_VALIDATION_ERROR`
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_ACCOUNT_DISABLED`
- `AUTH_RATE_LIMITED`
- `AUTH_TOKEN_INVALID`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_REFRESH_REUSED`

## 4. Password policy

Applies to register and password reset:

- Minimum length: 12
- Maximum length: 72 (bcrypt-compatible boundary)
- Must include at least:
  - 1 uppercase letter
  - 1 lowercase letter
  - 1 digit
  - 1 special character from: `!@#$%^&*()_+-=[]{}|;:,.<>?`
- Must not include spaces
- Must not contain the local part of email (case-insensitive)

Validation error payload example:

```json
{
  "error": {
    "code": "AUTH_VALIDATION_ERROR",
    "message": "Password does not meet security policy",
    "details": [
      "minimum length is 12",
      "must include at least one special character"
    ]
  }
}
```

## 5. Endpoint: Register tenant user

Endpoint:
- `POST /api/v1/auth/register`

Request body:

```json
{
  "companyId": "uuid",
  "fullName": "Jane Doe",
  "email": "jane@acme.com",
  "password": "StrongPass!2026",
  "role": "employee"
}
```

Request rules:
- `companyId`: required UUID for tenant company.
- `fullName`: required, trimmed, 2-120 chars.
- `email`: required, valid format, lowercased before persist.
- `password`: must pass policy in section 4.
- `role`: optional, defaults to `employee`; values allowed: `company_admin`, `employee`.
- If `role=company_admin`, enforce one active admin per company.

Success response:
- `201 Created`

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "companyId": "uuid",
      "fullName": "Jane Doe",
      "email": "jane@acme.com",
      "role": "employee",
      "isActive": true,
      "createdAt": "2026-04-11T10:20:30.000Z"
    }
  }
}
```

Failure cases:
- `400` with `AUTH_VALIDATION_ERROR`
- `409` with `AUTH_VALIDATION_ERROR` for duplicate email in company
- `409` with `AUTH_VALIDATION_ERROR` for second active company admin

## 6. Endpoint: Login

Endpoint:
- `POST /api/v1/auth/login`

Request body:

```json
{
  "email": "jane@acme.com",
  "password": "StrongPass!2026",
  "accountScope": "tenant"
}
```

Request rules:
- `email`: required.
- `password`: required.
- `accountScope`: required; values: `tenant`, `platform`.

Success response:
- `200 OK`

```json
{
  "data": {
    "accessToken": "jwt",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshToken": "opaque-or-jwt",
    "refreshExpiresIn": 604800,
    "user": {
      "id": "uuid",
      "companyId": "uuid-or-null",
      "fullName": "Jane Doe",
      "email": "jane@acme.com",
      "role": "employee",
      "scope": "tenant"
    }
  }
}
```

Failure cases:
- `400` with `AUTH_VALIDATION_ERROR`
- `401` with `AUTH_INVALID_CREDENTIALS`
- `403` with `AUTH_ACCOUNT_DISABLED`
- `429` with `AUTH_RATE_LIMITED`

## 7. Access token contract (JWT claims)

Access token format:
- JWT signed with asymmetric key (`RS256`).

Registered claims:
- `iss`: `stockpro-api`
- `aud`: `stockpro-client`
- `sub`: authenticated principal ID (`users.id` or `platform_admins.id`)
- `iat`: issued-at unix timestamp
- `exp`: expiration unix timestamp
- `jti`: unique token identifier (UUID v4)

Private claims:
- `scope`: `tenant` or `platform`
- `role`: `company_admin`, `employee`, or `platform_admin`
- `companyId`: UUID for tenant users, omitted for platform admins
- `email`: normalized principal email

Tenant access token claim example:

```json
{
  "iss": "stockpro-api",
  "aud": "stockpro-client",
  "sub": "2f17d8dc-cccc-4e95-b0ad-2f8bbf7b67f1",
  "iat": 1775900000,
  "exp": 1775900900,
  "jti": "b15ef6e9-ec9f-40b7-b9a8-ef9e9eef0e8e",
  "scope": "tenant",
  "role": "employee",
  "companyId": "2d89662d-6bf6-4c59-ab8e-57ca37d7a663",
  "email": "jane@acme.com"
}
```

## 8. Token TTL decisions

Decisions for this phase:
- Access token TTL: 15 minutes (`900s`)
- Refresh token TTL: 7 days (`604800s`)
- Absolute session max lifetime via refresh chain: 30 days

Rationale:
- Short access token limits impact of token leakage.
- 7-day refresh avoids frequent re-login in daily operations.
- 30-day absolute cap limits indefinitely extended sessions.

## 9. Refresh strategy (rotation + reuse detection)

Refresh token type:
- Opaque random token (minimum 256-bit entropy), stored hashed server-side.

Rotation policy:
- Each successful `POST /api/v1/auth/refresh` invalidates the previous refresh token and issues a new pair.

Reuse detection:
- If an already-rotated refresh token is presented again, treat as potential theft.
- Revoke the entire session family (all descendants from original session root).
- Return `401` with code `AUTH_REFRESH_REUSED`.

Storage model (recommended):
- `auth_sessions` table for session metadata.
- `auth_refresh_tokens` table with:
  - `id` (UUID)
  - `session_id`
  - `token_hash`
  - `issued_at`
  - `expires_at`
  - `revoked_at` (nullable)
  - `replaced_by_token_id` (nullable)
  - `parent_token_id` (nullable)

## 10. Secret rotation approach

Signing model:
- Use private/public key pairs for JWT (`RS256`).
- Publish active public keys via JWKS endpoint (future endpoint: `GET /.well-known/jwks.json`).

Rotation rules:
- Every key pair has `kid`, `createdAt`, `status`, and `retireAt` metadata.
- New tokens are signed only with active key.
- Keep retired public keys available until all tokens signed with them are expired + 24h grace.
- Emergency rotation: immediately deactivate compromised private key and invalidate all active sessions.

Operational target:
- Planned key rotation cadence: every 90 days.

## 11. Blacklist and revocation strategy

Decision:
- Use a server-side revocation list for access token `jti` only in these events:
  - explicit logout,
  - refresh reuse detection,
  - admin-forced logout.

Access token blacklist TTL:
- Store revoked `jti` until token `exp` passes, then purge.

Refresh tokens:
- Do not maintain separate blacklist; rely on hashed token store state (`revoked_at`, replacement chain).

Performance note:
- If Redis is available, prefer Redis for `jti` blacklist with key TTL equal to remaining token lifetime.
- If Redis is not available, use PostgreSQL table + indexed `jti`.

## 12. Endpoint: Refresh token

Endpoint:
- `POST /api/v1/auth/refresh`

Request body:

```json
{
  "refreshToken": "opaque-token"
}
```

Success response:
- `200 OK`

```json
{
  "data": {
    "accessToken": "jwt",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshToken": "opaque-token",
    "refreshExpiresIn": 604800
  }
}
```

Failure cases:
- `400` with `AUTH_VALIDATION_ERROR`
- `401` with `AUTH_TOKEN_INVALID`
- `401` with `AUTH_TOKEN_EXPIRED`
- `401` with `AUTH_REFRESH_REUSED`

## 13. Endpoint: Logout

Endpoint:
- `POST /api/v1/auth/logout`

Auth:
- Requires valid access token (`Authorization: Bearer <token>`).

Request body:

```json
{
  "refreshToken": "opaque-token"
}
```

Request notes:
- `refreshToken` is optional.
- If provided, revoke the corresponding refresh token/session chain.
- Always revoke current access token `jti` by adding it to blacklist until token expiry.

Success response:
- `204 No Content`

Failure cases:
- `401` with `AUTH_TOKEN_INVALID`
- `401` with `AUTH_TOKEN_EXPIRED`

## 14. Security controls (non-functional)

- Hash passwords with `bcrypt` cost factor 12 or higher.
- Hash refresh tokens at rest (never store plaintext refresh token).
- Apply auth rate limiting per IP and per email.
- Record audit events for `register`, `login`, `refresh`, `logout`, and refresh-reuse detection.

## 15. Implementation checklist (backend)

Required DB artifacts:
- `auth_sessions` table
- `auth_refresh_tokens` table
- `auth_access_token_blacklist` table (if Redis is not used)

Required indexes:
- `auth_refresh_tokens(token_hash)` unique
- `auth_refresh_tokens(session_id)`
- `auth_refresh_tokens(expires_at)`
- `auth_access_token_blacklist(jti)` unique
- `auth_access_token_blacklist(expires_at)`

Required env contract additions:
- `JWT_ISSUER=stockpro-api`
- `JWT_AUDIENCE=stockpro-client`
- `JWT_ACCESS_TTL_SECONDS=900`
- `JWT_REFRESH_TTL_SECONDS=604800`
- `JWT_SESSION_MAX_LIFETIME_SECONDS=2592000`
- `JWT_ACTIVE_KID=<current-signing-key-id>`
- `JWT_PRIVATE_KEY_PEM=<multi-line-or-base64-pem>`
- `JWT_PUBLIC_KEYS_JWKS_JSON=<jwks-json-or-path>`
- `AUTH_BCRYPT_COST=12`

Recommended env contract additions:
- `AUTH_RATE_LIMIT_LOGIN_PER_MINUTE=10`
- `AUTH_RATE_LIMIT_REFRESH_PER_MINUTE=20`
- `AUTH_REDIS_URL=<redis-connection-string>` (optional)

Verification checklist:
- Register user with valid payload returns `201`.
- Register user with weak password returns `400 AUTH_VALIDATION_ERROR`.
- Login success returns access + refresh tokens.
- Login with invalid password returns `401 AUTH_INVALID_CREDENTIALS`.
- Refresh with valid token returns a new rotated refresh token.
- Reusing an old refresh token returns `401 AUTH_REFRESH_REUSED`.
- Logout invalidates current access token `jti` and optional refresh token.

## 16. Decision summary (frozen for Day 3)

| Topic | Decision |
|---|---|
| Access token format | JWT (`RS256`) |
| Refresh token format | Opaque random token, hashed at rest |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days |
| Absolute session lifetime | 30 days |
| Refresh strategy | Rotation per use + reuse detection |
| Key rotation cadence | 90 days planned |
| Revocation strategy | Access `jti` blacklist + refresh token chain state |
| Password minimum length | 12 |
| Password complexity | upper + lower + digit + special |