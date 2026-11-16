import { publicOrigin } from "../../../../../lib/http";
import { env } from '../../../../../lib/env';
import { googleConfigured, sessionCookie, sessionSecret } from "../../../../auth";
import { GOOGLE_CALLBACK, checkIdToken, unseal } from "../../../../../lib/google-oauth.mjs";
import { jarCookies, readJar } from "../../../../../lib/cookie-jar.mjs";
import { appHandoff } from "../../../../../lib/app-login";
export const dynamic = "force-dynamic";

const redirect = (to: string, cookies: string[]) => {
  const headers = new Headers({ Location: to, "Cache-Control": "no-store" });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
};

export async function GET(request: Request) {
  const jar = readJar(request.headers.get("cookie"));
  // A failed attempt keeps any existing session and drops the flow.
  const fail = () => redirect("/?login_error=google", jarCookies({ ...jar, g: undefined }));
  if (!googleConfigured()) return fail();
  const url = new URL(request.url), code = url.searchParams.get("code");
  const flow = await unseal(jar.g, await sessionSecret());
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return fail();
  // Started from the mobile app: on failure, still send the rider back to it.
  const failApp = flow.app ? async () => appHandoff(null, flow.app, await sessionSecret(), { ...jar, g: undefined }) : fail;
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: publicOrigin(request) + GOOGLE_CALLBACK, grant_type: "authorization_code", code_verifier: flow.verifier }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return failApp();
    const { id_token } = (await response.json()) as { id_token?: string };
    const claims = checkIdToken(id_token, { clientId: env.GOOGLE_CLIENT_ID!, nonce: flow.nonce });
    if (!claims) return failApp();
    const user = { userId: `google:${claims.sub}`, displayName: claims.name || claims.email, provider: "google" as const, email: claims.emailVerified ? claims.email : "" };
    if (flow.app) return appHandoff(user, flow.app, await sessionSecret(), { ...jar, g: undefined });
    return redirect("/", await sessionCookie(user));
  } catch {
    return failApp();
  }
}
