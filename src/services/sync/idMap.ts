/**
 * Local-id → server-id map.
 *
 * Records created offline get a temporary local id (e.g. `w_101`). Once the
 * backend accepts them it returns the real numeric id. This map remembers that
 * translation so dependent writes queued offline (an attendance mark for a
 * not-yet-synced worker) can be resolved to the real id at send time. It is
 * persisted so the mapping survives an app restart mid-sync.
 */
const KEY = 'nirmaan-sync-idmap';

function load(): Record<string, number | string> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

let map: Record<string, number | string> = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* storage full / unavailable */ }
}

export function setServerId(localId: string, serverId: number | string): void {
  map[localId] = serverId;
  save();
}

export function getServerId(localId: string): number | string | undefined {
  return map[localId];
}

/**
 * Reverse lookup: the local id we already hold for a given server id, if this
 * device created that record and synced it. Used during reconcile so a record
 * pulled from the server is recognised as "already mine" (and merged onto the
 * existing local id) instead of appearing as a duplicate.
 */
export function localForServer(serverId: number | string): string | null {
  const target = String(serverId);
  for (const localId in map) {
    if (String(map[localId]) === target) return localId;
  }
  return null;
}

/**
 * Resolve any id reference to its backend id.
 * - a number, or an all-digits string, is already a server id (e.g. a project's
 *   route id) → returned as-is;
 * - a local temp id (`w_101`) → its mapped server id, or `null` if not synced yet.
 */
export function resolveId(id: string | number | undefined | null): number | string | null {
  if (id == null || id === '') return null;
  if (typeof id === 'number') return id;
  if (/^\d+$/.test(id)) return id;
  return map[id] ?? null;
}
