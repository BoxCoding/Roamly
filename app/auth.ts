import { env } from '../lib/env';
import { track } from "../lib/track";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { accounts, appSecrets } from "../db/schema";
import { randomToken, seal, unseal } from "../lib/google-oauth.mjs";
import { jarCookies, readJar } from "../lib/cookie-jar.mjs";

export type Provider = "google" | "facebook" | "password";
export type AppUser = { userId: string; displayName: string; provider: Provider; email: string };
/** A signed-in rider with their account row: public ID, platform role and status. */
export type Rider = AppUser & { publicId: string; role: "rider" | "admin"; status: "active" | "suspended" };

const SESSION_DAYS = 30;
export const googleConfigured = () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
export const metaConfigured = () => Boolean(env.META_APP_ID && env.META_APP_SECRET);
// Bootstrap admins are listed by email in ADMIN_EMAILS (comma separated); they can then make other riders
// admins from the dashboard. In production only Google sign-ins count for ADMIN_EMAILS: Google verifies the
// email, while email/password and Facebook emails are not proven. Local dev also accepts password accounts
// so the moderation tests can run without Google.
const trustedEmail = (user: AppUser) => user.provider === "google" || (process.env.NODE_ENV !== "production" && user.provider === "password");
const bootstrapAdmin = (user: AppUser) =>
  Boolean(trustedEmail(user) && user.email && (env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean).includes(user.email.toLowerCase()));
export const isAdmin = (user: Rider | null) => Boolean(user && (user.role === "admin" || bootstrapAdmin(user)));

let cachedSecret: string | undefined;
export async function sessionSecret(): Promise<string> {
  if (env.SESSION_SECRET) return env.SESSION_SECRET;
  if (cachedSecret) return cachedSecret;
  const db = getDb();
  await db.insert(appSecrets).values({ name: "session", value: randomToken() }).onConflictDoNothing();
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.name, "session"));
  return (cachedSecret = row.value);
}

/** Set-Cookie values for a signed app session (any half-finished sign-in flow is dropped); also creates or refreshes the rider's account row. */
export async function sessionCookie(user: AppUser): Promise<string[]> {
  const account = await ensureAccount(user, true);
  // A row created just now is a sign-up; otherwise this is a sign-in.
  await track(account && Date.now() - Date.parse(account.createdAt) < 10000 ? "signup" : "login", user.userId, { provider: user.provider });
  const maxAge = SESSION_DAYS * 86400;
  return jarCookies({ s: await seal({ uid: user.userId, name: user.displayName, provider: user.provider, email: user.email }, await sessionSecret(), maxAge) });
}
/** Set-Cookie values that sign out, keeping nothing else. */
export const clearSessionCookie = (): string[] => jarCookies({});

// Returns the account row, creating it for sessions that predate accounts. On login the name/email are refreshed.
async function ensureAccount(user: AppUser, refresh = false) {
  const db = getDb(), now = new Date().toISOString();
  const values = { userId: user.userId, publicId: crypto.randomUUID().replace(/-/g, "").slice(0, 12), name: user.displayName.slice(0, 100), email: user.email, provider: user.provider, createdAt: now, lastSeenAt: now };
  const [row] = refresh
    ? await db.insert(accounts).values(values).onConflictDoUpdate({ target: accounts.userId, set: { name: values.name, email: values.email, lastSeenAt: now } }).returning()
    : await db.insert(accounts).values(values).onConflictDoNothing().returning();
  return row ?? (await db.select().from(accounts).where(eq(accounts.userId, user.userId)).limit(1))[0];
}

// Identity comes only from our signed session cookie; no proxy headers are trusted.
async function sessionIdentity(): Promise<AppUser | null> {
  const token = readJar((await headers()).get("cookie")).s;
  if (!token) return null;
  try {
    const s = await unseal(token, await sessionSecret());
    return s && ["google", "facebook", "password"].includes(s.provider) ? { userId: s.uid, displayName: s.name, provider: s.provider, email: typeof s.email === "string" ? s.email : "" } : null;
  } catch {
    return null;
  }
}

/** The signed-in rider including suspended ones (only the session endpoint should need this). */
export async function getRider(): Promise<Rider | null> {
  const identity = await sessionIdentity();
  if (!identity) return null;
  const [row] = await getDb().select().from(accounts).where(eq(accounts.userId, identity.userId)).limit(1);
  const account = row ?? (await ensureAccount(identity));
  return { ...identity, displayName: account.name, publicId: account.publicId, role: account.role === "admin" ? "admin" : "rider", status: account.status === "suspended" ? "suspended" : "active" };
}

/** The signed-in, active rider. Suspended riders are treated as signed out everywhere. */
export async function getUser(): Promise<Rider | null> {
  try {
    const rider = await getRider();
    return rider && rider.status === "active" ? rider : null;
  } catch {
    return null;
  }
}
