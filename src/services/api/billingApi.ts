import { apiGet, apiPost } from './client';

export const billingApi = {
  plans: () => apiGet<any[]>('/billing/plans'),
  subscription: () => apiGet<any>('/billing/subscription'),
  subscribe: (plan: 'free' | 'pro', cycle: 'monthly' | 'yearly') => apiPost('/billing/subscribe', { plan, cycle }),
};
