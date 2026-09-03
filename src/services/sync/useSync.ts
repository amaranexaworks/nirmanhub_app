/** React hook exposing sync state for a status indicator. */
import { useEffect, useState } from 'react';
import { useOutbox } from './outbox';
import { isOnline, onNetworkChange } from './network';
import { runSync } from './engine';

export interface SyncStatus {
  /** Writes still waiting to reach the server. */
  pending: number;
  /** Writes parked after repeated failures (need attention). */
  failed: number;
  online: boolean;
  /** Force a drain attempt now (e.g. a "retry" tap). */
  retry: () => void;
}

export function useSyncStatus(): SyncStatus {
  const ops = useOutbox((s) => s.ops);
  const [online, setOnline] = useState(isOnline());
  useEffect(() => onNetworkChange(setOnline), []);
  return {
    pending: ops.filter((o) => !o.dead).length,
    failed: ops.filter((o) => o.dead).length,
    online,
    retry: () => void runSync(),
  };
}
