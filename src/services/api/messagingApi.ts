import { apiGet, apiPost } from './client';

export const messagingApi = {
  threads: () => apiGet<any[]>('/messaging/threads'),
  start: (userId: number | string) => apiPost<{ thrd_id: number }>('/messaging/threads', { userId }),
  messages: (threadId: number | string) => apiGet<any[]>(`/messaging/threads/${threadId}/messages`),
  send: (threadId: number | string, body: { body?: string; voiceSecs?: number }) => apiPost(`/messaging/threads/${threadId}/messages`, body),
};
