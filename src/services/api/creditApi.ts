import { apiGet, apiPost } from './client';

export const creditApi = {
  orders: (status?: 'due' | 'paid') => apiGet<any[]>('/credit/orders', { params: status ? { status } : undefined }),
  create: (body: { vendor?: string; tenureDays?: number; items: { name: string; qty: number; price: number; unit?: string; emoji?: string }[] }) =>
    apiPost('/credit/orders', body),
  pay: (id: number | string) => apiPost(`/credit/orders/${id}/pay`),
};
