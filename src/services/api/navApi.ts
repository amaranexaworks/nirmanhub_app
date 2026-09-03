import { apiGet } from './client';

export interface NavTab { key: string; label: string; labelKey?: string; icon?: string; route: string; emphasized?: boolean; }
export interface NavDrawerItem { key: string; label: string; labelKey?: string; icon?: string; route: string; }
export interface NavMenu {
  archetype: string | null;
  activeRole?: any;
  tabs: NavTab[];
  drawer: { sections: { name: string; items: NavDrawerItem[] }[] };
}

export const navApi = {
  /** Tabs + side-menu for the logged-in user, resolved from the DB by active role. */
  menu: () => apiGet<NavMenu>('/nav/menu'),
};
