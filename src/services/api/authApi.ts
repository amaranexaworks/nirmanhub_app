import { apiGet, apiPost } from './client';
import type { User } from '@models/index';
import type { Role } from '@models/roles';

/** Backend user payload (snake_case) → the app's `User` shape (camelCase, Role codes). */
export function mapUser(b: any): User {
  return {
    id: String(b.id ?? b.usr_id),
    name: b.name ?? b.dsply_nm ?? 'Member',
    phone: b.phone ?? b.mbl_nm ?? '',
    email: b.email ?? undefined,
    avatarUrl: b.avatarUrl ?? undefined,
    roles: (b.roles ?? []).map((r: any) => r.rle_cd as Role),
    activeRole: (b.activeRole?.rle_cd ?? undefined) as Role | undefined,
    capabilities: b.capabilities ?? undefined,
    kycTier: (b.kycTier ?? 'none') as User['kycTier'],
    pincode: b.pincode ?? undefined,
    city: b.city ?? undefined,
    location: b.location ?? undefined,
    rating: b.rating ?? 0,
    ratingCount: b.ratingCount ?? 0,
    headline: b.headline ?? undefined,
    bio: b.bio ?? undefined,
    dayRate: b.dayRate ?? undefined,
    serviceRadiusKm: b.serviceRadiusKm ?? undefined,
    skills: b.skills ?? undefined,
    languages: b.languages ?? undefined,
  };
}

export interface VerifyResult { token: string; user: User; isNewUser: boolean; raw: any; }

export const authApi = {
  /** Sign up with name + phone + password + selected role(s). `roles` are role codes;
   *  the first becomes the primary/active role (no separate onboarding step). */
  async register(name: string, phone: string, password: string, roles: string[] = []): Promise<VerifyResult> {
    const data = await apiPost<{ token: string; user: any; isNewUser: boolean }>('/auth/register', { name, phone, password, roles });
    return { token: data.token, user: mapUser(data.user), isNewUser: data.isNewUser, raw: data.user };
  },

  /** Log in with phone + password. */
  async login(phone: string, password: string): Promise<VerifyResult> {
    const data = await apiPost<{ token: string; user: any; isNewUser: boolean }>('/auth/login', { phone, password });
    return { token: data.token, user: mapUser(data.user), isNewUser: data.isNewUser, raw: data.user };
  },

  /** Google / Apple / email sign-in. Pass `idToken` (from the real Google/Apple SDK)
   *  to have the server verify it; without it the server trusts the email (dev/email flow). */
  async social(provider: 'google' | 'apple' | 'email', email: string, name?: string, idToken?: string): Promise<VerifyResult> {
    const data = await apiPost<{ token: string; user: any; isNewUser: boolean }>('/auth/social', { provider, email, name, idToken });
    return { token: data.token, user: mapUser(data.user), isNewUser: data.isNewUser, raw: data.user };
  },

  /** Full current auth context (roles, capabilities, departments). */
  async me(): Promise<User> {
    return mapUser(await apiGet('/auth/me'));
  },

  /** Change the active role → returns a fresh token + user. */
  async switchRole(rleId: number): Promise<{ token: string; user: User }> {
    const data = await apiPost<{ token: string; user: any }>('/auth/switch-role', { rle_id: rleId });
    return { token: data.token, user: mapUser(data.user) };
  },

  logout: () => apiPost('/auth/logout').catch(() => undefined),
};
