import { env } from '../../../../lib/env';
import { metaConfigured, sessionSecret } from "../../../auth";
import { json, publicOrigin } from "../../../../lib/http";
import { cookie, randomToken, seal } from "../../../../lib/google-oauth.mjs";
import { META_CALLBACK, META_FLOW_COOKIE, metaAuthorizeUrl } from "../../../../lib/meta-oauth.mjs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!metaConfigured()) return json({ error: "Facebook login is not configured." }, 503);
  const state = randomToken(), flow = await seal({ state }, await sessionSecret(), 600);
  const location = metaAuthorizeUrl({ appId: env.META_APP_ID!, redirectUri: publicOrigin(request) + META_CALLBACK, state });
  return new Response(null, { status: 302, headers: { Location: location, "Set-Cookie": cookie(META_FLOW_COOKIE, flow, 600), "Cache-Control": "no-store" } });
}
