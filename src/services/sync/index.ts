/**
 * Offline sync — public surface.
 *
 * The workforce store enqueues writes via {@link outbox}; {@link initSync} boots
 * the engine once at app start; {@link useSyncStatus} drives the UI indicator.
 */
export { initSync, runSync } from './engine';
export { useSyncStatus, type SyncStatus } from './useSync';
export { outbox } from './outbox';
export { isOnline } from './network';
export { localForServer, getServerId } from './idMap';
export type { SyncEntity, OutboxOp } from './types';
