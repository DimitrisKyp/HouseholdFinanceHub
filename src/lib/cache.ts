// A small in-memory cache for data from other services (exchange rates, news).
//
// Strategy: serve a fresh copy for `ttlMs`; after that, load again. If loading fails, keep serving
// the last good copy marked `stale` (so the page can say "couldn't refresh, showing data from …")
// rather than showing nothing. Only when there has never been a good copy does the error reach
// the caller. Concurrent requests for the same key share one load.
//
// It lives in the server's memory: each server process has its own copy and it's empty after a
// restart, which is fine for public data that's cheap to fetch again.

/** What get() returns: the data, when it was fetched, and whether it's an old copy kept after a failed refresh. */
export type Cached<T> = { data: T; fetchedAt: Date; stale: boolean };

export function createCache({ now = () => Date.now() }: { now?: () => number } = {}) {
  // One cache holds different kinds of data under different keys, so entries are stored as
  // `unknown` and each get<T>() call says what type its loader returns.
  const entries = new Map<string, { data: unknown; fetchedAt: number }>();
  const loading = new Map<string, Promise<unknown>>();

  async function get<T>(key: string, loader: () => T | Promise<T>, { ttlMs }: { ttlMs: number }): Promise<Cached<T>> {
    const entry = entries.get(key) as { data: T; fetchedAt: number } | undefined;
    if (entry && now() - entry.fetchedAt < ttlMs) return { data: entry.data, fetchedAt: new Date(entry.fetchedAt), stale: false };

    if (!loading.has(key)) {
      loading.set(
        key,
        Promise.resolve()
          .then(loader)
          .then(data => {
            entries.set(key, { data, fetchedAt: now() });
            return data;
          })
          .finally(() => loading.delete(key)),
      );
    }
    try {
      await loading.get(key);
      const fresh = entries.get(key) as { data: T; fetchedAt: number };
      return { data: fresh.data, fetchedAt: new Date(fresh.fetchedAt), stale: false };
    } catch (error) {
      if (entry) return { data: entry.data, fetchedAt: new Date(entry.fetchedAt), stale: true };
      throw error;
    }
  }

  return { get, clear: () => entries.clear() };
}
