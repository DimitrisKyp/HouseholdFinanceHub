// What browser analytics/error events may contain (pure, so it's unit-tested). See lib/telemetry.js.

export const CLIENT_EVENT_TYPES = ["page_view", "web_vital", "client_error"] as const;

/** A cleaned browser event. `type` tells TypeScript which other fields exist (a discriminated union). */
export type ClientEvent =
  | { type: "page_view"; path: string | undefined }
  | { type: "web_vital"; path: string | undefined; name: string; value: number; rating: string | undefined }
  | { type: "client_error"; path: string | undefined; message: string; source: string | undefined };

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : undefined);

/** "/transactions?q=rent" → "/transactions". */
export const pathOnly = (value: unknown) => clip(String(value ?? "").split(/[?#]/)[0], 200) || undefined;

/**
 * Keeps only the fields each kind of browser event may have, with sane lengths and numbers.
 * Returns null for anything that doesn't look like one of our events.
 */
export function sanitizeClientEvent(value: unknown): ClientEvent | null {
  if (!value || typeof value !== "object") return null;
  // Request bodies are untrusted: read every field as `unknown` and check it before use.
  const input = value as Record<string, unknown>;
  if (!(CLIENT_EVENT_TYPES as readonly unknown[]).includes(input.type)) return null;
  const path = pathOnly(input.path);
  if (input.type === "page_view") return { type: "page_view", path };
  if (input.type === "web_vital") {
    const numeric = Number(input.value);
    if (typeof input.name !== "string" || !/^(CLS|FCP|FID|INP|LCP|TTFB)$/.test(input.name) || !Number.isFinite(numeric)) return null;
    return { type: "web_vital", path, name: input.name, value: Math.round(numeric * 1000) / 1000, rating: clip(input.rating, 20) };
  }
  return { type: "client_error", path, message: clip(input.message, 300) ?? "Unknown error", source: clip(input.source, 40) };
}
