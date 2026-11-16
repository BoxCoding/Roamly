import { publicOrigin } from "../../../../../lib/http";
import { env } from '../../../../../lib/env';
import { metaConfigured, sessionCookie, sessionSecret } from "../../../../auth";
import { unseal } from "../../../../../lib/google-oauth.mjs";
import { jarCookies, readJar } from "../../../../../lib/cookie-jar.mjs";
import { appHandoff } from "../../../../../lib/app-login";
import { META_CALLBACK, metaProfile } from "../../../../../lib/meta-oauth.mjs";
export const dynamic = "force-dynamic";

const redirect = (to: string, cookies: string[]) => {
  const headers = new Headers({ Location: to, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
};

export async function GET(request: Request) {
  const jar = readJar(request.headers.get("cookie"));
  const fail = () => redirect("/?login_error=meta", jarCookies({ ...jar, m: undefined }));
  if (!metaConfigured()) return fail();
  const url = new URL(request.url), code = url.searchParams.get("code");
  const flow = await unseal(jar.m, await sessionSecret());
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return fail();
  const failApp = flow.app ? async () => appHandoff(null, flow.app, await sessionSecret(), { ...jar, m: undefined }) : fail;
  try {
    const p = await metaProfile({ code, appId: env.META_APP_ID!, appSecret: env.META_APP_SECRET!, redirectUri: publicOrigin(request) + META_CALLBACK });
    if (!p) return failApp();
    const user = { userId: `facebook:${p.id}`, displayName: p.name || "Rider", provider: "facebook" as const, email: p.email };
    if (flow.app) return appHandoff(user, flow.app, await sessionSecret(), { ...jar, m: undefined });
    return redirect("/", await sessionCookie(user));
  } catch {
    return failApp();
  }
}
