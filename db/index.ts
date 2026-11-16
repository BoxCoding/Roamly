import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../lib/env';
import * as schema from './schema';

// One pool per server process. Cloud Run uses the Cloud SQL unix socket via DATABASE_URL (?host=/cloudsql/...).
let db: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDb() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  return (db ??= drizzle(new Pool({ connectionString: env.DATABASE_URL, max: 5 }), { schema }));
}
