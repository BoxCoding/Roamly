import { env } from '../../../../lib/env';
import { metaConfigured, sessionSecret } from "../../../auth";
import { json, publicOrigin } from "../../../../lib/http";
import { randomToken, seal } from "../../../../lib/google-oauth.mjs";
import { jarCookies, readJar } from "../../../../lib/cookie-jar.mjs";
import { APP_CHALLENGE } from "../../../../lib/app-login";
import { META_CALLBACK, metaAuthorizeUrl } from "../../../../lib/meta-oauth.mjs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!metaConfigured()) return json({ error: "Facebook login is not configured." }, 503);
  const app = new URL(request.url).searchParams.get("app"), fromApp = app && APP_CHALLENGE.test(app) ? app : undefined;
  const state = randomToken(), flow = await seal({ state, app: fromApp }, await sessionSecret(), 600);
  const location = metaAuthorizeUrl({ appId: env.META_APP_ID!, redirectUri: publicOrigin(request) + META_CALLBACK, state });
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  for (const c of jarCookies({ ...readJar(request.headers.get("cookie")), m: flow })) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
