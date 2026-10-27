# Roamly

A road-trip community prototype for bike and car travelers in India.

## Run and check

- Install using the Sites dependency helper, or `npm install`.
- Run locally: `npm run dev`.
- Check calculations and filtering: `node test.mjs`.
- With the local dev server running: `node test-auth.mjs http://localhost:5173`.
- Production build: use the Sites `build-site.mjs` helper.

## Sign in

Sign in and sign out use the hosting platform’s ChatGPT authentication. The server-only starter helper reads the trusted identity headers supplied by Sites. `/api/session` returns only the user ID and display name, with private/no-store caching. Credentials and tokens are never stored in browser localStorage. Return paths are fixed to the site root using the starter's validated auth URL helpers.

The profile UI reflects the server session. Creating or joining demo groups requires sign-in. Saved trips and group activity remain browser-local and are separated by account ID; they do not sync across devices and are not sensitive server records. The old unverified demo profile is no longer used. Existing `roamly-v1` browser data is preserved but not automatically assigned to a verified account.

The local Sites development middleware provides a test identity (Seedy) for loopback-only testing and strips caller-supplied identity headers. This mock runs only in development. Production sign-in uses the hosting platform; do not expose the development server to the internet.

The hosted app retains its existing private audience; authentication does not grant new viewers site access.

## Remaining prototype limits

No shared database, social OAuth/imports, live locations, live road/weather data, or language model is connected. Social buttons open external searches. Routes, members, and scores are samples. New groups remain unrated.

Budget assumes one rider per bike, four people per car, 32 km/l for bikes, 14 km/l for cars, ₹105/l fuel, two people per room, ₹650 food per person/day, extras, and 15% contingency. Static seasonal guidance and sample credibility are not verified safety advice.

Uses bundled Unsplash photos and external Google Fonts.
