import { publicOrigin } from "../../../../../lib/http";
import { env } from '../../../../../lib/env';
import { googleConfigured, sessionCookie, sessionSecret } from "../../../../auth";
import { FLOW_COOKIE, GOOGLE_CALLBACK, checkIdToken, cookie, readCookie, unseal } from "../../../../../lib/google-oauth.mjs";
export const dynamic = "force-dynamic";

const redirect = (to: string, ...cookies: string[]) => {
  const headers = new Headers({ Location: to, "Cache-Control": "no-store" });
  for (const c of [cookie(FLOW_COOKIE, "", 0), ...cookies]) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
};

export async function GET(request: Request) {
  const fail = () => redirect("/?login_error=google");
  if (!googleConfigured()) return fail();
  const url = new URL(request.url), code = url.searchParams.get("code");
  const flow = await unseal(readCookie(request.headers.get("cookie"), FLOW_COOKIE), await sessionSecret());
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return fail();
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: publicOrigin(request) + GOOGLE_CALLBACK, grant_type: "authorization_code", code_verifier: flow.verifier }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return fail();
    const { id_token } = (await response.json()) as { id_token?: string };
    const claims = checkIdToken(id_token, { clientId: env.GOOGLE_CLIENT_ID!, nonce: flow.nonce });
    if (!claims) return fail();
    return redirect("/", await sessionCookie({ userId: `google:${claims.sub}`, displayName: claims.name || claims.email, provider: "google", email: claims.emailVerified ? claims.email : "" }));
  } catch {
    return fail();
  }
}
