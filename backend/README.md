# Backend

This folder contains the Express API scaffold for StockPro.

## Structure

```
backend/
├── src/
│   ├── middleware/
│   ├── routes/
│   ├── app.js
│   └── server.js
└── package.json
```

## Scripts

```bash
npm run dev
npm start
```

## Database Configuration

This backend uses PostgreSQL.

Current DB role model in this phase:

- `company_admin`: at most one active admin per company with access to that company only
- `employee`: standard company account under subscription limits
- `platform master admin`: global account for platform-level administration

Seeded platform master admin (development):

- Email: `stockpro@admin.com`
- Password: `StockPro@Admin2026`

1. Ensure PostgreSQL is running.
2. Create the database if it does not already exist.
3. Run schema and seed scripts.
4. Configure backend environment variables.
5. Re-running `backend/db/schema.sql` is supported for existing databases.

### 1) Create and Initialize Database

From the repository root, run:

```powershell
"C:\dev\PostGreSQL\bin\createdb.exe" -U postgres -h localhost -p 9100 stockpro_db
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql
```

User schema decisions are locked in `backend/db/contracts/user-schema-contract.md`.

### 2) Create Local Environment File

Copy `.env.example` to `.env` in `backend/`.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

On bash/zsh:

```bash
cp .env.example .env
```

### 3) Environment Contract (Frozen)

The backend validates environment variables at startup and exits early if values are missing or invalid.

Required:

- `DB_HOST`: non-empty string
- `DB_NAME`: non-empty string
- `DB_USER`: non-empty string
- `DB_PASSWORD`: non-empty string

Optional with defaults (must be integer >= 1 when provided):

- `PORT` (default `5000`)
- `DB_PORT` (default `9100`)
- `DB_POOL_MAX` (default `10`)
- `DB_IDLE_TIMEOUT_MS` (default `30000`)
- `DB_CONNECTION_TIMEOUT_MS` (default `5000`)
- `JWT_ACCESS_TTL_SECONDS` (default `900`)
- `JWT_REFRESH_TTL_SECONDS` (default `604800`)
- `JWT_SESSION_MAX_LIFETIME_SECONDS` (default `2592000`)
- `AUTH_RATE_LIMIT_LOGIN_WINDOW_MS` (default `60000`)
- `AUTH_RATE_LIMIT_LOGIN_MAX` (default `10`)
- `AUTH_RATE_LIMIT_REGISTER_WINDOW_MS` (default `60000`)
- `AUTH_RATE_LIMIT_REGISTER_MAX` (default `5`)
- `AUTH_RATE_LIMIT_REFRESH_WINDOW_MS` (default `60000`)
- `AUTH_RATE_LIMIT_REFRESH_MAX` (default `20`)

Optional:

- `GOOGLE_CLIENT_ID`: expected Google OAuth Client ID used to validate Google ID token audience for `POST /api/v1/auth/login/google`

Required:

- `JWT_ACCESS_SECRET`: non-empty JWT signing secret

If startup fails with env validation errors, check `backend/.env` first.

### 4) Verify Connection

Start backend and check:

```bash
npm run dev
```

Then request `GET /health`. The response includes database status when connection succeeds.

## Endpoints

- `GET /` returns a simple API status payload.
- `GET /health` returns uptime, timestamp, and PostgreSQL connectivity status.
- `POST /api/v1/auth/register` creates tenant user with password policy enforcement.
- `POST /api/v1/auth/login` returns access + refresh tokens.
- `POST /api/v1/auth/login/google` verifies Google ID token and returns access + refresh tokens for existing accounts.
- `POST /api/v1/auth/refresh` rotates refresh token and returns new token pair.
- `POST /api/v1/auth/logout` revokes access token and optional refresh session.
- `GET /api/v1/auth/me` verifies bearer access token and returns auth claims.

## Stable Dev Runbook

1. Install workspace dependencies from the repository root.
2. Confirm `backend/.env` exists. Use `backend/.env.example` as the source of truth for required keys.
3. Ensure these variables are set:
   - `DB_HOST`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
4. Keep these values numeric if overridden:
   - `PORT`
   - `DB_PORT`
   - `DB_POOL_MAX`
   - `DB_IDLE_TIMEOUT_MS`
   - `DB_CONNECTION_TIMEOUT_MS`
5. Start the backend with `npm run dev` from the repository root or `npm run dev --workspace backend`.
6. If startup fails, fix the env file first. The server validates the contract before accepting traffic.

Verification checks:

- Local startup succeeds with the current configuration.
- Blank `DB_PASSWORD` fails during startup.
- Non-numeric `DB_PORT` fails during startup.

## Auth Hardening Runbook

1. Confirm `.env` includes:
   - `JWT_ACCESS_SECRET`
   - `JWT_ACCESS_TTL_SECONDS`
   - `JWT_REFRESH_TTL_SECONDS`
   - `JWT_SESSION_MAX_LIFETIME_SECONDS`
   - auth rate-limit variables for login/register/refresh
2. Run `backend/db/schema.sql` to initialize or update schema objects (idempotent).
3. Verify login returns both `accessToken` and `refreshToken`.
4. Verify refresh rotates token and old token reuse triggers `AUTH_REFRESH_REUSED`.
5. Verify logout blacklists current access token and denies subsequent `/auth/me` requests using that token.
6. Verify `auth_audit_events` receives records for `register`, `login`, `refresh`, and `logout` outcomes.
