import { useMemo } from 'react';
import { useAuthStore } from '@stores/authStore';
import {
  ARCHETYPE_CAPABILITIES,
  resolveArchetype,
  type Archetype,
  type Capability,
  type Role,
} from '@models/roles';
import { TAB_CONFIGS, type TabConfig } from '@app/routing/tabConfigs';

export interface RoleContext {
  activeRole: Role | null;
  archetype: Archetype | null;
  tabs: TabConfig[];
  capabilities: Capability[];
  can: (cap: Capability) => boolean;
}

/**
 * The single hook that derives everything role-dependent: archetype, tab bar,
 * capabilities. Adding a role never touches routing — only this resolver + config.
 * See docs/02-architecture.md §5.
 */
export function useRoleContext(): RoleContext {
  const activeRole = useAuthStore((s) => s.user?.activeRole ?? null);
  // Effective capabilities from the server (archetype grants + any per-user
  // feature grants an admin gave). Falls back to the static archetype map for
  // legacy/local sessions that predate server-provided capabilities.
  const serverCaps = useAuthStore((s) => s.user?.capabilities ?? null);

  return useMemo(() => {
    if (!activeRole) {
      return { activeRole: null, archetype: null, tabs: [], capabilities: [], can: () => false };
    }
    const archetype = resolveArchetype(activeRole);
    const capabilities = (serverCaps && serverCaps.length ? serverCaps : ARCHETYPE_CAPABILITIES[archetype]) as Capability[];
    return {
      activeRole,
      archetype,
      tabs: TAB_CONFIGS[archetype],
      capabilities,
      can: (cap: Capability) => capabilities.includes(cap),
    };
  }, [activeRole, serverCaps]);
}
