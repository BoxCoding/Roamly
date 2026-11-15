import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
