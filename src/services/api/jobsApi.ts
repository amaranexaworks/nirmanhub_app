import { apiGet, apiPost } from './client';

export const jobsApi = {
  list: (params: { trade?: string; city?: string; limit?: number; offset?: number } = {}) =>
    apiGet<any[]>('/jobs', { params }),
  mine: () => apiGet<any[]>('/jobs/mine'),
  applied: () => apiGet<any[]>('/jobs/applied'),
  saved: () => apiGet<any[]>('/jobs/saved'),
  create: (body: { title: string; trade?: string; pay?: number; payUnit?: string; days?: number; location?: string; urgent?: boolean; description?: string }) =>
    apiPost('/jobs', body),
  apply: (jobId: number | string, message?: string) => apiPost(`/jobs/${jobId}/apply`, { message }),
  applicants: (jobId: number | string) => apiGet<any[]>(`/jobs/${jobId}/applicants`),
  toggleSave: (jobId: number | string) => apiPost<{ saved: boolean }>(`/jobs/${jobId}/save`),
};
