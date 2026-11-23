// Helpers for "where should the user go next?" values that come from the URL or a form.

/** Only allow paths on this site (blocks "https://evil.com" and "//evil.com"). Falls back to "/". */
export function safeRedirectPath(value) {
  return typeof value === "string" && /^\/(?![/\\])/.test(value) ? value : "/";
}

/** Where the email-confirmation link lands after Better Auth verifies it. */
export function verificationCallbackPath(next = "/") {
  const path = safeRedirectPath(next);
  return path === "/" ? "/email-verified" : `/email-verified?next=${encodeURIComponent(path)}`;
}

/** The "check your inbox" page for an email address. */
export function checkEmailPath(email, reason) {
  const params = new URLSearchParams({ email });
  if (reason) params.set("reason", reason);
  return `/check-email?${params}`;
}
