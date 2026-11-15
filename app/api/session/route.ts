import { chatGPTSignInPath, chatGPTSignOutPath } from "../../chatgpt-auth";
import { getUser, googleConfigured } from "../../auth";
import { json } from "../../../lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getUser();
  return json({
    user: user ? { id: user.userId, name: user.displayName, provider: user.provider } : null,
    signInUrl: chatGPTSignInPath("/"),
    signOutUrl: user && user.provider !== "chatgpt" ? "/api/auth/logout" : chatGPTSignOutPath("/"),
    googleLogin: googleConfigured(),
  });
}
