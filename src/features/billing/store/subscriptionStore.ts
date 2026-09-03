import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Subscription state — "Pro" plan that every role can buy to get unlimited
 * customers/leads. UI-first: subscribe() simulates a successful payment today;
 * the real flow returns from the gateway (Razorpay UPI Autopay) webhook later.
 *
 * Free users get a small monthly lead quota; once spent they hit the paywall.
 */

export type Plan = 'free' | 'pro';
export type Cycle = 'monthly' | 'yearly';

// Plan pricing & benefits now come from the backend (`GET /billing/plans`).

/** Free plan allowance per calendar month (business rule; not price data). */
export const FREE_LEAD_LIMIT = 3;

interface SubState {
  plan: Plan;
  cycle: Cycle;
  /** human label of when Pro started / renews (UI only). */
  proSince?: string;
  renewsOn?: string;
  autoRenew: boolean;
  /** YYYY-MM that leadsUsed is counted against — resets when month rolls over. */
  monthKey: string;
  leadsUsed: number;

  /** True if the user may unlock another lead right now. */
  canUnlock: () => boolean;
  /** Remaining free unlocks this month (Infinity for Pro). */
  remaining: () => number;
  /** Spend one lead unlock. Returns false if blocked (should show paywall). */
  useLead: () => boolean;
  /** Simulated successful subscribe — replace with gateway success callback. */
  subscribe: (cycle: Cycle) => void;
  setAutoRenew: (on: boolean) => void;
  cancel: () => void;
}

const ymNow = () => new Date().toISOString().slice(0, 7); // YYYY-MM
const dateLabel = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const useSubscriptionStore = create<SubState>()(
  persist(
    (set, get) => ({
      plan: 'free',
      cycle: 'monthly',
      autoRenew: true,
      monthKey: ymNow(),
      leadsUsed: 0,

      remaining: () => {
        const s = get();
        if (s.plan === 'pro') return Infinity;
        const used = s.monthKey === ymNow() ? s.leadsUsed : 0;
        return Math.max(0, FREE_LEAD_LIMIT - used);
      },

      canUnlock: () => get().remaining() > 0,

      useLead: () => {
        const s = get();
        if (s.plan === 'pro') return true;
        const month = ymNow();
        const used = s.monthKey === month ? s.leadsUsed : 0;
        if (used >= FREE_LEAD_LIMIT) return false;
        set({ monthKey: month, leadsUsed: used + 1 });
        return true;
      },

      subscribe: (cycle) => {
        const now = new Date();
        const renews = new Date(now);
        if (cycle === 'yearly') renews.setFullYear(now.getFullYear() + 1);
        else renews.setMonth(now.getMonth() + 1);
        set({ plan: 'pro', cycle, autoRenew: true, proSince: dateLabel(now), renewsOn: dateLabel(renews) });
      },

      setAutoRenew: (on) => set({ autoRenew: on }),

      cancel: () => set({ plan: 'free', autoRenew: false, proSince: undefined, renewsOn: undefined }),
    }),
    { name: 'nirmaan-subscription', storage: createJSONStorage(() => localStorage) },
  ),
);
