// Server-side monitoring: every error Next.js catches while handling a request is logged as one
// JSON line (see lib/telemetry.ts), with the digest that the error page shows as "Reference".
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  // Imported here so this file also loads in runtimes that don't need it.
  const { logEvent, pathOnly } = await import("@/lib/telemetry");
  // Anything can be thrown, so `error` is unknown: read its fields only if it's an object.
  const details = error && typeof error === "object" ? (error as { message?: unknown; digest?: unknown }) : undefined;
  logEvent("server_error", {
    message: String(details?.message ?? error).slice(0, 500),
    digest: details?.digest,
    method: request.method,
    path: pathOnly(request.path),
    route: context.routePath,
    routeType: context.routeType,
  });
};
