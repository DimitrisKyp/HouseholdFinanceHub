// Sends analytics and error events to /api/telemetry (see lib/telemetry.js for what's kept).
// sendBeacon survives the page being closed and never delays it; nothing identifies the user.
const MAX_ERRORS_PER_PAGE = 10;
const reported = new Set();

export function sendEvent(event) {
  try {
    const body = JSON.stringify({ path: window.location.pathname, ...event });
    if (navigator.sendBeacon?.("/api/telemetry", new Blob([body], { type: "application/json" }))) return;
    fetch("/api/telemetry", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => {});
  } catch {
    // Monitoring must never break the page.
  }
}

/** Reports a browser error once per message and page load, and at most a few per page. */
export function reportClientError(message, source) {
  const text = String(message ?? "Unknown error");
  if (reported.has(text) || reported.size >= MAX_ERRORS_PER_PAGE) return;
  reported.add(text);
  sendEvent({ type: "client_error", message: text, source });
}
