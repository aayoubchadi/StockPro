# StockPro

Repository layout for the stock management project.

## Structure

```
StockPro/
├── package.json  # Root workspace scripts
├── frontend/   # React + Vite application
├── backend/    # API and server-side code
└── README.md
```

## Frontend

The React app lives in [frontend](frontend). It uses Vite and contains the current UI delivered in the first push.

Inside the frontend, the source code now follows a clearer React structure:

```
frontend/src/
├── pages/
│   ├── auth/
│   └── public/
├── routes/
├── styles/
├── components/
├── layouts/
├── hooks/
└── services/
```

## Backend

[backend](backend) now contains a minimal Express API scaffold with a root health check and ready-to-extend middleware/routes layout.

Backend structure:

```
backend/
├── src/
│   ├── middleware/
│   ├── routes/
│   ├── app.js
│   └── server.js
└── package.json
```

## Running the frontend

```bash
npm install
npm run dev --workspace frontend
```

## Running the backend

```bash
npm install
npm run dev --workspace backend
```

## Running both

```bash
npm install
npm run dev
```

The frontend starts on Vite's default port, and the API starts on `http://localhost:5000` by default.

## Database Setup (PostgreSQL)

The backend expects a PostgreSQL database named `stockpro_db`.

Current DB role model in this phase:

- `company_admin`: at most one active admin per company (tenant-scoped)
- `employee`: company user under subscription employee limits
- `platform master admin`: global account for the platform team (outside tenant users)

Seeded platform master admin (development):

- Email: `stockpro@admin.com`
- Password: `StockPro@Admin2026`

From the repository root:

```powershell
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/migrations/2026-04-09_user-model-finalization.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql
```

The finalized user model contract is documented at `backend/db/contracts/user-schema-contract.md`.

Create a local backend env file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update `backend/.env` with your own database credentials (especially `DB_USER` and `DB_PASSWORD`).

For full backend setup details, see [backend/README.md](backend/README.md).

## Notes

The old single-folder `client` layout has been replaced so the repo can grow cleanly as a full-stack project.

## Project Setup Checklist

- [x] Backend setup path is documented and verified in the local workspace.
- [x] Backend startup contract is enforced in a clean config scenario.
- [x] The backend environment-variable contract is frozen at startup.
- [x] Startup validation covers required and numeric env values.
- [x] The stable backend development runbook is documented.

## Stable Dev Runbook

1. Install dependencies from the repository root.
2. Confirm `backend/.env` exists. If needed, copy `backend/.env.example` to `backend/.env`.
3. Set the required backend variables in `backend/.env`:
   - `DB_HOST`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
4. Keep numeric values valid:
   - `PORT`
   - `DB_PORT`
   - `DB_POOL_MAX`
   - `DB_IDLE_TIMEOUT_MS`
   - `DB_CONNECTION_TIMEOUT_MS`
5. Start both apps with `npm run dev` from the repository root.
6. If the backend fails fast, fix the env file first. The startup validation is intentional.

Known-good validation results:

- Backend starts successfully with the current local configuration.
- Missing or blank `DB_PASSWORD` fails fast.
- Invalid numeric `DB_PORT` fails fast.

