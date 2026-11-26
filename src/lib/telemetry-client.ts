// Sends analytics and error events to /api/telemetry (see lib/telemetry.js for what's kept).
// sendBeacon survives the page being closed and never delays it; nothing identifies the user.
const MAX_ERRORS_PER_PAGE = 10;
const reported = new Set<string>();

export function sendEvent(event: { type: string } & Record<string, unknown>) {
  try {
    const body = JSON.stringify({ path: window.location.pathname, ...event });
    if (navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "application/json" }))) return;
    fetch("/api/telemetry", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {
    // Monitoring must never break the page.
  }
}

/**
 * Reads `message` and `digest` from whatever an error boundary caught. Next.js types it as
 * `unknown`: errors from Server Components are `Error`s with a `digest` matching the server log,
 * but a Client Component can throw anything.
 */
export function thrownDetails(error: unknown): { message?: string; digest?: string } {
  if (typeof error !== "object" || error === null) return {};
  return {
    message: "message" in error && typeof error.message === "string" ? error.message : undefined,
    digest: "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
  };
}

/** Reports a browser error once per message and page load, and at most a few per page. */
export function reportClientError(message: unknown, source?: string) {
  const text = String(message ?? "Unknown error");
  if (reported.has(text) || reported.size >= MAX_ERRORS_PER_PAGE) return;
  reported.add(text);
  sendEvent({ type: "client_error", message: text, source });
}
