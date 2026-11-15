import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  details: text('details').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const aiQuota = sqliteTable('ai_quota', {
  userId:text('user_id').primaryKey(),
  day:text('day').notNull(),
  calls:integer('calls').notNull().default(0),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').notNull(),
  failedLogins: integer('failed_logins').notNull().default(0),
  lockedUntil: text('locked_until'),
});

// shortcut: session signing key auto-created in D1 when SESSION_SECRET is unset; set the env secret for production.
export const appSecrets = sqliteTable('app_secrets', {
  name: text('name').primaryKey(),
  value: text('value').notNull(),
});

// Rider crews shared by everyone ("groups" is an SQLite keyword, hence crews).
export const crews = sqliteTable('crews', {
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
}, t => [index('crews_organizer_idx').on(t.organizerId)]);

export const crewMembers = sqliteTable('crew_members', {
  crewId: text('crew_id').notNull().references(() => crews.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  joinedAt: text('joined_at').notNull(),
}, t => [primaryKey({ columns: [t.crewId, t.userId] })]);
