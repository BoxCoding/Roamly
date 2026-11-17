import { z } from "zod";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { getUser } from "../../auth";
import { json, readJson } from "../../../lib/http";
import { CLIENT_EVENTS } from "../../../lib/events.mjs";
export const dynamic = "force-dynamic";

const input = z.object({ name: z.enum(CLIENT_EVENTS as [string, ...string[]]), props: z.record(z.union([z.string().max(80), z.number(), z.boolean()])).refine(p => Object.keys(p).length <= 5).default({}) }).strict();

// First-party analytics: one row per event, tied to the signed-in rider (or nobody). No IP or device data is stored.
export async function POST(request: Request) {
  const req = await readJson(request, 1000);
  if ("error" in req) return req.error;
  const parsed = input.safeParse(req.body);
  if (!parsed.success) return json({ error: "Unknown event." }, 400);
  try {
    const user = await getUser();
    await getDb().insert(events).values({ id: crypto.randomUUID(), name: parsed.data.name, userId: user?.userId ?? null, props: JSON.stringify(parsed.data.props), at: new Date().toISOString() });
    return json({ ok: true }, 202);
  } catch {
    return json({ ok: false }, 202);
  }
}
