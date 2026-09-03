import { apiGet, apiPost } from './client';

export const materialsApi = {
  categories: () => apiGet<any[]>('/materials/categories'),
  catalog: (params: { category?: string; q?: string; limit?: number } = {}) => apiGet<any[]>('/materials/catalog', { params }),
  addItem: (body: { name: string; price: number; unit?: string; category?: string; emoji?: string; etaMin?: number; popular?: boolean }) =>
    apiPost('/materials/catalog', body),
  orders: () => apiGet<any[]>('/materials/orders'),
  order: (id: number | string) => apiGet<any>(`/materials/orders/${id}`),
  createOrder: (body: { items: { itemId?: number; name: string; qty: number; price: number; unit?: string }[]; deliveryTo?: string }) =>
    apiPost('/materials/orders', body),
};
