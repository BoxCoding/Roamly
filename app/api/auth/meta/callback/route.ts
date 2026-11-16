import { publicOrigin } from "../../../../../lib/http";
import { env } from '../../../../../lib/env';
import { metaConfigured, sessionCookie, sessionSecret } from "../../../../auth";
import { cookie, readCookie, unseal } from "../../../../../lib/google-oauth.mjs";
import { META_CALLBACK, META_FLOW_COOKIE, metaProfile } from "../../../../../lib/meta-oauth.mjs";
export const dynamic = "force-dynamic";

const redirect = (to: string, ...cookies: string[]) => {
  const headers = new Headers({ Location: to, "Cache-Control": "no-store" });
  for (const c of [cookie(META_FLOW_COOKIE, "", 0), ...cookies]) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
};

export async function GET(request: Request) {
  const fail = () => redirect("/?login_error=meta");
  if (!metaConfigured()) return fail();
  const url = new URL(request.url), code = url.searchParams.get("code");
  const flow = await unseal(readCookie(request.headers.get("cookie"), META_FLOW_COOKIE), await sessionSecret());
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return fail();
  try {
    const p = await metaProfile({ code, appId: env.META_APP_ID!, appSecret: env.META_APP_SECRET!, redirectUri: publicOrigin(request) + META_CALLBACK });
    if (!p) return fail();
    return redirect("/", await sessionCookie({ userId: `facebook:${p.id}`, displayName: p.name || "Rider", provider: "facebook", email: p.email }));
  } catch {
    return fail();
  }
}
