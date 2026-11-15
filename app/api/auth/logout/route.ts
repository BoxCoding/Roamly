import { clearSessionCookie } from "../../../auth";
export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, { status: 302, headers: { Location: "/", "Set-Cookie": clearSessionCookie(), "Cache-Control": "no-store" } });
}
