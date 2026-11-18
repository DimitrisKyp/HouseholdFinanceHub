// Server-side monitoring: every error Next.js catches while handling a request is logged as one
// JSON line (see lib/telemetry.js), with the digest that the error page shows as "Reference".
export async function onRequestError(error, request, context) {
  // Imported here so this file also loads in runtimes that don't need it.
  const { logEvent, pathOnly } = await import("@/lib/telemetry");
  logEvent("server_error", {
    message: String(error?.message ?? error).slice(0, 500),
    digest: error?.digest,
    method: request.method,
    path: pathOnly(request.path),
    route: context.routePath,
    routeType: context.routeType,
  });
}
