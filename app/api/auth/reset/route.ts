import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { sessionCookie, sessionSecret, type AppUser } from "../../../auth";
import { json, readJson } from "../../../../lib/http";
import { TOKEN, readResetToken, resetTokenUser } from "../../../../lib/account-email.mjs";
import { hashPassword } from "../../../../lib/password.mjs";
import {track} from '../../../../lib/track';
export const dynamic = "force-dynamic";

const input = z.object({ token: z.string().regex(TOKEN), password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long.") }).strict();

// Sets a new password from an emailed link and signs the rider in. The link proves the email, so it also marks it verified.
export async function POST(request: Request) {
  const req = await readJson(request, 3000);
  if ("error" in req) return req.error;
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.path[0] === "password" ? parsed.error.issues[0].message : "This reset link is not valid." }, 400);
  const expired = json({ error: "This reset link has expired or was already used. Ask for a new one." }, 400);
  try {
    const secret = await sessionSecret(), id = await resetTokenUser(parsed.data.token, secret);
    if (!id) return expired;
    const db = getDb(), [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row || (await readResetToken(parsed.data.token, secret, row.passwordHash)) !== id) return expired;
    const now = new Date().toISOString();
    const changed = await db.update(users).set({ passwordHash: await hashPassword(parsed.data.password), failedLogins: 0, lockedUntil: null, emailVerifiedAt: row.emailVerifiedAt || now })
      .where(and(eq(users.id, row.id), eq(users.passwordHash, row.passwordHash))).returning({ id: users.id });
    if (!changed.length) return expired;
    const user: AppUser = { userId: `user:${row.id}`, displayName: row.name, provider: "password", email: row.email };
    await track("password_reset_done", user.userId);
    const response = json({ ok: true });
    for (const c of await sessionCookie(user)) response.headers.append("Set-Cookie", c);
    return response;
  } catch {
    return json({ error: "Your password was not changed. Please try again." }, 503);
  }
}
