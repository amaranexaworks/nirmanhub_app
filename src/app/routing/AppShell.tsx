import {
  IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, IonRouterOutlet,
} from '@ionic/react';
import { Redirect, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RouteRedirect } from './RouteRedirect';
import { useRoleContext } from '@features/roles/useRoleContext';
import { DashboardScreen } from '@features/dashboards';
import { ProfilePage } from '@features/profile/pages/ProfilePage';
import { HireSearchPage } from '@features/hiring/pages/HireSearchPage';
import { ProProfilePage } from '@features/hiring/pages/ProProfilePage';
import { WalletPage } from '@features/wallet/pages/WalletPage';
import { JobsFeedPage } from '@features/jobs/pages/JobsFeedPage';
import { AvailabilityPage } from '@features/availability/pages/AvailabilityPage';
import { MessagesPage } from '@features/messaging/pages/MessagesPage';
import { ChatThreadPage } from '@features/messaging/pages/ChatThreadPage';
import { NotificationsPage } from '@features/notifications/pages/NotificationsPage';
import { BookingsPage } from '@features/bookings/pages/BookingsPage';
import { LeadsPage } from '@features/projects/pages/LeadsPage';
import { PortfolioPage } from '@features/projects/pages/PortfolioPage';
import { CreatePage } from '@features/projects/pages/CreatePage';
import { SitesPage } from '@features/sites/pages/SitesPage';
import { CatalogPage } from '@features/materials/pages/CatalogPage';
import { AddListingPage } from '@features/materials/pages/AddListingPage';
import { OrdersPage } from '@features/materials/pages/OrdersPage';
import { QuickOrderPage } from '@features/materials/pages/QuickOrderPage';
import { ApplicationsPage } from '@features/lending/pages/ApplicationsPage';
import { LoanProductsPage } from '@features/lending/pages/LoanProductsPage';
import { LoansPage } from '@features/lending/pages/LoansPage';
import { KycPage } from '@features/kyc/pages/KycPage';
import { EditProfilePage } from '@features/profile/pages/EditProfilePage';
import { NearbyMapPage } from '@features/discovery/pages/NearbyMapPage';
import { PostTeamPage } from '@features/jobs/pages/PostTeamPage';
import { WorkforcePage } from '@features/workforce/pages/WorkforcePage';
import { WorkforceProjectsPage } from '@features/workforce/pages/WorkforceProjectsPage';
import { MusterRollPage } from '@features/workforce/pages/MusterRollPage';
import { ContractorBillingPage } from '@features/workforce/pages/ContractorBillingPage';
import { WorkerPassportPage } from '@features/workforce/pages/WorkerPassportPage';
import { CompliancePage } from '@features/workforce/pages/CompliancePage';
import { ProgressCostPage } from '@features/workforce/pages/ProgressCostPage';
import { SafetyPage } from '@features/workforce/pages/SafetyPage';
import { ProjectDashboardPage } from '@features/workforce/pages/ProjectDashboardPage';
import { AiInsightsPage } from '@features/workforce/pages/AiInsightsPage';
import { CashbookPage } from '@features/cashbook/pages/CashbookPage';
import { PostRequirementPage } from '@features/requirements/pages/PostRequirementPage';
import { RequirementsFeedPage } from '@features/requirements/pages/RequirementsFeedPage';
import { MyPostsPage } from '@features/requirements/pages/MyPostsPage';
import { CreditPage } from '@features/credit/pages/CreditPage';
import { WageRegisterPage } from '@features/wageregister/pages/WageRegisterPage';
import { PlansPage } from '@features/billing/pages/PlansPage';
import { SettingsPage } from '@features/settings/pages/SettingsPage';
import { ChangePasswordPage } from '@features/settings/pages/ChangePasswordPage';
import { HelpPage } from '@features/help/pages/HelpPage';
import { ReferEarnPage } from '@features/refer/pages/ReferEarnPage';
import { HistoryPage } from '@features/history/HistoryPage';
import { ProjectDetailPage } from '@features/projects/pages/ProjectDetailPage';
import { SavedPage } from '@features/saved/pages/SavedPage';
import type { TabConfig } from './tabConfigs';

/** Map a tab key to its screen. Every tab in every role resolves to a real page. */
function renderTabContent(tab: TabConfig) {
  switch (tab.key) {
    case 'home': return <DashboardScreen />;
    case 'profile': return <ProfilePage />;
    case 'discover':
    case 'marketplace': return <HireSearchPage />;
    case 'jobs': return <JobsFeedPage />;
    case 'availability': return <AvailabilityPage />;
    case 'messages': return <MessagesPage />;
    case 'bookings': return <BookingsPage />;
    case 'leads': return <LeadsPage />;
    case 'portfolio': return <PortfolioPage />;
    case 'create': return <CreatePage />;
    case 'sites': return <SitesPage />;
    case 'catalog': return <CatalogPage />;
    case 'add': return <AddListingPage />;
    case 'orders': return <OrdersPage />;
    case 'applications': return <ApplicationsPage />;
    case 'products': return <LoanProductsPage />;
    default: return <DashboardScreen />;
  }
}

/**
 * Role-aware tabbed shell. Tab set comes from the role resolver; nested detail
 * routes stack over the active tab. See docs/03-sitemap-navigation.md.
 */
export function AppShell() {
  const { tabs, archetype } = useRoleContext();
  const { t } = useTranslation();

  if (!archetype) return <RouteRedirect to="/onboarding" />;
  // Admins are managed from the separate web console — there's no admin UI in the app.
  // Bounce any stale admin session back to the login screen.
  if (archetype === 'admin') return <RouteRedirect to="/auth/login" />;

  // Dashboards deep-link to /app/discover and /app/marketplace from any role, but those
  // are only tabs for some archetypes. Register them as shared routes when the current
  // role doesn't already have them as a tab, so the link never lands on a blank page.
  // NOTE: IonRouterOutlet chokes on falsy children ("cannot read properties of null
  // (reading 'props')"), so these must be pushed into an array — never rendered via `&&`.
  const tabKeys = new Set(tabs.map((t) => t.key));
  const extraRoutes = [] as JSX.Element[];
  if (!tabKeys.has('discover')) extraRoutes.push(<Route key="x-discover" exact path="/app/discover"><HireSearchPage /></Route>);
  if (!tabKeys.has('marketplace')) extraRoutes.push(<Route key="x-marketplace" exact path="/app/marketplace"><HireSearchPage /></Route>);
  // Shared fallbacks so a deep-link / post-login resume to these never lands blank,
  // even for a role that doesn't carry them as a tab (e.g. guest → sign up → catalog).
  if (!tabKeys.has('catalog')) extraRoutes.push(<Route key="x-catalog" exact path="/app/catalog"><CatalogPage /></Route>);
  if (!tabKeys.has('orders')) extraRoutes.push(<Route key="x-orders" exact path="/app/orders"><OrdersPage /></Route>);
  if (!tabKeys.has('jobs')) extraRoutes.push(<Route key="x-jobs" exact path="/app/jobs"><JobsFeedPage /></Route>);
  if (!tabKeys.has('messages')) extraRoutes.push(<Route key="x-messages" exact path="/app/messages"><MessagesPage /></Route>);

  return (
    <IonTabs>
      <IonRouterOutlet>
        {tabs.map((tab) => (
          <Route key={tab.key} exact path={`/app/${tab.key}`}>
            {renderTabContent(tab)}
          </Route>
        ))}

        {extraRoutes}

        {/* Shared stacked detail routes (available to every role) */}
        <Route exact path="/app/pro/:id" component={ProProfilePage} />
        <Route exact path="/app/chat/:id" component={ChatThreadPage} />
        <Route exact path="/app/wallet"><WalletPage /></Route>
        <Route exact path="/app/notifications"><NotificationsPage /></Route>
        <Route exact path="/app/kyc"><KycPage /></Route>
        <Route exact path="/app/profile/edit"><EditProfilePage /></Route>
        <Route exact path="/app/nearby"><NearbyMapPage /></Route>
        <Route exact path="/app/post-team"><PostTeamPage /></Route>
        <Route exact path="/app/workforce"><WorkforceProjectsPage /></Route>
        <Route exact path="/app/workforce/board/:id"><WorkforcePage /></Route>
        <Route exact path="/app/workforce/board/:id/muster"><MusterRollPage /></Route>
        <Route exact path="/app/workforce/board/:id/contractors"><ContractorBillingPage /></Route>
        <Route exact path="/app/workforce/worker/:workerId/passport"><WorkerPassportPage /></Route>
        <Route exact path="/app/workforce/board/:id/compliance"><CompliancePage /></Route>
        <Route exact path="/app/workforce/board/:id/progress"><ProgressCostPage /></Route>
        <Route exact path="/app/workforce/board/:id/safety"><SafetyPage /></Route>
        <Route exact path="/app/workforce/board/:id/dashboard"><ProjectDashboardPage /></Route>
        <Route exact path="/app/workforce/board/:id/ai-insights"><AiInsightsPage /></Route>
        <Route exact path="/app/workforce/board/:id/cashbook"><CashbookPage /></Route>
        <Route exact path="/app/workforce/board"><WorkforcePage /></Route>
        <Route exact path="/app/post-requirement"><PostRequirementPage /></Route>
        <Route exact path="/app/requirements"><RequirementsFeedPage /></Route>
        <Route exact path="/app/my-posts"><MyPostsPage /></Route>
        <Route exact path="/app/credit"><CreditPage /></Route>
        <Route exact path="/app/loans"><LoansPage /></Route>
        <Route exact path="/app/wage-register"><WageRegisterPage /></Route>
        <Route exact path="/app/plans"><PlansPage /></Route>
        <Route exact path="/app/order"><QuickOrderPage /></Route>
        <Route exact path="/app/settings"><SettingsPage /></Route>
        <Route exact path="/app/change-password"><ChangePasswordPage /></Route>
        <Route exact path="/app/help"><HelpPage /></Route>
        <Route exact path="/app/refer"><ReferEarnPage /></Route>
        <Route exact path="/app/saved"><SavedPage /></Route>
        <Route exact path="/app/history"><HistoryPage /></Route>
        <Route exact path="/app/project/:id" component={ProjectDetailPage} />

        <Route exact path="/app"><Redirect to="/app/home" /></Route>
      </IonRouterOutlet>

      <IonTabBar slot="bottom">
        {tabs.map((tab) => (
          <IonTabButton key={tab.key} tab={tab.key} href={`/app/${tab.key}`}>
            {/* Emphasized center action (Create/Add) is a navy circle — a distinct
                action button, so it never gets confused with the amber "selected tab". */}
            <IonIcon icon={tab.icon} style={tab.emphasized
              ? { fontSize: 40, color: '#1f2b45', filter: 'drop-shadow(0 5px 10px rgba(31,43,69,0.30))' }
              : { fontSize: 25 }} />
            <IonLabel>{t(tab.labelKey, tab.fallbackLabel)}</IonLabel>
          </IonTabButton>
        ))}
      </IonTabBar>
    </IonTabs>
  );
}
