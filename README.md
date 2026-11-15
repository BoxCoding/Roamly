# Roamly

Road-trip discovery and planning for bike and car travelers in India.

## Run and verify

- Start the local Sites development server: `npm run dev`.
- Unit checks: `npm test`.
- With the local dev server running: `node test-auth.mjs`, `node test-profile.mjs`, `node test-register.mjs` and `node test-groups.mjs` (each takes `http://127.0.0.1:5173`).
- Type check: `node node_modules/typescript/bin/tsc --noEmit`.
- Build using the Sites `build-site.mjs` helper.

The app now uses the Sites D1 binding `DB`. For a fresh local database, build once to generate the Worker config, then apply the pending SQL migrations in `drizzle/` in order with Wrangler D1 using `.wrangler/state`. Do not replay migrations already applied. Sites applies hosted migrations during deployment.

## Features

16 searchable routes, detailed communities, sightseeing and stay/stop searches, group and per-person estimates, account-backed profiles with multiple vehicles, and in-app/calendar reminders. Email/password registration works out of the box; Google login turns on once its credentials are set; Meta login and live AI await service setup. The app labels these states explicitly.

See [INTEGRATIONS.md](INTEGRATIONS.md) for exact setup requirements, authentication boundaries, API limits and remaining prototype limitations.

## Identity and data

Sites checks ChatGPT identity server-side. `/api/profile` reads/writes only the current account's profile and vehicles; writes require same-origin JSON and include a version stamp to prevent silent overwrites. Existing `roamly-v1` demo data remains untouched. Local saved trips/groups/reminders still use `roamly-v2:<account>`; no passwords or authentication tokens are stored there.

The loopback-only development sign-in uses the starter's test identity, Seedy, and strips caller-supplied identity headers. Production uses the private Sites authentication gate. Do not expose the development server to the internet.

Uses bundled illustrative Unsplash photos and Google Fonts. Seasonal notes, costs, attraction durations and community scores are planning aids, not verified real-time safety or availability data.
