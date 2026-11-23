// A small in-memory cache for data from other services (exchange rates, news).
//
// Strategy: serve a fresh copy for `ttlMs`; after that, load again. If loading fails, keep serving
// the last good copy marked `stale` (so the page can say "couldn't refresh, showing data from …")
// rather than showing nothing. Only when there has never been a good copy does the error reach
// the caller. Concurrent requests for the same key share one load.
//
// It lives in the server's memory: each server process has its own copy and it's empty after a
// restart, which is fine for public data that's cheap to fetch again.

export function createCache({ now = () => Date.now() } = {}) {
  const entries = new Map(); // key → { data, fetchedAt }
  const loading = new Map(); // key → Promise

  async function get(key, loader, { ttlMs }) {
    const entry = entries.get(key);
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
      const fresh = entries.get(key);
      return { data: fresh.data, fetchedAt: new Date(fresh.fetchedAt), stale: false };
    } catch (error) {
      if (entry) return { data: entry.data, fetchedAt: new Date(entry.fetchedAt), stale: true };
      throw error;
    }
  }

  return { get, clear: () => entries.clear() };
}
