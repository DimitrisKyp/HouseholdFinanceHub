// What browser analytics/error events may contain (pure, so it's unit-tested). See lib/telemetry.js.

export const CLIENT_EVENT_TYPES = ["page_view", "web_vital", "client_error"];

const clip = (value, max) => (typeof value === "string" ? value.slice(0, max) : undefined);

/** "/transactions?q=rent" → "/transactions". */
export const pathOnly = value => clip(String(value ?? "").split(/[?#]/)[0], 200) || undefined;

/**
 * Keeps only the fields each kind of browser event may have, with sane lengths and numbers.
 * Returns null for anything that doesn't look like one of our events.
 */
export function sanitizeClientEvent(input) {
  if (!input || typeof input !== "object" || !CLIENT_EVENT_TYPES.includes(input.type)) return null;
  const path = pathOnly(input.path);
  if (input.type === "page_view") return { type: "page_view", path };
  if (input.type === "web_vital") {
    const value = Number(input.value);
    if (!/^(CLS|FCP|FID|INP|LCP|TTFB)$/.test(input.name) || !Number.isFinite(value)) return null;
    return { type: "web_vital", path, name: input.name, value: Math.round(value * 1000) / 1000, rating: clip(input.rating, 20) };
  }
  return { type: "client_error", path, message: clip(input.message, 300) ?? "Unknown error", source: clip(input.source, 40) };
}
