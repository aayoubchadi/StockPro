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

1. Ensure PostgreSQL is running.
2. Create the database if it does not already exist.
3. Run schema and seed scripts.
4. Configure backend environment variables.

### 1) Create and Initialize Database

From the repository root, run:

```powershell
"C:\dev\PostGreSQL\bin\createdb.exe" -U postgres -h localhost -p 9100 stockpro_db
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql
```

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

### 3) Update Required `.env` Values

You should update these values in `backend/.env`:

- `DB_HOST` and `DB_PORT`: PostgreSQL host/port in your machine.
- `DB_NAME`: target database name (default `stockpro_db`).
- `DB_USER`: application database user (default `stockpro`).
- `DB_PASSWORD`: your real DB password.

Optional tuning values:

- `DB_POOL_MAX`
- `DB_IDLE_TIMEOUT_MS`
- `DB_CONNECTION_TIMEOUT_MS`

### 4) Verify Connection

Start backend and check:

```bash
npm run dev
```

Then request `GET /health`. The response includes database status when connection succeeds.

## Endpoints

- `GET /` returns a simple API status payload.
- `GET /health` returns uptime, timestamp, and PostgreSQL connectivity status.