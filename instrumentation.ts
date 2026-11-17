// Apply pending database migrations once when the Node server starts (local dev and Cloud Run).
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || !process.env.DATABASE_URL) return;
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { getDb } = await import('./db');
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  const { seedRoutes } = await import('./lib/routes');
  await seedRoutes();
}

// Uncaught errors in routes go to Cloud Error Reporting.
export async function onRequestError(error: unknown, request: { path: string }) {
  const { reportError } = await import('./lib/report-error');
  const e = error instanceof Error ? error : new Error(String(error));
  reportError("server", e.message, e.stack || "", request.path);
}
