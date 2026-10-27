import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  userId: text('user_id').primaryKey(),
  details: text('details').notNull(),
  updatedAt: text('updated_at').notNull(),
});

import {integer} from 'drizzle-orm/sqlite-core';
export const aiQuota = sqliteTable('ai_quota', {
  userId:text('user_id').primaryKey(),
  day:text('day').notNull(),
  calls:integer('calls').notNull().default(0),
});
