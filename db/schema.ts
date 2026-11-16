import { boolean, doublePrecision, index, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

// One row per signed-in identity (google:…, facebook:…, user:…). publicId is what other riders see in URLs.
// role: rider | admin. status: active | suspended.
export const accounts = pgTable('accounts', {
  userId: text('user_id').primaryKey(),
  publicId: text('public_id').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().default(''),
  provider: text('provider').notNull(),
  role: text('role').notNull().default('rider'),
  status: text('status').notNull().default('active'),
  suspendReason: text('suspend_reason').notNull().default(''),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
}, t => [index('accounts_role_idx').on(t.role)]);

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  details: text('details').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiQuota = pgTable('ai_quota', {
  userId: text('user_id').primaryKey(),
  day: text('day').notNull(),
  calls: integer('calls').notNull().default(0),
});

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  failedLogins: integer('failed_logins').notNull().default(0),
  lockedUntil: text('locked_until'),
});

// shortcut: session signing key auto-created in the DB when SESSION_SECRET is unset; set the secret in production.
export const appSecrets = pgTable('app_secrets', {
  name: text('name').primaryKey(),
  value: text('value').notNull(),
});

// Rider crews shared by everyone. status: active | hidden (auto-hidden by reports) | removed (by a moderator).
export const crews = pgTable('crews', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  vehicle: text('vehicle').notNull(),
  description: text('description').notNull(),
  meetup: text('meetup').notNull(),
  cadence: text('cadence').notNull(),
  links: text('links').notNull().default('{}'),
  organizerId: text('organizer_id').notNull(),
  organizerName: text('organizer_name').notNull(),
  createdAt: text('created_at').notNull(),
  status: text('status').notNull().default('active'),
  // public: anyone can join. private: listed, but joining needs approval and links are members-only.
  visibility: text('visibility').notNull().default('public'),
}, t => [index('crews_organizer_idx').on(t.organizerId), index('crews_status_idx').on(t.status)]);

export const crewMembers = pgTable('crew_members', {
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  joinedAt: text('joined_at').notNull(),
  // role: owner | colead | member. status: active | pending (asked to join a private group).
  role: text('role').notNull().default('member'),
  status: text('status').notNull().default('active'),
}, t => [primaryKey({ columns: [t.crewId, t.userId] }), index('crew_members_user_idx').on(t.userId)]);

// One report per rider per crew; moderators clear them when they act.
export const crewReports = pgTable('crew_reports', {
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull(),
  reason: text('reason').notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, t => [primaryKey({ columns: [t.crewId, t.reporterId] })]);

// A planned group ride inside a crew. Route is a catalog trip or a custom from/to; brief is the shared AI ride brief (JSON).
export const rides = pgTable('rides', {
  id: text('id').primaryKey(),
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  routeId: text('route_id').notNull(),
  route: text('route').notNull().default('{}'),
  startDate: text('start_date').notNull(),
  days: integer('days').notNull(),
  meetupPoint: text('meetup_point').notNull(),
  meetupTime: text('meetup_time').notNull(),
  capacity: integer('capacity').notNull(),
  minExperience: text('min_experience').notNull().default('Beginner'),
  vehicle: text('vehicle').notNull(),
  stay: text('stay').notNull().default('Comfort'),
  distanceKm: integer('distance_km').notNull(),
  description: text('description').notNull().default(''),
  leadId: text('lead_id').notNull(),
  status: text('status').notNull().default('scheduled'),
  brief: text('brief'),
  briefAt: text('brief_at'),
  briefCount: integer('brief_count').notNull().default(0),
  // Snapshot of a saved plan the lead attached (JSON), so riders see the same route and stays.
  plan: text('plan'),
  createdAt: text('created_at').notNull(),
}, t => [index('rides_crew_idx').on(t.crewId), index('rides_start_idx').on(t.startDate)]);

// status: going | maybe | waitlist. checklist: JSON array of ticked checklist item IDs.
export const rideRsvps = pgTable('ride_rsvps', {
  rideId: text('ride_id').notNull().references(() => rides.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  status: text('status').notNull(),
  checklist: text('checklist').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
}, t => [primaryKey({ columns: [t.rideId, t.userId] }), index('ride_rsvps_user_idx').on(t.userId)]);

// Notes from the ride lead and crew leads; pinned ones show first.
export const rideUpdates = pgTable('ride_updates', {
  id: text('id').primaryKey(),
  rideId: text('ride_id').notNull().references(() => rides.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull(),
  authorName: text('author_name').notNull(),
  body: text('body').notNull(),
  pinned: boolean('pinned').notNull().default(false),
  createdAt: text('created_at').notNull(),
}, t => [index('ride_updates_ride_idx').on(t.rideId)]);

// A rider's saved, editable trip plans (JSON validated by lib/plan-schema.mjs).
export const plans = pgTable('plans', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  data: text('data').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, t => [index('plans_user_idx').on(t.userId)]);

// OpenStreetMap geocoding cache, keyed by the normalized place query. lat/lng are null when nothing was found.
export const geocodes = pgTable('geocodes', {
  query: text('query').primaryKey(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  label: text('label').notNull().default(''),
  createdAt: text('created_at').notNull(),
});
