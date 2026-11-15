import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { sessionCookie, type AppUser } from "../../../auth";
import { json, readJson } from "../../../../lib/http";
import { LOCK_MINUTES, MAX_FAILED_LOGINS, loginSchema, verifyPassword } from "../../../../lib/password.mjs";
export const dynamic = "force-dynamic";

// Precomputed hash so unknown emails cost the same time as wrong passwords.
const DUMMY_HASH = "pbkdf2$100000$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000";

export async function POST(request: Request) {
  const req = await readJson(request, 1000);
  if ("error" in req) return req.error;
  const parsed = loginSchema.safeParse(req.body);
  const wrong = json({ error: "Incorrect email or password." }, 401);
  if (!parsed.success) return wrong;
  const { email, password } = parsed.data;
  try {
    const db = getDb();
    const row = await db.select().from(users).where(eq(users.email, email)).get();
    if (row?.lockedUntil && Date.parse(row.lockedUntil) > Date.now()) return json({ error: `Too many attempts. Try again in ${LOCK_MINUTES} minutes.` }, 429);
    const ok = await verifyPassword(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row) return wrong;
    if (!ok) {
      const failed = row.failedLogins + 1, lock = failed >= MAX_FAILED_LOGINS;
      await db.update(users).set({ failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null }).where(eq(users.id, row.id));
      return wrong;
    }
    if (row.failedLogins || row.lockedUntil) await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, row.id));
    const user: AppUser = { userId: `user:${row.id}`, displayName: row.name, provider: "password" };
    const response = json({ user: { id: user.userId, name: row.name, provider: user.provider } });
    response.headers.append("Set-Cookie", await sessionCookie(user));
    return response;
  } catch {
    return json({ error: "Sign-in is temporarily unavailable. Please try again." }, 503);
  }
}
