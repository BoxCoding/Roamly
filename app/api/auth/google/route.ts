import { env } from '../../../../lib/env';
import { googleConfigured, sessionSecret } from "../../../auth";
import { json, publicOrigin } from "../../../../lib/http";
import { GOOGLE_CALLBACK, authorizeUrl, pkcePair, randomToken, seal } from "../../../../lib/google-oauth.mjs";
import { jarCookies, readJar } from "../../../../lib/cookie-jar.mjs";
import { APP_CHALLENGE } from "../../../../lib/app-login";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleConfigured()) return json({ error: "Google login is not configured." }, 503);
  const state = randomToken(), nonce = randomToken(), { verifier, challenge } = await pkcePair();
  // ?app=<PKCE challenge> marks a sign-in started by the mobile app.
  const app = new URL(request.url).searchParams.get("app"), fromApp = app && APP_CHALLENGE.test(app) ? app : undefined;
  const flow = await seal({ state, nonce, verifier, app: fromApp }, await sessionSecret(), 600);
  const location = authorizeUrl({ clientId: env.GOOGLE_CLIENT_ID!, redirectUri: publicOrigin(request) + GOOGLE_CALLBACK, state, nonce, challenge });
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of jarCookies({ ...readJar(request.headers.get("cookie")), g: flow })) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
