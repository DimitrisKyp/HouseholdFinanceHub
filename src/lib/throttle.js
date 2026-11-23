// Small helpers for public forms that send email. Server-only, kept in memory: fine for a
// single server; a shared store (e.g. Redis) would be needed if the app ran on several.
import "server-only";

const lastAttempt = new Map();

/** True if `key` was used less than `ms` ago; otherwise records this attempt and returns false. */
export function isTooSoon(key, ms) {
  const now = Date.now();
  if (now - (lastAttempt.get(key) ?? 0) < ms) return true;
  lastAttempt.set(key, now);
  // Forget old entries so the map can't grow forever.
  if (lastAttempt.size > 10_000) {
    for (const [k, t] of lastAttempt) if (now - t > ms) lastAttempt.delete(k);
  }
  return false;
}

/**
 * Runs `task` but always takes at least `ms`, so response time doesn't reveal whether an email
 * was actually sent (which would reveal whether an account exists).
 */
export async function withMinimumDuration(ms, task) {
  const start = Date.now();
  try {
    return await task();
  } finally {
    const remaining = ms - (Date.now() - start);
    if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
  }
}

// ── Attempt limits (password guessing) ───────────────────────────────────────

const attempts = new Map(); // key → { count, resetAt }

/** Limits per form: at most `max` attempts per `windowMs`. */
export const LIMITS = {
  signInPerEmail: { max: 8, windowMs: 15 * 60_000 }, // failed sign-ins for one account
  signInPerIp: { max: 40, windowMs: 15 * 60_000 }, // failed sign-ins from one address (many accounts)
  signUpPerIp: { max: 10, windowMs: 60 * 60_000 },
  resetPerIp: { max: 10, windowMs: 15 * 60_000 }, // setting a new password from a link
  resetRequestPerIp: { max: 10, windowMs: 60 * 60_000 }, // asking for reset emails
  changePasswordPerUser: { max: 8, windowMs: 15 * 60_000 }, // wrong current password
};

/** Minutes until `key` may try again, or 0 if it's within its limit. Doesn't count an attempt. */
export function blockedFor(key, { max }) {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= Date.now() || entry.count < max) return 0;
  return Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 60_000));
}

/** Counts one attempt for `key`. */
export function countAttempt(key, { windowMs }) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + windowMs });
  else entry.count += 1;
  if (attempts.size > 50_000) {
    for (const [k, value] of attempts) if (value.resetAt <= now) attempts.delete(k);
  }
}

/** Forgets the attempts for `key` (e.g. after a successful sign-in). */
export const clearAttempts = key => attempts.delete(key);

/** The "wait N minutes" message. With t (the "auth" translations) it is in the visitor's language. */
export const tooManyMessage = (minutes, t) =>
  t
    ? t("errors.tooMany", { count: minutes })
    : `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`;
