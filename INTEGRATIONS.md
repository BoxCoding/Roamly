# Integration setup and current status

## Working now

- Email + password registration and sign-in.
- Google and Facebook sign-in (each after its credentials are configured; see below).
- Profile and up to 10 vehicles per account, stored in Postgres. Every profile read/write uses the server identity; client-supplied owner IDs are rejected.
- 16 curated routes, sightseeing places, rest/food search areas, and stay-area searches.
- Public community references for India Bull Riders, xBhp and Enfield Rider’s Community, alongside clearly labeled sample/local groups. External membership stays on the official community sites.
- Mileage, seating and fuel/charging assumptions; group and per-person cost breakdowns.
- Browser-local scheduled reminders and downloadable calendar events with alarms.

## AI: Google Gemini

`/api/ai-plan` calls the Gemini `generateContent` API (JSON-schema structured output) when `GEMINI_API_KEY` is set on the server; `GEMINI_MODEL` defaults to `gemini-3.1-flash-lite`.

It runs four specialist agents in parallel (`lib/agents.mjs`): **itinerary** (days, places, stays from the catalog only), **road** (per-day segments, km, drive hours, terrain, cautions, permits, vehicle prep), **budget** (route-specific costs on top of the deterministic `estimate()` baseline, plus savings tips) and **expert** (overview, season, health/altitude, packing, network, etiquette, emergency). Each answer is schema-validated; a failed agent leaves its section curated. One "Build my trip plan" uses one of the user's 10 daily AI requests. With **✎ My own route** the user types From, To and up to 5 stops; there are no catalog places, so the itinerary agent names real places itself (bounded, escaped, shown as Google Maps search links) and the curated place/stay cards are hidden. For every route (catalog or custom) the total distance is replaced by the road agent's per-day km total and the budget is recalculated with it. The key is sent only in the `x-goog-api-key` header from the server, never to the browser. Locally put it in `.dev.vars` (gitignored) and restart the dev server.

The endpoint requires sign-in, checks origin and request size, validates inputs and outputs, allows up to 30 days and 10 requests per account per UTC day, and uses a 30-second timeout. Only route and trip preferences are sent to Gemini; profile data and vehicle identifiers are excluded. Failed provider calls consume a request allowance. AI can reorganize only catalog place IDs and stay areas. It cannot confirm navigation, live access, availability, prices or safety. Without configuration, the app clearly uses the curated outline.

Reference: [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output).

## Email registration

`/api/auth/register` and `/api/auth/login` store accounts in the Postgres `users` table. Passwords are salted PBKDF2-SHA256 (100k iterations). Five wrong passwords lock the account for 15 minutes. Sessions share the same signed 30-day cookie as Google; `/api/auth/logout` clears it. Email accounts are separate from Google accounts.

Session signing key: set `SESSION_SECRET` (`openssl rand -base64 32`) in production (Cloud Run reads it from Secret Manager). If it is unset the app generates one and stores it in the `app_secrets` table, which works but means anyone with database access can forge sessions.

Not built yet: email verification and password reset (both need an email delivery service).

## Google login: built, needs credentials

`/api/auth/google` runs the OpenID Connect authorization-code flow with PKCE, `state` and `nonce`, then stores a 30-day HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie. Google users get their own account (`google:<sub>`); they are never merged with an email account, even when the email matches. The Google button is hidden until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set.

Setup:

1. In Google Cloud, configure the OAuth consent screen and create a **Web application** OAuth client.
2. Add the authorized redirect URI `<origin>/api/auth/google/callback` for every origin you use, e.g. `http://localhost:5173/api/auth/google/callback` for local dev and the HTTPS production origin.
3. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (and optionally `SESSION_SECRET`, see below). Locally put them in `.env.local` (gitignored) and restart `npm run dev`; on Cloud Run create Secret Manager secrets named `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and rerun `deploy/gcp.sh` (it wires in any of these secrets that exist).
4. Rotating `SESSION_SECRET` signs everyone out.

Reference: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

## Facebook (Meta) login: built, needs credentials

`/api/auth/meta` runs the Facebook Login OAuth code flow with a sealed `state` cookie, exchanges the code server-side and reads `id,name,email` from the Graph API with `appsecret_proof`. Facebook users get their own account (`facebook:<id>`), never merged with email or Google accounts. The button is hidden until `META_APP_ID` and `META_APP_SECRET` are set.

Setup:

1. At developers.facebook.com create an app with the **Facebook Login** use case; request `public_profile` and `email`.
2. Add the valid OAuth redirect URI `<origin>/api/auth/meta/callback` (production: `https://roamly-526696942469.asia-south1.run.app/api/auth/meta/callback`). Set the app domain, privacy policy URL and data-deletion instructions, then switch the app to Live.
3. Create Secret Manager secrets `META_APP_ID` and `META_APP_SECRET` and rerun `deploy/gcp.sh`. Locally put them in `.env.local`.

Reference: [Meta Facebook Login documentation](https://developers.facebook.com/docs/facebook-login/).

## Alerts

Times use the browser's local timezone. In-app timers can be delayed by tab throttling or device sleep and do not run after the page closes. Calendar exports use UTC timestamps and include display alarms. Import the file into your calendar and check its notification settings. Background push, email and SMS delivery have not been implemented; they need a delivery service and notification permissions.

## Data and estimates

Profile and vehicle data sync across devices through the private account API. Saved routes, demo communities and reminders remain in account-separated browser storage. Sample community hosts/scores are illustrative; meetup schedules are not confirmed events. Accommodation is suggested by area, not by claimed hotel availability. Map links open external Google Maps searches. Costs, mileage, stay ranges, distances and time allowances are editable planning assumptions.

Route references are included in each detail view, including [Incredible India](https://www.incredibleindia.gov.in/en/trips/trip-listing), [Karnataka Tourism](https://karnatakatourism.org/en/attractions/virupaksha-temple/) and [Kerala Tourism](https://www.keralatourism.org/destination/munnar/202/).

Public community references: [India Bull Riders chapters](https://indiabullriders.com/chapters/), [xBhp](https://www.xbhp.com/), [Enfield Rider’s Community](https://www.enfieldriderscommunity.com/). No affiliation, member import or verified credibility is implied.

## Rider social links and group channels

- **Rider profile** (saved with the profile in Postgres): optional Instagram, YouTube, Facebook and website links. Server validates each with `cleanLinks(links, PROFILE_LINKS)`: https only, on the platform's own domain, stored in cleaned form. Chat invites are not allowed on profiles.
- **Groups**: optional WhatsApp (`chat.whatsapp.com`, `whatsapp.com/channel`) and Telegram (`t.me`) join links next to the social links. `wa.me` links are rejected because they expose a personal phone number.
- A group shows its organizer's current profile links under "Connect with …" (read live from the organizer's profile).

## Shared crews (server)

`/api/groups` stores rider crews in Postgres (`crews`, `crew_members`, `crew_reports`), so everyone sees the same list:

- `GET` is public: up to 200 newest crews with member counts; signed-in viewers also get `joined` and `mine`. Organizer IDs never leave the server.
- `POST` creates a crew (signed in, same-origin, zod-validated, links cleaned). One organizer can run at most 5 crews.
- `PATCH {id, joined}` joins or leaves; `DELETE {id}` is organizer-only and removes members too.
- Sample crews and the public directory are still static examples. Old browser-only demo groups are no longer shown.

## Reports and moderation

- Any signed-in rider (not the organizer) can report a crew once, with a reason (spam, scam, unsafe, offensive, fake, other) and an optional note: `POST /api/groups/report`.
- After **3 distinct reporters** the crew is hidden from everyone except its organizer, who sees it as "under review". Hidden crews cannot be joined.
- Moderators are the emails in `ADMIN_EMAILS`, signed in **with Google** (Google verifies the email; email/password and Facebook emails are not trusted for moderation in production). They get a "Moderation queue" button: `GET /api/moderation` lists hidden and reported crews with reasons and notes (never who reported). `POST /api/moderation {id, action}`: `restore` makes it active and clears reports; `remove` hides it for everyone (kept for the record).
- Not built: appeals, notifying organizers, banning accounts, automatic text filtering.
