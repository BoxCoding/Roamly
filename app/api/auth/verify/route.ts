import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { getUser, sessionSecret } from "../../../auth";
import { json, readJson } from "../../../../lib/http";
import { TOKEN, readVerifyToken } from "../../../../lib/account-email.mjs";
import { sendVerification } from "../../../../lib/mail";
import {track} from '../../../../lib/track';
export const dynamic = "force-dynamic";

const input = z.union([z.object({ token: z.string().regex(TOKEN) }).strict(), z.object({ resend: z.literal(true) }).strict()]);

// {token}: confirm an email from the emailed link (no sign-in needed). {resend: true}: signed-in email rider asks for a new link.
export async function POST(request: Request) {
  const req = await readJson(request, 3000);
  if ("error" in req) return req.error;
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return json({ error: "This confirmation link is not valid." }, 400);
  try {
    const db = getDb();
    if ("token" in parsed.data) {
      const t = await readVerifyToken(parsed.data.token, await sessionSecret());
      if (!t) return json({ error: "This confirmation link has expired. Sign in and ask for a new one from your profile." }, 400);
      // The email must still match: changing it later would need a fresh link.
      await db.update(users).set({ emailVerifiedAt: new Date().toISOString() }).where(and(eq(users.id, t.userId), eq(users.email, t.email), isNull(users.emailVerifiedAt)));
      await track("email_verified", `user:${t.userId}`);
      return json({ ok: true });
    }
    const user = await getUser();
    if (!user || user.provider !== "password") return json({ error: "Sign in with your email account first." }, 401);
    const id = user.userId.replace(/^user:/, ""), [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) return json({ error: "Account not found." }, 404);
    if (row.emailVerifiedAt) return json({ ok: true, verified: true });
    if (!(await sendVerification(request, row.id, row.name, row.email))) return json({ error: "Email is not available right now. Please try again later." }, 503);
    return json({ ok: true, message: `Confirmation link sent to ${row.email}.` });
  } catch {
    return json({ error: "Email confirmation is temporarily unavailable. Please try again." }, 503);
  }
}
