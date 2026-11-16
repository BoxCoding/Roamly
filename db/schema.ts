import { index, integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

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
}, t => [index('crews_organizer_idx').on(t.organizerId), index('crews_status_idx').on(t.status)]);

export const crewMembers = pgTable('crew_members', {
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  joinedAt: text('joined_at').notNull(),
}, t => [primaryKey({ columns: [t.crewId, t.userId] })]);

// One report per rider per crew; moderators clear them when they act.
export const crewReports = pgTable('crew_reports', {
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  reporterId: text('reporter_id').notNull(),
  reason: text('reason').notNull(),
  note: text('note').notNull().default(''),
  createdAt: text('created_at').notNull(),
}, t => [primaryKey({ columns: [t.crewId, t.reporterId] })]);
