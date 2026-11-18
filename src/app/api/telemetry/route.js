// Receives page views, Core Web Vitals and browser errors (sent with navigator.sendBeacon by
// src/instrumentation-client.js) and writes them to the server log (lib/telemetry.js).
// Open to everyone (errors happen on the sign-in page too), so it's size- and rate-limited.
import { logEvent, sanitizeClientEvent } from "@/lib/telemetry";

const MAX_BODY_BYTES = 4_096;
const MAX_EVENTS_PER_MINUTE = Number(process.env.TELEMETRY_MAX_PER_MINUTE ?? 120);
const seen = (globalThis.__telemetryRate ??= new Map()); // ip → { windowStart, count }

function tooMany(ip) {
  const now = Date.now();
  const entry = seen.get(ip);
  if (!entry || now - entry.windowStart > 60_000) {
    if (seen.size > 10_000) seen.clear(); // keep memory bounded
    seen.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_EVENTS_PER_MINUTE;
}

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (tooMany(ip)) return new Response(null, { status: 429 });

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
  let event;
  try {
    event = sanitizeClientEvent(JSON.parse(text));
  } catch {
    event = null;
  }
  if (!event) return new Response(null, { status: 400 });

  const { type, ...fields } = event;
  logEvent(type, fields);
  return new Response(null, { status: 204 });
}
