import { apiGet, apiPost } from './client';

export const notificationsApi = {
  list: (unread = false) => apiGet<any[]>('/notifications', { params: unread ? { unread: true } : undefined }),
  unreadCount: () => apiGet<{ unread: number }>('/notifications/unread-count'),
  create: (body: { title: string; body?: string; type?: string; url?: string; userId?: number }) => apiPost('/notifications', body),
  markRead: (id: number | string) => apiPost(`/notifications/${id}/read`),
  markAllRead: () => apiPost('/notifications/read-all'),
};
