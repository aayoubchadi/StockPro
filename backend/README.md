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
5. For existing databases, run migration scripts under `backend/db/migrations/`.

### 1) Create and Initialize Database

From the repository root, run:

```powershell
"C:\dev\PostGreSQL\bin\createdb.exe" -U postgres -h localhost -p 9100 stockpro_db
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/migrations/2026-04-09_user-model-finalization.sql
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
