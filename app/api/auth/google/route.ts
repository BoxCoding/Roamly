import { env } from '../../../../lib/env';
import { googleConfigured, sessionSecret } from "../../../auth";
import { json, publicOrigin } from "../../../../lib/http";
import { FLOW_COOKIE, GOOGLE_CALLBACK, authorizeUrl, cookie, pkcePair, randomToken, seal } from "../../../../lib/google-oauth.mjs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!googleConfigured()) return json({ error: "Google login is not configured." }, 503);
  const state = randomToken(), nonce = randomToken(), { verifier, challenge } = await pkcePair();
  const flow = await seal({ state, nonce, verifier }, await sessionSecret(), 600);
  const location = authorizeUrl({ clientId: env.GOOGLE_CLIENT_ID!, redirectUri: publicOrigin(request) + GOOGLE_CALLBACK, state, nonce, challenge });
  return new Response(null, { status: 302, headers: { Location: location, "Set-Cookie": cookie(FLOW_COOKIE, flow, 600), "Cache-Control": "no-store" } });
}
