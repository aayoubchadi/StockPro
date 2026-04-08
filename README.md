# Stage-FE

Repository layout for the stock management project.

## Structure

```
Stage-FE/
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

From the repository root:

```powershell
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/schema.sql
"C:\dev\PostGreSQL\bin\psql.exe" -U postgres -h localhost -p 9100 -d stockpro_db -f backend/db/seed.sql
```

Create a local backend env file:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update `backend/.env` with your own database credentials (especially `DB_USER` and `DB_PASSWORD`).

For full backend setup details, see [backend/README.md](backend/README.md).

## Notes

The old single-folder `client` layout has been replaced so the repo can grow cleanly as a full-stack project.
