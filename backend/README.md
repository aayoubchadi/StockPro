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

## Endpoints

- `GET /` returns a simple API status payload.
- `GET /health` returns uptime and timestamp for basic monitoring.