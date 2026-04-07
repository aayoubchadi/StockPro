# Stage-FE

Repository layout for the stock management project.

## Structure

```
Stage-FE/
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

[backend](backend) is reserved for the API, server logic, database access, and future auth/reporting work.

## Running the frontend

```bash
cd frontend
npm install
npm run dev
```

## Notes

The old single-folder `client` layout has been replaced so the repo can grow cleanly as a full-stack project.
