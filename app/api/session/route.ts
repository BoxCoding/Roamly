import { getUser, googleConfigured, isAdmin, metaConfigured } from "../../auth";
import { json } from "../../../lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getUser();
  return json({
    user: user ? { id: user.userId, name: user.displayName, provider: user.provider, admin: isAdmin(user) } : null,
    signOutUrl: "/api/auth/logout",
    googleLogin: googleConfigured(),
    metaLogin: metaConfigured(),
  });
}
