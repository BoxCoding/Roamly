import { getRider, googleConfigured, isAdmin, metaConfigured } from "../../auth";
import { json } from "../../../lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const rider = await getRider().catch(() => null), active = rider?.status === "active";
  return json({
    user: active ? { id: rider.userId, publicId: rider.publicId, name: rider.displayName, provider: rider.provider, admin: isAdmin(rider) } : null,
    suspended: rider?.status === "suspended",
    signOutUrl: "/api/auth/logout",
    googleLogin: googleConfigured(),
    metaLogin: metaConfigured(),
  });
}
