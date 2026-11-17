import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { profiles, users } from "../../../db/schema";
import { getRider, googleConfigured, isAdmin, metaConfigured } from "../../auth";
import { json } from "../../../lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const rider = await getRider().catch(() => null), active = rider?.status === "active";
  // Google and Facebook emails are verified by them; email accounts confirm theirs with a link.
  let emailVerified = true, photo = "";
  if (active) {
    const [p] = await getDb().select({ d: profiles.details }).from(profiles).where(eq(profiles.userId, rider.userId)).limit(1).catch(() => []);
    try { photo = JSON.parse(p?.d || "{}").photo || ""; } catch {}
  }
  if (active && rider.provider === "password") {
    const [row] = await getDb().select({ at: users.emailVerifiedAt }).from(users).where(eq(users.id, rider.userId.replace(/^user:/, ""))).limit(1).catch(() => []);
    emailVerified = Boolean(row?.at);
  }
  return json({
    user: active ? { id: rider.userId, publicId: rider.publicId, name: rider.displayName, provider: rider.provider, emailVerified, photo, admin: isAdmin(rider) } : null,
    suspended: rider?.status === "suspended",
    signOutUrl: "/api/auth/logout",
    googleLogin: googleConfigured(),
    metaLogin: metaConfigured(),
  });
}
