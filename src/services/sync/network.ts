/**
 * Network status — a single source of truth for "are we online?".
 *
 * Uses the Capacitor Network plugin on device and falls back to the browser's
 * `navigator.onLine` on the web. Consumers subscribe to be notified the moment
 * connectivity returns, so the sync engine can drain the outbox immediately.
 */
import { Network } from '@capacitor/network';

type Listener = (online: boolean) => void;

let online = true;
let started = false;
const listeners = new Set<Listener>();

function emit(next: boolean) {
  if (online === next) return;
  online = next;
  listeners.forEach((l) => {
    try { l(next); } catch { /* a bad listener must not break the others */ }
  });
}

/** Begin watching connectivity. Safe to call more than once. */
export async function startNetworkMonitor(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const status = await Network.getStatus();
    online = status.connected;
    Network.addListener('networkStatusChange', (s) => emit(s.connected));
  } catch {
    // Plugin unavailable (plain web build) — use the DOM signals instead.
    online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => emit(true));
      window.addEventListener('offline', () => emit(false));
    }
  }
}

export const isOnline = (): boolean => online;

/** Subscribe to online/offline transitions. Returns an unsubscribe fn. */
export function onNetworkChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
