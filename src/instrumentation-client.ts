// Runs in the browser before the app becomes interactive: page views and browser errors are
// reported to our own server (lib/telemetry-client.js). Core Web Vitals: components/WebVitals.jsx.
import { reportClientError, sendEvent } from "@/lib/telemetry-client";

try {
  window.addEventListener("error", event => reportClientError(event.message || event.error?.message, "window"));
  window.addEventListener("unhandledrejection", event => reportClientError(event.reason?.message ?? event.reason, "promise"));
  sendEvent({ type: "page_view" });
} catch {
  // Never let monitoring stop the app from starting.
}

export function onRouterTransitionStart(url: string) {
  sendEvent({ type: "page_view", path: new URL(url, window.location.href).pathname });
}
