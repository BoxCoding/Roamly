import { clearSessionCookie } from "../../../auth";
export const dynamic = "force-dynamic";

export function GET() {
  const headers = new Headers({ Location: "/", "Cache-Control": "no-store" });
  for (const c of clearSessionCookie()) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
