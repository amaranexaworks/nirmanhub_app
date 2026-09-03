import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { outbox, runSync } from '@services/sync';

/** Queue a wage write to the backend and nudge the sync engine (no-op while offline). */
const sync = (op: Parameters<typeof outbox.enqueue>[0]) => { outbox.enqueue(op); void runSync(); };

/**
 * Detailed wage-payment register + audit trail. This is a digital record-keeping
 * layer — it stores accurate payment records to support accounting, payroll & audits.
 * Records are append-only (never overwritten); edits create new versions + audit entries.
 */

export type PayMethod =
  | 'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm'
  | 'bank' | 'neft' | 'rtgs' | 'imps' | 'cheque' | 'mixed';

export const PAY_METHODS: { key: PayMethod; label: string; emoji: string; online: boolean }[] = [
  { key: 'cash', label: 'Cash', emoji: '💵', online: false },
  { key: 'upi', label: 'UPI', emoji: '📲', online: true },
  { key: 'phonepe', label: 'PhonePe', emoji: '🟣', online: true },
  { key: 'gpay', label: 'Google Pay', emoji: '🔵', online: true },
  { key: 'paytm', label: 'Paytm', emoji: '🔷', online: true },
  { key: 'bank', label: 'Bank Transfer', emoji: '🏦', online: true },
  { key: 'neft', label: 'NEFT', emoji: '🏦', online: true },
  { key: 'rtgs', label: 'RTGS', emoji: '🏦', online: true },
  { key: 'imps', label: 'IMPS', emoji: '🏦', online: true },
  { key: 'cheque', label: 'Cheque', emoji: '🧾', online: false },
  { key: 'mixed', label: 'Cash + Online', emoji: '🔀', online: true },
];
export const methodMeta = (m: PayMethod) => PAY_METHODS.find((x) => x.key === m)!;

export interface PaymentLeg { method: PayMethod; amount: number; }

/** When wages are routed through one representative (CASE 2). */
export interface Representative {
  repName: string;
  repMobile?: string;
  repWorkerId?: string;
  reason?: string;
  /** worker ids whose wages were routed to this representative (incl. this record's worker) */
  linkedWorkerIds: string[];
}

export interface Payment {
  id: string;
  receiptNo: string;
  projectId: string;
  /** the worker the wage belongs to (for representative payments, the original worker) */
  workerId: string;
  amount: number;
  method: PayMethod;
  legs?: PaymentLeg[];            // for mixed payments
  txnNumber?: string;
  utr?: string;
  bankName?: string;
  upiId?: string;
  note?: string;
  receipt?: string;              // screenshot / receipt photo (data URL)
  representative?: Representative;
  /** part of a larger wage (pending remains) */
  isPartial?: boolean;
  /** group id linking the representative batch */
  groupId?: string;
  paidBy?: string;
  approvedBy?: string;
  status: 'paid' | 'pending-approval' | 'void';
  createdBy: string;
  createdAt: string;            // human label
  ts: number;                   // sort key
}

/** Bonus / incentive add to payable; penalty / deduction reduce it. Never deleted — voided only. */
export type AdjustmentKind = 'bonus' | 'incentive' | 'penalty' | 'deduction';
export const ADJUSTMENT_META: Record<AdjustmentKind, { label: string; emoji: string; sign: 1 | -1 }> = {
  bonus: { label: 'Bonus', emoji: '🎁', sign: 1 },
  incentive: { label: 'Incentive', emoji: '⭐', sign: 1 },
  penalty: { label: 'Penalty', emoji: '⚠️', sign: -1 },
  deduction: { label: 'Deduction', emoji: '➖', sign: -1 },
};
export interface Adjustment {
  id: string;
  projectId: string;
  workerId: string;
  kind: AdjustmentKind;
  amount: number;
  reason?: string;
  status: 'active' | 'void';
  createdBy: string;
  createdAt: string;
  ts: number;
}

export interface AuditEntry {
  id: string;
  action: string;               // PAYMENT_CREATE, PAYMENT_VOID, EXPORT, …
  detail: string;
  user: string;
  role: string;
  at: string;
  ts: number;
}

interface PaymentsState {
  payments: Payment[];
  adjustments: Adjustment[];
  audit: AuditEntry[];
  receiptSeq: number;
  /** Create one or more payment records atomically (representative batches pass many). */
  recordPayments: (rows: Omit<Payment, 'id' | 'receiptNo' | 'status' | 'createdBy' | 'createdAt' | 'ts'>[], by: { user: string; role: string }) => Payment[];
  voidPayment: (id: string, by: { user: string; role: string }) => void;
  addAdjustment: (row: Omit<Adjustment, 'id' | 'status' | 'createdBy' | 'createdAt' | 'ts'>, by: { user: string; role: string }) => void;
  voidAdjustment: (id: string, by: { user: string; role: string }) => void;
  logAudit: (e: Omit<AuditEntry, 'id' | 'at' | 'ts'>) => void;
}

let n = 1000;
const id = (p: string) => `${p}_${++n}`;
const nowTs = () => Date.now();
const nowLabel = () => new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const usePaymentsStore = create<PaymentsState>()(
  persist(
    (set) => ({
      payments: [],
      adjustments: [],
      audit: [],
      receiptSeq: 1000,

      recordPayments: (rows, by) => {
        const created: Payment[] = [];
        set((st) => {
          let seq = st.receiptSeq;
          const groupId = rows.length > 1 ? id('grp') : undefined;
          const newPayments = rows.map((r) => {
            seq += 1;
            const p: Payment = {
              ...r,
              id: id('pay'),
              receiptNo: `RCPT-${seq}`,
              groupId: r.groupId ?? groupId,
              status: 'paid',
              createdBy: by.user,
              createdAt: nowLabel(),
              ts: nowTs(),
            };
            created.push(p);
            return p;
          });
          const auditEntries: AuditEntry[] = created.map((p) => ({
            id: id('aud'), action: 'PAYMENT_CREATE',
            detail: `${p.receiptNo} · ₹${p.amount.toLocaleString('en-IN')} · ${p.method}${p.representative ? ` · via ${p.representative.repName}` : ''}`,
            user: by.user, role: by.role, at: nowLabel(), ts: nowTs(),
          }));
          return { payments: [...newPayments, ...st.payments], audit: [...auditEntries, ...st.audit], receiptSeq: seq };
        });
        // Mirror each payment to the backend wage ledger (queued + retried if offline).
        created.forEach((p) => sync({
          entity: 'wagesPayment',
          localId: p.id,
          payload: {
            projectId: p.projectId, workerId: p.workerId, amount: p.amount, method: p.method,
            note: p.note, receiptNo: p.receiptNo, paidBy: p.paidBy, representative: p.representative,
            isPartial: p.isPartial, txnNumber: p.txnNumber, utr: p.utr, bankName: p.bankName,
            upiId: p.upiId, groupId: p.groupId,
          },
        }));
        return created;
      },

      voidPayment: (pid, by) => set((st) => {
        const p = st.payments.find((x) => x.id === pid);
        return {
          payments: st.payments.map((x) => (x.id === pid ? { ...x, status: 'void' as const } : x)),
          audit: [{ id: id('aud'), action: 'PAYMENT_VOID', detail: p ? `${p.receiptNo} voided` : pid, user: by.user, role: by.role, at: nowLabel(), ts: nowTs() }, ...st.audit],
        };
      }),

      addAdjustment: (row, by) => {
        const a: Adjustment = { ...row, id: id('adj'), status: 'active', createdBy: by.user, createdAt: nowLabel(), ts: nowTs() };
        const meta = ADJUSTMENT_META[a.kind];
        sync({
          entity: 'wagesAdjustment',
          localId: a.id,
          payload: { projectId: a.projectId, workerId: a.workerId, kind: a.kind, amount: a.amount, reason: a.reason },
        });
        set((st) => ({
          adjustments: [a, ...st.adjustments],
          audit: [{ id: id('aud'), action: 'ADJUSTMENT_ADD', detail: `${meta.label} ${meta.sign < 0 ? '−' : '+'}₹${a.amount.toLocaleString('en-IN')}${a.reason ? ` · ${a.reason}` : ''}`, user: by.user, role: by.role, at: nowLabel(), ts: nowTs() }, ...st.audit],
        }));
      },

      voidAdjustment: (aid, by) => set((st) => {
        const a = st.adjustments.find((x) => x.id === aid);
        return {
          adjustments: st.adjustments.map((x) => (x.id === aid ? { ...x, status: 'void' as const } : x)),
          audit: [{ id: id('aud'), action: 'ADJUSTMENT_VOID', detail: a ? `${ADJUSTMENT_META[a.kind].label} voided` : aid, user: by.user, role: by.role, at: nowLabel(), ts: nowTs() }, ...st.audit],
        };
      }),

      logAudit: (e) => set((st) => ({ audit: [{ ...e, id: id('aud'), at: nowLabel(), ts: nowTs() }, ...st.audit] })),
    }),
    { name: 'nirmaan-payments', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Live (non-void) payments for a worker. */
export const paidForWorker = (payments: Payment[], workerId: string) =>
  payments.filter((p) => p.workerId === workerId && p.status === 'paid');

/** Live (non-void) adjustments for a worker. */
export const adjustmentsForWorker = (adjustments: Adjustment[], workerId: string) =>
  adjustments.filter((a) => a.workerId === workerId && a.status === 'active');

/** Signed net of a worker's adjustments (+bonus/incentive, −penalty/deduction). */
export const netAdjustment = (adjustments: Adjustment[], workerId: string) =>
  adjustmentsForWorker(adjustments, workerId).reduce((s, a) => s + ADJUSTMENT_META[a.kind].sign * a.amount, 0);
