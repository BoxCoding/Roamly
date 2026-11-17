import { reportError } from "./report-error";

// Routes catch their own failures and answer 5xx; log those too so Error Reporting shows them.
export const json = (data: unknown, status = 200) => {
  if (status >= 500) reportError("server", `HTTP ${status}: ${(data as { error?: string })?.error || "server error"}`);
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
};

// The origin the browser used. Behind Cloud Run, request.url is the container's internal address,
// so take the public host from the Host header and the scheme from the proxy.
export function publicOrigin(request: Request) {
  // Firebase Hosting (custom domain) forwards to Cloud Run with the browser's host in X-Forwarded-Host.
  // A cross-site page cannot set that header without a CORS preflight, which this app never allows.
  const url = new URL(request.url), host = request.headers.get("x-forwarded-host")?.split(",")[0].trim() || request.headers.get("host") || url.host;
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || url.protocol.slice(0, -1);
  return `${proto}://${host}`;
}

// Same-origin, size-capped JSON body for state-changing requests.
export async function readJson(request: Request, maxChars: number): Promise<{ body: unknown } | { error: Response }> {
  if (request.headers.get("origin") !== publicOrigin(request)) return { error: json({ error: "Invalid request origin." }, 403) };
  if (!request.headers.get("content-type")?.startsWith("application/json")) return { error: json({ error: "Send JSON." }, 415) };
  const tooLarge = { error: json({ error: "Request too large." }, 413) };
  if (Number(request.headers.get("content-length")) > maxChars) return tooLarge;
  try {
    const raw = await request.text();
    if (raw.length > maxChars) return tooLarge;
    return { body: JSON.parse(raw) };
  } catch {
    return { error: json({ error: "Invalid JSON." }, 400) };
  }
}
