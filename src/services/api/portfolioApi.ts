import { apiGet, apiPost, apiPatch, apiDelete } from './client';

export const portfolioApi = {
  /** Portfolio items. Omit userId for your own; pass one to view a profile's work. */
  list: (userId?: number | string) => apiGet<any[]>('/portfolio', { params: userId ? { userId } : undefined }),
  create: (body: { title: string; description?: string; coverUrl?: string; location?: string; year?: number }) =>
    apiPost('/portfolio', body),
  update: (id: number | string, body: Partial<{ title: string; description: string; coverUrl: string; location: string; year: number }>) =>
    apiPatch(`/portfolio/${id}`, body),
  remove: (id: number | string) => apiDelete(`/portfolio/${id}`),
};
