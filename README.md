# Student Ledger

A student registration and directory app built with React, Express, and SQLite.

## Run locally

Requires Node.js 18+.

```bash
npm install
npm run install:all
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:4000 and creates `server/students.db` automatically.

## Deployment

The project can be deployed as one Vercel project. The `api/index.js` entry point exposes the Express API at `/api`, while the Vite build publishes the client. Leave `VITE_API_URL` unset so the frontend calls the same Vercel domain.

For production records, create a Neon Postgres database and add its connection string as the Vercel environment variable `DATABASE_URL`. The API uses Neon when `DATABASE_URL` is set and automatically creates the `students` table on first request. Without that variable, local development continues to use SQLite.
