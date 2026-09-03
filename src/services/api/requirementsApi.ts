import { apiGet, apiPost } from './client';

export const requirementsApi = {
  serviceTypes: () => apiGet<any[]>('/requirements/service-types'),
  list: (params: { limit?: number; offset?: number } = {}) => apiGet<any[]>('/requirements', { params }),
  mine: () => apiGet<any[]>('/requirements/mine'),
  create: (body: { title: string; serviceType?: string; location?: string; budget?: string; areaSqft?: number; floors?: number; description?: string }) =>
    apiPost('/requirements', body),
  responses: (id: number | string) => apiGet<any[]>(`/requirements/${id}/responses`),
  respond: (id: number | string, body: { price?: string; message?: string }) => apiPost(`/requirements/${id}/responses`, body),
  // Leads screen
  myResponses: () => apiGet<any[]>('/requirements/my-responses'),
  invited: () => apiGet<any[]>('/requirements/invited'),
  invite: (id: number | string, userId: number | string) => apiPost(`/requirements/${id}/invite`, { userId }),
};
