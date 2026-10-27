# Integration setup and current status

## Working now

- ChatGPT sign-in and sign-out supplied by Sites.
- Profile and up to 10 vehicles per account, stored in D1. Every profile read/write uses the server identity; client-supplied owner IDs are rejected.
- 16 curated routes, sightseeing places, rest/food search areas, and stay-area searches.
- Public community references for India Bull Riders, xBhp and Enfield Rider’s Community, alongside clearly labeled sample/local groups. External membership stays on the official community sites.
- Mileage, seating and fuel/charging assumptions; group and per-person cost breakdowns.
- Browser-local scheduled reminders and downloadable calendar events with alarms.

## AI: endpoint ready, not enabled

`/api/ai-plan` calls the OpenAI Responses API only when `OPENAI_API_KEY` and `OPENAI_MODEL` are configured on the server. Use the OpenAI Developers plugin's secure API-key setup workflow. Configure a model enabled for your account that supports Responses and structured outputs. Never put the key in public assets or paste it into chat.

The endpoint requires sign-in, checks origin and request size, validates inputs and outputs, allows up to 30 days and 10 requests per account per UTC day, and uses a 30-second timeout. Only route and trip preferences are sent to the AI provider; profile data and vehicle identifiers are excluded. Failed provider calls consume a request allowance. AI can reorganize only catalog place IDs and stay areas. It cannot confirm navigation, live access, availability, prices or safety. Without configuration, the app clearly uses the curated outline.

References: [Responses structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create).

## Google and Meta login: setup required, no active OAuth adapter

The current Sites hosting boundary owns authentication and supplies ChatGPT identity. Google/Meta buttons are disabled and labeled setup pending; they do not simulate a login. Provider credentials alone do not replace the private Sites access gate. Confirm that the hosting platform supports external identity, or choose a host/auth service that does, before implementing the adapters. Preserve the site's audience while doing this.

To prepare Google login:

1. Create a Google Cloud project and OAuth consent configuration for the app.
2. Register a Web OAuth client, authorized HTTPS origin, and the exact callback URL supplied by the chosen auth service. Do not register a guessed callback: no Google callback exists in this app yet.
3. Request the minimum identity scopes (`openid`, `profile`, and `email` only if needed).
4. Keep the client secret server-side. Use maintained provider tooling with authorization-code flow, state/nonce, token verification and secure sessions.
5. Test consent, denied/cancelled login, sign-out and account linking. Never merge accounts based only on an unverified email.

Reference: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect).

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
