import { z } from "zod";
import { json, readJson } from "../../../lib/http";
import { reportError } from "../../../lib/report-error";
import { CLIENT_ERROR_MAX } from "../../../lib/events.mjs";
export const dynamic = "force-dynamic";

const input = z.object({ message: z.string().max(500), stack: z.string().max(CLIENT_ERROR_MAX).default(""), where: z.string().max(200).default("") }).strict();

// Browser and app crashes, forwarded to Google Cloud Error Reporting through the server log.
export async function POST(request: Request) {
  const req = await readJson(request, CLIENT_ERROR_MAX + 1000);
  if ("error" in req) return req.error;
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return json({ ok: false }, 400);
  reportError("client", parsed.data.message, parsed.data.stack, parsed.data.where, request.headers.get("user-agent") || "");
  return json({ ok: true }, 202);
}
