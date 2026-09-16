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

Vercel's filesystem is not persistent, so SQLite data in this serverless setup can be lost between deployments or function instances. For production data, replace SQLite with a hosted database such as Neon Postgres or Vercel Postgres. Alternatively, deploy the `server` folder to a Node.js host with persistent disk storage.
