import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonMenuButton,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/react';
import { notificationsOutline } from 'ionicons/icons';
import type { ReactNode } from 'react';
import { RoleSwitcher } from '@features/roles/RoleSwitcher';
import { LogoMark } from '@design/brand/Logo';

export interface PageShellProps {
  title: string;
  children: ReactNode;
  /** show a back button instead of the role switcher (for stacked detail pages) */
  showBack?: boolean;
  /** sticky footer CTA region */
  footer?: ReactNode;
  onRefresh?: () => Promise<void> | void;
  hideRoleSwitcher?: boolean;
}

/** Every page renders through PageShell — consistent header, safe-area, pull-to-refresh, sticky CTA. */
export function PageShell({
  title,
  children,
  showBack,
  footer,
  onRefresh,
  hideRoleSwitcher,
}: PageShellProps) {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            {showBack ? <IonBackButton defaultHref="/app/home" /> : <IonMenuButton />}
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2, marginRight: 4 }}>
              <LogoMark size={32} animated={false} />
            </span>
          </IonButtons>
          <IonTitle>{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton routerLink="/app/notifications" aria-label="Notifications">
              <IonIcon slot="icon-only" icon={notificationsOutline} />
            </IonButton>
            {!showBack && !hideRoleSwitcher && <RoleSwitcher />}
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {onRefresh && (
          <IonRefresher slot="fixed" onIonRefresh={async (e) => { await onRefresh(); e.detail.complete(); }}>
            <IonRefresherContent />
          </IonRefresher>
        )}
        {children}
      </IonContent>

      {footer && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            padding: 'var(--anrix-space-4) var(--anrix-space-5)',
            paddingBottom: 'calc(var(--anrix-space-4) + env(safe-area-inset-bottom))',
            background: 'var(--anrix-surface)',
            borderTop: '1px solid var(--anrix-border)',
          }}
        >
          {footer}
        </div>
      )}
    </IonPage>
  );
}
