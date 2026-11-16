# Roamly launch roadmap

Goal: turn Roamly from a trip-planning prototype into a rider community product. Riders should
plan routes and stays with AI, ride together in groups, and share what they learn. Each phase ships
on its own, is deployed and tested, and is then pushed.

## Who can do what

| Role | Scope | Can do |
|---|---|---|
| **Visitor** | not signed in | Browse routes, public groups, public rides and posts. |
| **Rider** (normal user) | whole app | Profile and garage, AI planner, join public groups, RSVP to rides, post, comment, react, follow riders, report. |
| **Group member** | one group | See the group's members-only rides, updates and plans; RSVP; post in the group. |
| **Group co-lead** | one group | Everything a member can, plus create and edit rides, approve join requests, pin updates. |
| **Group owner** | one group | Everything a co-lead can, plus edit the group, make it public or private, promote and remove members, delete the group. |
| **Platform admin** | whole app | Admin dashboard: users, groups, rides, posts, reports; suspend users; feature routes and groups; AI usage and cost. |

A rider is a normal user everywhere and gets group powers only inside the groups where they are an owner or co-lead.

## Phases

### Phase 1: Roles and groups (foundation) — done
- Group roles (owner, co-lead, member), public or private groups, join requests with approval.
- Admin role in the database (not only `ADMIN_EMAILS`), suspend or ban users, an admin dashboard for users, groups and reports.
- Rider public profile page (name, city, vehicles, groups, links).

### Phase 2: Group rides (planning rides together) — done
- A group ride has a date, a route (catalog or custom), a meetup point and time, a capacity, a minimum experience level and a ride lead.
- Riders RSVP as going, maybe or waitlist. Each rider has a checklist (documents, vehicle check, gear) and a member list.
- An AI ride brief is generated once per ride and shared by every member (route, stays, fuel, cautions, budget per rider).
- Ride updates board: pinned notes from the lead, and timeline updates such as "regroup at Lonavala".
- Calendar file (.ics) and WhatsApp share links.

### Phase 3: Route and stay planning
- Map of the route (Leaflet with OpenStreetMap, no per-request cost) with day segments, fuel stops and stays.
- Stays are planned per night with area, budget band and type (hotel, homestay, camp, dharamshala), plus booking-site search links. No invented hotel names.
- Plans can be edited and saved: change stops, swap stays, then recalculate budget and distance without new AI calls.
- Saved plans are stored in the account and can be attached to a group ride.

### Phase 4: Engagement and sharing
- Ride feed: posts, photos and ride reports (road condition, fuel availability, police checks, weather) tagged to a route and date.
- Comments and reactions, following riders and groups, a "road intel" view per route with the latest reports first.
- Rider stats and badges from completed rides (km, states, ghats, first ride with a group) and group leaderboards.
- In-app notifications for RSVPs, approvals, ride updates and replies, with optional email.

### Phase 5: Launch readiness
- Database backups on, uptime and error monitoring, rate limits on every write.
- Terms of service, community guidelines, content moderation (rules first, AI only on flagged posts).
- Installable PWA, link previews for shared rides and posts, a custom domain, SEO pages for routes.
- Image uploads to Cloud Storage with resizing and size limits.

## AI and token cost plan

The AI model stays `gemini-3.1-flash-lite`, the cheapest one in use. Costs are kept down by calling it less, not by using a weaker product.

1. **Cache plans.** Normalize a plan request (route, days, vehicle, month, travellers, budget band) to a key and store the answer in Postgres. The same request returns the cached plan without any AI call. Catalog routes are popular, so most requests become cache hits.
2. **One AI brief per group ride**, shared by every member, instead of one per rider.
3. **Compute what can be computed.** Fuel, tolls, stay ranges, distances already in the catalog, budget totals and edits after a plan is made are all plain code.
4. **Fewer, smaller calls.** Today 4 agents each receive the same route facts. Merge them into 2 calls (route+stay, budget+expert), send compact facts, keep output schemas tight, and cap output tokens.
5. **Pre-generate** briefs for the catalog routes for each season once (a batch job), so they cost nothing at request time.
6. **Quotas by role** (for example riders 5 fresh plans a day, group leads more) and an admin view of daily AI calls and estimated cost.
7. **AI moderation only after rules.** Keyword and link rules run first; AI checks only posts that are flagged or reported.

## Not planned yet
Live location sharing during rides, in-app chat (WhatsApp and Telegram links cover it), payments for paid rides, and native mobile apps.
