// Apply pending database migrations once when the Node server starts (local dev and Cloud Run).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.DATABASE_URL) return;
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { getDb } = await import('./db');
  await migrate(getDb(), { migrationsFolder: "drizzle" });
}
