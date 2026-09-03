/**
 * Tiny in-process TTL cache.
 *
 * Purpose: absorb the hot, repeated reads that sit on the request path — the
 * token denylist and per-user account-state guard checked on EVERY authenticated
 * request, and near-static lookups like menus. Under many concurrent users those
 * become a flood of identical DB queries against a bounded pool; caching them for
 * a few seconds collapses that flood into one query per key per TTL window.
 *
 * It is per-instance (not shared across nodes). That is deliberate and safe here:
 *   • TTLs are short, so cross-instance staleness is bounded (≤ the TTL);
 *   • a writer invalidates its OWN instance immediately via cacheDel(), so the
 *     common "user logs out on the instance they're pinned to" case is instant.
 * For strict global invalidation, back this with Redis pub/sub later.
 */
export {};

type Entry = { v: any; exp: number };
const store: Map<string, Entry> = new Map();
const MAX_ENTRIES = 10_000;

function cacheGet(key: string): any {
  const e = store.get(key);
  if (!e) return undefined;
  if (e.exp <= Date.now()) { store.delete(key); return undefined; }
  return e.v;
}

function cacheSet(key: string, value: any, ttlMs: number): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict expired entries first; if still full, drop the oldest insertion.
    const now = Date.now();
    for (const [k, e] of store) if (e.exp <= now) store.delete(k);
    if (store.size >= MAX_ENTRIES) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
  }
  store.set(key, { v: value, exp: Date.now() + ttlMs });
}

function cacheDel(key: string): void { store.delete(key); }

exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
