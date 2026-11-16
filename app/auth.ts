import { env } from '../lib/env';
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { appSecrets } from "../db/schema";
import { SESSION_COOKIE, cookie, randomToken, readCookie, seal, unseal } from "../lib/google-oauth.mjs";

export type Provider = "google" | "password";
export type AppUser = { userId: string; displayName: string; provider: Provider; email: string };

const SESSION_DAYS = 30;
export const googleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
// Moderators are listed by email in ADMIN_EMAILS (comma separated).
export const isAdmin = (user: AppUser | null) =>
  Boolean(user?.email && (env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase()));

let cachedSecret: string | undefined;
export async function sessionSecret(): Promise<string> {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const db = getDb();
  await db.insert(appSecrets).values({ name: "session", value: randomToken() }).onConflictDoNothing();
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.name, "session"));
  return (cachedSecret = row.value);
}

/** Set-Cookie value for a signed app session (Google or email/password). */
export async function sessionCookie(user: AppUser) {
  const maxAge = SESSION_DAYS * 86400;
  return cookie(SESSION_COOKIE, await seal({ uid: user.userId, name: user.displayName, provider: user.provider, email: user.email }, await sessionSecret(), maxAge), maxAge);
}
export const clearSessionCookie = () => cookie(SESSION_COOKIE, "", 0);

// Identity comes only from our signed session cookie; no proxy headers are trusted.
export async function getUser(): Promise<AppUser | null> {
  const token = readCookie((await headers()).get("cookie"), SESSION_COOKIE);
  if (!token) return null;
  try {
    const s = await unseal(token, await sessionSecret());
    return s && (s.provider === "google" || s.provider === "password") ? { userId: s.uid, displayName: s.name, provider: s.provider, email: typeof s.email === "string" ? s.email : "" } : null;
  } catch {
    return null;
  }
}
