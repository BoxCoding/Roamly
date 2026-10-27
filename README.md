# Roamly

A responsive road-trip community prototype for bike and car travelers in India.

Run locally: `python3 -m http.server 4173 --directory dist`

Check calculations and filtering: `node test.mjs`

No build step or dependencies. Uses external Google Fonts and bundled Unsplash photos.

Working features: route filters and details, saved trips, local demo profiles, join/leave communities, create local groups, city/name/vehicle search, seasonal route filtering, budget calculator, daily outline, plan download, and external Instagram/Facebook searches.

## Limits

This is a browser-local prototype, not a production service. No secure application login, multi-user synchronization, social OAuth, imported groups, live locations, maps, live road/weather data, or language model is connected. The private hosting access gate is separate from the in-app demo profile. Curated routes, members, and scores are samples. New groups remain unrated. Do not use sample credibility as a safety guarantee.

Budget assumes one rider per bike, four people per car, 32 km/l for bikes, 14 km/l for cars, ₹105/l fuel, two people per room, ₹650 food per person/day, extras, and 15% contingency. Seasonal guidance is a static planning aid and must be checked against current local conditions.

Production follow-up requires authenticated server-side accounts and authorization, shared database records, an AI provider secret held only on the server, authorized social-platform APIs, and live route/weather providers. Do not put API secrets in browser JavaScript.
