/**
 * Per-entity delivery — how each queued write is sent to the backend, and how
 * the created record's server id is read back.
 *
 * A handler throws {@link BlockedError} when it can't run yet because a parent
 * record hasn't synced (its local id isn't mapped). The engine treats that as
 * "try again after the parent lands", not as a failure.
 */
import { workforceApi } from '@services/api/workforceApi';
import { wagesApi } from '@services/api/wagesApi';
import { resolveId } from './idMap';
import type { OutboxOp, SyncEntity } from './types';

/** A dependency (project/supervisor/worker) hasn't synced yet — retry later. */
export class BlockedError extends Error {}

type SendResult = { serverId?: number | string };

/** Resolve a required id reference or block the op until its parent syncs. */
function need(id: unknown, what: string): number | string {
  const r = resolveId(id as any);
  if (r == null) throw new BlockedError(`waiting for ${what} to sync`);
  return r;
}

export const handlers: Record<SyncEntity, (op: OutboxOp) => Promise<SendResult>> = {
  supervisor: async (op) => {
    const pid = need(op.payload.projectId, 'project');
    const row: any = await workforceApi.addSupervisor(pid, {
      name: op.payload.name,
      phone: op.payload.phone,
      site: op.payload.site,
    });
    return { serverId: row?.suprvsr_id };
  },

  worker: async (op) => {
    const pid = need(op.payload.projectId, 'project');
    const body: any = { ...op.payload };
    delete body.projectId;
    delete body.localId;
    // supervisorId is optional; when present it must resolve to a real id first.
    if (op.payload.supervisorId) body.supervisorId = need(op.payload.supervisorId, 'supervisor');
    else delete body.supervisorId;
    const row: any = await workforceApi.addWorker(pid, body);
    return { serverId: row?.workr_id };
  },

  attendance: async (op) => {
    const pid = need(op.payload.projectId, 'project');
    const workerId = need(op.payload.workerId, 'worker');
    // Idempotent on the server (ON CONFLICT (workr_id, atndnc_dt) DO UPDATE), so a
    // replay after a lost ack simply re-writes the same mark — never a duplicate.
    const row: any = await workforceApi.markAttendance(pid, {
      workerId: Number(workerId),
      date: op.payload.date,
      status: op.payload.status,
      overtime: op.payload.overtime,
      lat: op.payload.lat,
      lng: op.payload.lng,
      selfie: op.payload.selfie,
    });
    return { serverId: row?.id };
  },

  expense: async (op) => {
    const pid = need(op.payload.projectId, 'project');
    const paidBy = op.payload.paidBy ? need(op.payload.paidBy, 'supervisor') : undefined;
    const row: any = await workforceApi.addExpense(pid, {
      category: op.payload.category,
      title: op.payload.title,
      amount: op.payload.amount,
      date: op.payload.date,
      paidBy: paidBy != null ? String(paidBy) : undefined,
      settled: op.payload.settled,
    });
    return { serverId: row?.expns_id };
  },

  advance: async (op) => {
    const workerId = need(op.payload.workerId, 'worker');
    const row: any = await workforceApi.addAdvance(workerId, {
      amount: op.payload.amount,
      date: op.payload.date,
      note: op.payload.note,
    });
    return { serverId: row?.advnc_id };
  },

  payout: async (op) => {
    const pid = need(op.payload.projectId, 'project');
    const workerId = need(op.payload.workerId, 'worker');
    const row: any = await workforceApi.addPayout(pid, {
      workerId: Number(workerId),
      amount: op.payload.amount,
      periodKey: op.payload.periodKey,
      date: op.payload.date,
    });
    return { serverId: row?.payout_id };
  },

  // ── Wage register (detailed payment ledger + adjustments) ──
  wagesPayment: async (op) => {
    const p = op.payload;
    const workerId = p.workerId ? need(p.workerId, 'worker') : undefined;
    const projectId = resolveId(p.projectId);
    const row: any = await wagesApi.recordPayment({
      projectId: projectId != null ? Number(projectId) : undefined,
      workerId: workerId != null ? Number(workerId) : undefined,
      amount: p.amount, method: p.method, note: p.note, receiptNo: p.receiptNo,
      paidBy: p.paidBy, representative: p.representative, isPartial: p.isPartial,
      txnNumber: p.txnNumber, utr: p.utr, bankName: p.bankName, upiId: p.upiId, groupId: p.groupId,
    });
    return { serverId: row?.pymnt_id };
  },

  wagesAdjustment: async (op) => {
    const p = op.payload;
    const workerId = p.workerId ? need(p.workerId, 'worker') : undefined;
    const projectId = resolveId(p.projectId);
    const row: any = await wagesApi.addAdjustment({
      projectId: projectId != null ? Number(projectId) : undefined,
      workerId: workerId != null ? Number(workerId) : undefined,
      kind: p.kind, amount: p.amount, reason: p.reason,
    });
    return { serverId: row?.adjstmnt_id };
  },
};
