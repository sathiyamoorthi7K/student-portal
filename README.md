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

## Authentication

The API requires email/password authentication. Passwords are hashed with bcrypt, and the JWT is stored in an HttpOnly cookie. Add these Render environment variables:

```text
DATABASE_URL=your_neon_connection_string
JWT_SECRET=a-long-random-secret
FRONTEND_URL=https://your-vercel-domain.vercel.app
NODE_ENV=production
```

The frontend uses `credentials: 'include'` for session cookies. Account creation and login are available from the frontend; student list and create endpoints return `401` without a valid session.
