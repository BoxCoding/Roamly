import { getDb } from "../../../../db";
import { users } from "../../../../db/schema";
import { sessionCookie, type AppUser } from "../../../auth";
import { json, readJson } from "../../../../lib/http";
import { hashPassword, registerSchema } from "../../../../lib/password.mjs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const req = await readJson(request, 2000);
  if ("error" in req) return req.error;
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || "Check your details." }, 400);
  const { name, email, password } = parsed.data;
  try {
    const id = crypto.randomUUID();
    const rows = await getDb().insert(users).values({ id, email, name, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() }).onConflictDoNothing().returning({ id: users.id });
    if (!rows.length) return json({ error: "An account with this email already exists. Sign in instead." }, 409);
    const user: AppUser = { userId: `user:${id}`, displayName: name, provider: "password" };
    const response = json({ user: { id: user.userId, name, provider: user.provider } }, 201);
    response.headers.append("Set-Cookie", await sessionCookie(user));
    return response;
  } catch {
    return json({ error: "Your account could not be created. Please try again." }, 503);
  }
}
