import { apiGet, apiPut, apiPost } from './client';
import { mapUser } from './authApi';
import type { User } from '@models/index';

/** Map the app's camelCase profile patch to the backend's snake_case columns. */
function toBackend(patch: Partial<User> & { availability?: any }): any {
  const b: any = {};
  if (patch.name !== undefined) b.dsply_nm = patch.name;
  if (patch.email !== undefined) b.eml_tx = patch.email;
  if (patch.avatarUrl !== undefined) b.avtr_url_tx = patch.avatarUrl;
  if (patch.city !== undefined) b.cty_nm = patch.city;
  if (patch.pincode !== undefined) b.pncd_tx = patch.pincode;
  if (patch.headline !== undefined) b.hdln_tx = patch.headline;
  if (patch.bio !== undefined) b.bio_tx = patch.bio;
  if (patch.dayRate !== undefined) b.day_rate_am = patch.dayRate;
  if (patch.serviceRadiusKm !== undefined) b.srvc_rds_km = patch.serviceRadiusKm;
  if (patch.location?.lat !== undefined) { b.lat = patch.location.lat; b.lng = patch.location.lng; }
  return b;
}

export const profileApi = {
  me: async (): Promise<User> => mapUser(await apiGet('/users/me')),
  update: async (patch: Partial<User>): Promise<User> => mapUser(await apiPut('/users/me', toBackend(patch))),
  getById: async (id: string | number): Promise<User> => mapUser(await apiGet(`/users/${id}`)),
  addSkill: (skill: string) => apiPost('/users/me/skills', { skill }),
  /** Change/reset own password. `currentPassword` is verified if one is already set. */
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPut('/users/me/password', { currentPassword, newPassword }),
};
