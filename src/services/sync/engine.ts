/**
 * The sync engine — drains the outbox to the backend.
 *
 * Runs whenever connectivity returns and after any write is queued. Processes
 * ops in creation order so parents (supervisor, worker) land before their
 * children (attendance, advance, payout). It re-passes the queue until a full
 * pass makes no progress, which lets a whole dependency chain flush in one run.
 *
 * Delivery is at-least-once: an op is removed only on a confirmed success. The
 * one high-frequency write, attendance, is idempotent server-side, so a replay
 * after a lost acknowledgement is safe.
 */
import { isOnline, onNetworkChange, startNetworkMonitor } from './network';
import { outbox } from './outbox';
import { handlers, BlockedError } from './handlers';
import { setServerId } from './idMap';

const MAX_TRIES = 8;
/** 1s, 2s, 4s … capped at 60s. */
const backoff = (tries: number) => Math.min(60_000, 1_000 * 2 ** (tries - 1));

let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;

export async function runSync(): Promise<void> {
  if (running || !isOnline()) return;
  running = true;
  try {
    let progressed = true;
    while (progressed) {
      progressed = false;
      const now = Date.now();
      const ready = outbox.all().filter((o) => !o.dead && o.nextAttemptAt <= now);
      for (const op of ready) {
        // It may have been collapsed away (deduped) since the snapshot was taken.
        if (!outbox.all().some((o) => o.opId === op.opId)) continue;
        try {
          const { serverId } = await handlers[op.entity](op);
          if (op.localId && serverId != null) setServerId(op.localId, serverId);
          outbox.remove(op.opId);
          progressed = true;
        } catch (e) {
          if (e instanceof BlockedError) continue; // parent not synced yet — a later pass will pick it up
          const tries = op.tries + 1;
          outbox.update(op.opId, {
            tries,
            lastError: (e as Error)?.message || 'sync failed',
            nextAttemptAt: Date.now() + backoff(tries),
            dead: tries >= MAX_TRIES,
          });
        }
      }
    }
  } finally {
    running = false;
    scheduleNext();
  }
}

/** Wake the engine again when the earliest backoff expires (or to re-check blocked ops). */
function scheduleNext() {
  if (timer) return;
  const pending = outbox.all().filter((o) => !o.dead);
  if (pending.length === 0) return;
  const now = Date.now();
  const soonest = Math.min(...pending.map((o) => Math.max(0, o.nextAttemptAt - now)));
  timer = setTimeout(() => { timer = null; void runSync(); }, Math.max(3_000, soonest));
}

/** Start connectivity monitoring and flush anything left over from a previous session. */
export async function initSync(): Promise<void> {
  await startNetworkMonitor();
  onNetworkChange((online) => { if (online) void runSync(); });
  void runSync();
}
