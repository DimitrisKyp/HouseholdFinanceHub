// Runs before every page request (Next.js 16 "Proxy", formerly Middleware).
// Optimistic check only: it looks for the session cookie and sends visitors without one to
// /sign-in. It does NOT validate the session — the Data Access Layer (lib/dal.js) does that.
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/check-email", "/email-verified", "/forgot-password", "/reset-password"];

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic || getSessionCookie(request)) {
    return NextResponse.next();
  }

  const signInUrl = new URL("/sign-in", request.url);
  if (pathname !== "/") signInUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  // Skip API routes, Next.js internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
