/**
 * The outbox — a durable queue of pending writes.
 *
 * Backed by a persisted Zustand store so (a) the UI can reactively show how many
 * writes are still waiting, and (b) the queue survives an app restart. The engine
 * drains it; the workforce store fills it.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OutboxOp } from './types';

/** What a caller supplies to enqueue — the engine/store fills in the bookkeeping. */
export type NewOp = Pick<OutboxOp, 'entity' | 'payload'> & Partial<Pick<OutboxOp, 'localId' | 'dedupeKey'>>;

interface OutboxState {
  ops: OutboxOp[];
  enqueue: (op: NewOp) => void;
  remove: (opId: string) => void;
  update: (opId: string, patch: Partial<OutboxOp>) => void;
  clearDead: () => void;
}

let seq = 0;
const newOpId = () => `op_${Date.now().toString(36)}_${(seq++).toString(36)}`;

export const useOutbox = create<OutboxState>()(
  persist(
    (set) => ({
      ops: [],
      enqueue: (op) =>
        set((st) => {
          // Collapse a still-pending op with the same natural key (e.g. the same
          // worker+date attendance being changed twice before it syncs).
          const kept = op.dedupeKey ? st.ops.filter((o) => o.dead || o.dedupeKey !== op.dedupeKey) : st.ops;
          const full: OutboxOp = {
            ...op,
            opId: newOpId(),
            createdAt: Date.now(),
            tries: 0,
            nextAttemptAt: 0,
          };
          return { ops: [...kept, full] };
        }),
      remove: (opId) => set((st) => ({ ops: st.ops.filter((o) => o.opId !== opId) })),
      update: (opId, patch) => set((st) => ({ ops: st.ops.map((o) => (o.opId === opId ? { ...o, ...patch } : o)) })),
      clearDead: () => set((st) => ({ ops: st.ops.filter((o) => !o.dead) })),
    }),
    { name: 'nirmaan-sync-outbox', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

/** Non-hook accessors for use outside React (the engine, the store actions). */
export const outbox = {
  enqueue: (op: NewOp) => useOutbox.getState().enqueue(op),
  all: () => useOutbox.getState().ops,
  remove: (opId: string) => useOutbox.getState().remove(opId),
  update: (opId: string, patch: Partial<OutboxOp>) => useOutbox.getState().update(opId, patch),
  clearDead: () => useOutbox.getState().clearDead(),
};
