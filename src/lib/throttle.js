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
