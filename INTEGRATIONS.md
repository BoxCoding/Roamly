# Integration setup and current status

## Working now

- ChatGPT sign-in and sign-out supplied by Sites.
- Email + password registration and sign-in.
- Google sign-in (after credentials are configured; see below).
- Profile and up to 10 vehicles per account, stored in D1. Every profile read/write uses the server identity; client-supplied owner IDs are rejected.
- 16 curated routes, sightseeing places, rest/food search areas, and stay-area searches.
- Public community references for India Bull Riders, xBhp and Enfield Rider’s Community, alongside clearly labeled sample/local groups. External membership stays on the official community sites.
- Mileage, seating and fuel/charging assumptions; group and per-person cost breakdowns.
- Browser-local scheduled reminders and downloadable calendar events with alarms.

## AI: Google Gemini

`/api/ai-plan` calls the Gemini `generateContent` API (JSON-schema structured output) when `GEMINI_API_KEY` is set on the server; `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`.

It runs four specialist agents in parallel (`lib/agents.mjs`): **itinerary** (days, places, stays from the catalog only), **road** (per-day segments, km, drive hours, terrain, cautions, permits, vehicle prep), **budget** (route-specific costs on top of the deterministic `estimate()` baseline, plus savings tips) and **expert** (overview, season, health/altitude, packing, network, etiquette, emergency). Each answer is schema-validated; a failed agent leaves its section curated. One "Build my trip plan" uses one of the user's 10 daily AI requests. With **✎ My own route** the user types From, To and up to 5 stops; there are no catalog places, so the itinerary agent names real places itself (bounded, escaped, shown as Google Maps search links) and the curated place/stay cards are hidden. The key is sent only in the `x-goog-api-key` header from the server, never to the browser. Locally put it in `.dev.vars` (gitignored) and restart the dev server.

The endpoint requires sign-in, checks origin and request size, validates inputs and outputs, allows up to 30 days and 10 requests per account per UTC day, and uses a 30-second timeout. Only route and trip preferences are sent to Gemini; profile data and vehicle identifiers are excluded. Failed provider calls consume a request allowance. AI can reorganize only catalog place IDs and stay areas. It cannot confirm navigation, live access, availability, prices or safety. Without configuration, the app clearly uses the curated outline.

Reference: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output).

## Email registration

`/api/auth/register` and `/api/auth/login` store accounts in the D1 `users` table (migration `drizzle/0002_*`). Passwords are salted PBKDF2-SHA256 (100k iterations, the Workers limit). Five wrong passwords lock the account for 15 minutes. Sessions share the same signed 30-day cookie as Google; `/api/auth/logout` clears it. Email accounts are separate from ChatGPT/Google accounts.

Session signing key: set `SESSION_SECRET` (`openssl rand -base64 32`) as a hosted secret in production. If it is unset the app generates one and stores it in the D1 `app_secrets` table, which works but means anyone with database access can forge sessions.

Not built yet: email verification and password reset (both need an email delivery service).

## Google login: built, needs credentials

`/api/auth/google` runs the OpenID Connect authorization-code flow with PKCE, `state` and `nonce`, then stores a 30-day HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie. Google users get their own account (`google:<sub>`); they are never merged with a ChatGPT account, even when the email matches. If a ChatGPT identity is present it takes priority. The Google button is hidden until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

Setup:

1. In Google Cloud, configure the OAuth consent screen and create a **Web application** OAuth client.
2. Add the authorized redirect URI `<origin>/api/auth/google/callback` for every origin you use, e.g. `http://localhost:5173/api/auth/google/callback` for local dev and the HTTPS production origin.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (and optionally `SESSION_SECRET`, see below). Locally put them in `.dev.vars` (gitignored) and restart `npm run dev`; in production set them as hosted secrets.
4. Rotating `SESSION_SECRET` signs everyone out.

Hosting caveat: production Sites keeps its private ChatGPT access gate in front of the app. Google login only helps visitors who can reach the app, so check whether your host lets non-ChatGPT users in before relying on it.

Reference: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

## Meta login: setup required, no adapter yet

To prepare Meta login:

1. Create a Meta developer app with the appropriate Facebook Login product/use case.
2. Configure the app domain, privacy policy, user-data deletion instructions and callback URL supplied by the chosen auth service.
3. Keep the app secret server-side. Request only the approved identity permissions the app needs.
4. Complete any required review/live-mode checks. Implement state verification, server-side code exchange, identity validation and secure account linking through maintained tooling.
5. Confirm which Meta product is intended: Facebook Login authenticates Facebook identities; Instagram group discovery is a separate capability and permission process.

Reference: [Meta Facebook Login documentation](https://developers.facebook.com/docs/facebook-login/).

## Alerts

Times use the browser's local timezone. In-app timers can be delayed by tab throttling or device sleep and do not run after the page closes. Calendar exports use UTC timestamps and include display alarms. Import the file into your calendar and check its notification settings. Background push, email and SMS delivery have not been implemented; they need a delivery service and notification permissions.

## Data and estimates

Profile and vehicle data sync across devices through the private account API. Saved routes, demo communities and reminders remain in account-separated browser storage. Sample community hosts/scores are illustrative; meetup schedules are not confirmed events. Accommodation is suggested by area, not by claimed hotel availability. Map links open external Google Maps searches. Costs, mileage, stay ranges, distances and time allowances are editable planning assumptions.

Route references are included in each detail view, including [Incredible India](https://www.incredibleindia.gov.in/en/trips/trip-listing), [Karnataka Tourism](https://karnatakatourism.org/en/attractions/virupaksha-temple/) and [Kerala Tourism](https://www.keralatourism.org/destination/munnar/202/).

Public community references: [India Bull Riders chapters](https://indiabullriders.com/chapters/), [xBhp](https://www.xbhp.com/), [Enfield Rider’s Community](https://www.enfieldriderscommunity.com/). No affiliation, member import or verified credibility is implied.
