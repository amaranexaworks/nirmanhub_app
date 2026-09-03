import { apiGet, apiPost } from './client';

export const referralApi = {
  /** { code, joined, rewardEarned } for the signed-in user. */
  summary: () => apiGet<{ code: string; joined: number; rewardEarned: number }>('/referral/summary'),
  /** People the user has referred (who joined via their code). */
  list: () => apiGet<any[]>('/referral'),
  /** Attribute the caller to a code's owner (called after signing up with a code). */
  redeem: (code: string) => apiPost('/referral/redeem', { code }),
};
