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