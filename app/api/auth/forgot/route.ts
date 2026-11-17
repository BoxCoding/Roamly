import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { sessionSecret } from "../../../auth";
import { json, readJson } from "../../../../lib/http";
import { makeResetToken } from "../../../../lib/account-email.mjs";
import { mailOrigin, sendMail } from "../../../../lib/mail";
import { env } from "../../../../lib/env";
import {track} from '../../../../lib/track';
export const dynamic = "force-dynamic";

const input = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).strict();

// Always answers the same way, so it cannot be used to find out which emails have accounts.
export async function POST(request: Request) {
  const req = await readJson(request, 500);
  if ("error" in req) return req.error;
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return json({ error: "Enter a valid email address." }, 400);
  // Decide before looking the email up, so a mail outage cannot reveal which emails have accounts.
  if (!env.RESEND_API_KEY) return json({ error: "Password reset by email is not available yet. Please contact support." }, 503);
  const done = json({ ok: true, message: "If an account uses that email, a reset link is on its way. It works for one hour." });
  try {
    const [row] = await getDb().select({ id: users.id, name: users.name, hash: users.passwordHash }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (!row) return done;
    const token = await makeResetToken(row.id, row.hash, await sessionSecret());
    await sendMail(parsed.data.email, "Reset your Roamly password", [`Hi ${row.name},`, "Someone (hopefully you) asked to reset your Roamly password. The link works for one hour and only once.", "If you did not ask for this, ignore this email. Your password stays the same."], { label: "Choose a new password", url: `${mailOrigin(request)}/?reset=${token}` });
    await track("password_reset_requested", `user:${row.id}`);
    return done;
  } catch {
    return json({ error: "Password reset is temporarily unavailable. Please try again." }, 503);
  }
}
