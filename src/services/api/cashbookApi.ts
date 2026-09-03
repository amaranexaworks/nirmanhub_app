import { apiGet, apiPost, apiDelete } from './client';

export type CashKind = 'payment_in' | 'payment_out' | 'expense' | 'petty_cash';

export interface CashTxn {
  cbk_id: number;
  prjct_id: number;
  kind_cd: CashKind;
  dir_cd: 'in' | 'out';
  amt_am: string | number;
  party_tx: string | null;
  ttl_tx: string | null;
  note_tx: string | null;
  mode_cd: string | null;
  txn_dt: string;
  i_ts: string;
}

export interface CashSummary { month: string; cashInHand: number; monthIn: number; monthOut: number }

/** Per-site cashbook (money in / out, running cash-in-hand). Scoped to the project owner. */
export const cashbookApi = {
  summary: (projectId: number | string, month?: string) =>
    apiGet<CashSummary>(`/cashbook/${projectId}/summary`, month ? { params: { month } } : undefined),
  list: (projectId: number | string, params?: { kind?: CashKind; month?: string; from?: string; to?: string; limit?: number }) =>
    apiGet<CashTxn[]>(`/cashbook/${projectId}`, params ? { params } : undefined),
  add: (projectId: number | string, body: { kind: CashKind; amount: number; party?: string; title?: string; note?: string; mode?: string; date?: string }) =>
    apiPost<CashTxn>(`/cashbook/${projectId}`, body),
  remove: (projectId: number | string, id: number) => apiDelete(`/cashbook/${projectId}/${id}`),
};
