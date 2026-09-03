import { apiGet, apiPost, apiPatch } from './client';

export const bookingsApi = {
  list: (params: { role?: 'seeker' | 'pro'; status?: string } = {}) => apiGet<any[]>('/bookings', { params }),
  get: (id: number | string) => apiGet<any>(`/bookings/${id}`),
  create: (body: { proUserId?: number; serviceType?: string; service?: string; status?: string; scheduledAt?: string; amount?: number; note?: string }) =>
    apiPost('/bookings', body),
  update: (id: number | string, body: { status?: string; progress?: number; amount?: number; scheduledAt?: string }) =>
    apiPatch(`/bookings/${id}`, body),
};
