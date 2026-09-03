import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Role, User } from '@models/index';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;

  /** Set the session from a backend login (OTP verify / me). */
  applyAuth: (token: string, user: User) => void;
  /** Replace the token only (e.g. after switch-role). */
  setToken: (token: string) => void;
  /** Merge server-shaped user fields into the current user. */
  patchUser: (patch: Partial<User>) => void;

  /** Legacy local helpers (kept so existing components compile; they mutate cache only). */
  startSession: (identity: { name: string; phone?: string; email?: string; provider?: User['authProvider'] }) => void;
  setRoles: (roles: Role[], name?: string) => void;
  completeOnboarding: () => void;
  setActiveRole: (role: Role) => void;
  addRole: (role: Role) => void;
  updateProfile: (patch: Partial<User>) => void;
  setKycTier: (tier: 'none' | 'basic' | 'verified') => void;
  logout: () => void;
}

/**
 * Session/identity state, persisted to localStorage (`anrix-auth`). The JWT is the
 * authority for API calls; `user` mirrors `/auth/me`. `hasOnboarded` is true once
 * the user holds at least one role.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasOnboarded: false,

      applyAuth: (token, user) =>
        set({
          token,
          user,
          isAuthenticated: true,
          hasOnboarded: (user.roles?.length ?? 0) > 0,
        }),

      setToken: (token) => set({ token }),

      patchUser: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),

      startSession: ({ name, phone = '', email, provider = 'phone' }) => {
        const digits = phone.replace(/\D/g, '');
        const id = digits ? `u_${digits.slice(-10)}` : `u_${(email ?? 'guest').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12)}`;
        set({
          isAuthenticated: true,
          hasOnboarded: false,
          user: { id, name: name.trim() || 'Member', phone, email, authProvider: provider, roles: [], kycTier: 'none', rating: 0, ratingCount: 0 },
        });
      },

      setRoles: (roles, name) =>
        set((s) => (s.user ? { user: { ...s.user, name: name ?? s.user.name, roles, activeRole: roles[0] } } : s)),

      completeOnboarding: () => set({ hasOnboarded: true }),

      setActiveRole: (role) => set((s) => (s.user ? { user: { ...s.user, activeRole: role } } : s)),

      addRole: (role) =>
        set((s) => (s.user && !s.user.roles.includes(role) ? { user: { ...s.user, roles: [...s.user.roles, role] } } : s)),

      updateProfile: (patch) => set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),

      setKycTier: (tier) => set((s) => (s.user ? { user: { ...s.user, kycTier: tier } } : s)),

      logout: () => set({ token: null, user: null, isAuthenticated: false, hasOnboarded: false }),
    }),
    {
      name: 'anrix-auth',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
