import { apiGet, apiPost, apiDelete } from './client';

export interface RbacArchetype { archtyp_id: number; archtyp_cd: string; archtyp_nm: string; icn_tx?: string; }
export interface RbacRole { rle_id: number; rle_cd: string; rle_nm: string; emoji_tx?: string; icn_tx?: string; archtyp_cd: string; archtyp_id: number; }
export interface RbacCapability { cpblty_id: number; cpblty_cd: string; cpblty_nm: string; }
export interface RbacBootstrap {
  archetypes: RbacArchetype[];
  roles: RbacRole[];
  capabilities: RbacCapability[];
  archetypeCapabilities: Record<string, string[]>;
  departments: any[];
}

export const rbacApi = {
  /** The full DB-owned role/capability/department catalog (replaces roles.ts). */
  bootstrap: () => apiGet<RbacBootstrap>('/rbac/bootstrap'),
  roles: (archetype?: string) => apiGet<RbacRole[]>('/rbac/roles', { params: archetype ? { archetype } : undefined }),
  departments: () => apiGet('/rbac/departments'),

  assignRole: (userId: string | number, rleId: number, primary = false) =>
    apiPost(`/rbac/users/${userId}/roles`, { rle_id: rleId, prmry_in: primary }),
  removeRole: (userId: string | number, rleId: number) =>
    apiDelete(`/rbac/users/${userId}/roles/${rleId}`),
  assignDepartment: (userId: string | number, dprtmntId: number, dsgntnId?: number, primary = false) =>
    apiPost(`/rbac/users/${userId}/departments`, { dprtmnt_id: dprtmntId, dsgntn_id: dsgntnId, prmry_in: primary }),
};
