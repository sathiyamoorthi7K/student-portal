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

Deploy the `client` as a Vercel static site and deploy the `server` as a persistent Node.js service, such as Render or Railway. Set the Vercel environment variable `VITE_API_URL` to the public URL of the deployed API, for example `https://student-api.example.com`, then redeploy the frontend.

The API uses SQLite, so its service must have persistent disk storage. Vercel's static deployment does not run `server/index.js` and therefore cannot serve `/api/students` by itself.
