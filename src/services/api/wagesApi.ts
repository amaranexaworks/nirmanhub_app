import { apiGet, apiPost } from './client';

export const wagesApi = {
  payments: (params: { projectId?: number; workerId?: number } = {}) => apiGet<any[]>('/wages/payments', { params }),
  recordPayment: (body: { projectId?: number; workerId?: number; amount: number; method?: string; note?: string; receiptNo?: string; paidBy?: string; representative?: any; isPartial?: boolean; txnNumber?: string; utr?: string; bankName?: string; upiId?: string; groupId?: string }) =>
    apiPost('/wages/payments', body),
  adjustments: (projectId?: number) => apiGet<any[]>('/wages/adjustments', { params: projectId ? { projectId } : undefined }),
  addAdjustment: (body: { projectId?: number; workerId?: number; kind: string; amount: number; reason?: string }) => apiPost('/wages/adjustments', body),
  audit: (limit = 100) => apiGet<any[]>('/wages/audit', { params: { limit } }),
};
