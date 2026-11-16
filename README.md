# Roamly

Road-trip discovery and planning for bike and car travelers in India.

## Run and verify

- Needs Node 22+ and a local Postgres. Create a database (`createdb roamly`) and copy `.env.example` to `.env.local` with `DATABASE_URL` (and `GEMINI_API_KEY` for AI).
- `npm run dev` starts Next.js on http://localhost:5173. Pending migrations in `drizzle/` are applied automatically at server start (`instrumentation.ts`).
- Unit checks: `npm test`. With the dev server running: `node test-auth.mjs`, `node test-profile.mjs`, `node test-register.mjs` and `node test-groups.mjs` (set `ADMIN_EMAILS=moderator@roamly.test` locally for the moderation checks).
- Type check: `npx tsc --noEmit`. Production build: `npm run build`.
- Schema change: edit `db/schema.ts`, then `npm run db:generate`.

## Deploy (Google Cloud)

Cloud Run (asia-south1) runs the Next.js standalone server from `Dockerfile`; data lives in Cloud SQL Postgres `roamly-db`. Secrets `DATABASE_URL`, `SESSION_SECRET` and `GEMINI_API_KEY` are in Secret Manager. Redeploy with `deploy/gcp.sh` (optionally `ADMIN_EMAILS=you@example.com deploy/gcp.sh` to set moderators).

## Features

16 searchable routes, detailed communities, sightseeing and stay/stop searches, group and per-person estimates, account-backed profiles with multiple vehicles, and in-app/calendar reminders. Email/password registration works out of the box; Google login turns on once its credentials are set; Meta login and live AI await service setup. The app labels these states explicitly.

See [INTEGRATIONS.md](INTEGRATIONS.md) for exact setup requirements, authentication boundaries, API limits and remaining prototype limitations.

## Identity and data

Riders sign in with email/password (PBKDF2) or Google (when configured). Identity comes only from a signed, HttpOnly session cookie; proxy headers are never trusted. `/api/profile` reads/writes only the current account; writes require same-origin JSON and a version stamp. Crews, members and reports are shared in Postgres; saved trips and reminders stay in the browser.

Uses bundled illustrative Unsplash photos and Google Fonts. Seasonal notes, costs, attraction durations and community scores are planning aids, not verified real-time safety or availability data.
