/**
 * Offline sync — shared types.
 *
 * The workforce board is used on real construction sites where connectivity is
 * unreliable. Every write is captured locally first (in the Zustand store, for
 * instant UI) and mirrored into a durable **outbox**. A background engine drains
 * the outbox to the backend when a connection is available, so no attendance,
 * wage or expense entry is ever lost to a dead signal.
 */

/** The domain entities we sync from the workforce board to the backend. */
export type SyncEntity =
  | 'supervisor' | 'worker' | 'attendance' | 'expense' | 'advance' | 'payout'
  | 'wagesPayment' | 'wagesAdjustment';

/** One queued write waiting to reach the server. */
export interface OutboxOp {
  /** Unique id for this queued operation (client-generated). */
  opId: string;
  entity: SyncEntity;
  /**
   * Local id of the record this op creates (supervisors/workers). On success the
   * engine records `localId → serverId` so dependent ops (attendance, advances…)
   * can resolve the real backend id. Omitted for upserts (attendance).
   */
  localId?: string;
  /**
   * Natural key used to collapse repeated edits of the same record into one
   * pending op (e.g. re-marking attendance for the same worker+date). A new op
   * with the same `dedupeKey` replaces the previous still-pending one.
   */
  dedupeKey?: string;
  /** The data needed to build the request. May reference local ids (resolved at send time). */
  payload: Record<string, any>;
  createdAt: number;
  /** How many delivery attempts have failed so far. */
  tries: number;
  /** Epoch ms before which the engine should not retry (exponential backoff). */
  nextAttemptAt: number;
  lastError?: string;
  /** Parked after too many failures — surfaced to the user, no longer auto-retried. */
  dead?: boolean;
}
