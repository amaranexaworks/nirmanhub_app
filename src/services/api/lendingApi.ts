import { apiGet, apiPost, apiPatch } from './client';

export const lendingApi = {
  products: () => apiGet<any[]>('/lending/products'),
  createProduct: (body: { name: string; rate?: string; range?: string; tenure?: string; forRole?: string; description?: string }) =>
    apiPost('/lending/products', body),
  apply: (productId: number | string, body: { amount?: number; tenure?: string; purpose?: string }) =>
    apiPost(`/lending/products/${productId}/apply`, body),
  myApplications: () => apiGet<any[]>('/lending/applications'),
  reviewQueue: () => apiGet<any[]>('/lending/review-queue'),
  review: (applicationId: number | string, status: 'approved' | 'rejected' | 'disbursed' | 'pending', remark?: string) =>
    apiPatch(`/lending/applications/${applicationId}`, { status, remark }),
};
