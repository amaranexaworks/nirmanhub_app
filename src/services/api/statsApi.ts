import { apiGet } from './client';

export interface DashboardStats {
  sites: number;
  workers: number;
  presentToday: number;
  workersThisWeek: number;
  wageBillWeek: number;
  pendingPay: number;
  spendMonth: number;
  attendance: { site: string; present: number; total: number }[];
}

/** Public + owner-scoped platform stats. */
export const statsApi = {
  /** Total registered users on the platform. */
  userCount: async (): Promise<number> => {
    const data = await apiGet<{ total: number }>('/stats/users/count');
    return data?.total ?? 0;
  },
  /** Live KPIs for the contractor/orchestrator dashboard (owner-scoped). */
  dashboard: () => apiGet<DashboardStats>('/stats/dashboard'),
};
