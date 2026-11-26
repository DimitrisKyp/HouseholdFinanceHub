// Analytics and error monitoring, self-hosted and privacy-friendly: events are written to the
// server log as one JSON line each (Coolify keeps and shows these), so nothing goes to a third
// party. No user ids, no cookies, no query strings (they can contain searches): only the event,
// the page path and a few numbers or a message. To use a service such as Sentry or Plausible
// later, forward these events from here.
import "server-only";

export { CLIENT_EVENT_TYPES, pathOnly, sanitizeClientEvent } from "@/lib/telemetry-events";

/** Writes one event to the log. */
export function logEvent(event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ event, at: new Date().toISOString(), ...fields });
  if (event.endsWith("error")) console.error(line);
  else console.log(line);
}
