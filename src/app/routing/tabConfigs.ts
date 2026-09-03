import {
  home,
  search,
  calendar,
  chatbubbles,
  person,
  briefcase,
  flash,
  grid,
  storefront,
  addCircle,
  construct,
  images,
  cube,
  receipt,
  layers,
  documentText,
  cash,
} from 'ionicons/icons';
import type { Archetype } from '@models/roles';

export interface TabConfig {
  /** unique tab key; also the route segment under /app */
  key: string;
  /** i18n key for the label */
  labelKey: string;
  fallbackLabel: string;
  icon: string;
  /** true → render as a center FAB-style emphasized tab */
  emphasized?: boolean;
}

/**
 * Max 5 tabs per archetype (thumb-reachable). The first tab is always the
 * role-specific dashboard. See docs/03-sitemap-navigation.md §2.
 */
export const TAB_CONFIGS: Record<Archetype, TabConfig[]> = {
  seeker: [
    { key: 'home', labelKey: 'tabs.home', fallbackLabel: 'Home', icon: home },
    { key: 'discover', labelKey: 'tabs.discover', fallbackLabel: 'Discover', icon: search },
    { key: 'bookings', labelKey: 'tabs.bookings', fallbackLabel: 'Bookings', icon: calendar },
    { key: 'messages', labelKey: 'tabs.messages', fallbackLabel: 'Messages', icon: chatbubbles },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  worker: [
    { key: 'home', labelKey: 'tabs.home', fallbackLabel: 'Home', icon: home },
    { key: 'jobs', labelKey: 'tabs.jobs', fallbackLabel: 'Jobs', icon: briefcase },
    { key: 'availability', labelKey: 'tabs.availability', fallbackLabel: 'Available', icon: flash },
    { key: 'messages', labelKey: 'tabs.messages', fallbackLabel: 'Messages', icon: chatbubbles },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  expert: [
    { key: 'home', labelKey: 'tabs.home', fallbackLabel: 'Home', icon: home },
    { key: 'leads', labelKey: 'tabs.leads', fallbackLabel: 'Leads', icon: layers },
    { key: 'portfolio', labelKey: 'tabs.portfolio', fallbackLabel: 'Portfolio', icon: images },
    { key: 'messages', labelKey: 'tabs.messages', fallbackLabel: 'Messages', icon: chatbubbles },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  orchestrator: [
    { key: 'home', labelKey: 'tabs.dashboard', fallbackLabel: 'Home', icon: grid },
    { key: 'marketplace', labelKey: 'tabs.marketplace', fallbackLabel: 'Market', icon: storefront },
    { key: 'create', labelKey: 'tabs.create', fallbackLabel: 'Create', icon: addCircle, emphasized: true },
    { key: 'sites', labelKey: 'tabs.sites', fallbackLabel: 'Sites', icon: construct },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  vendor: [
    { key: 'home', labelKey: 'tabs.dashboard', fallbackLabel: 'Home', icon: grid },
    { key: 'catalog', labelKey: 'tabs.catalog', fallbackLabel: 'Catalog', icon: cube },
    { key: 'add', labelKey: 'tabs.add', fallbackLabel: 'Add', icon: addCircle, emphasized: true },
    { key: 'orders', labelKey: 'tabs.orders', fallbackLabel: 'Orders', icon: receipt },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  financier: [
    { key: 'home', labelKey: 'tabs.dashboard', fallbackLabel: 'Home', icon: grid },
    { key: 'applications', labelKey: 'tabs.applications', fallbackLabel: 'Loans', icon: documentText },
    { key: 'products', labelKey: 'tabs.products', fallbackLabel: 'Products', icon: cash },
    { key: 'messages', labelKey: 'tabs.messages', fallbackLabel: 'Chats', icon: chatbubbles },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
  // Admins never use the mobile tab shell — they are redirected to the desktop
  // /admin console. This entry only keeps the archetype→tabs map type-complete.
  admin: [
    { key: 'home', labelKey: 'tabs.home', fallbackLabel: 'Home', icon: home },
    { key: 'profile', labelKey: 'tabs.profile', fallbackLabel: 'Profile', icon: person },
  ],
};
