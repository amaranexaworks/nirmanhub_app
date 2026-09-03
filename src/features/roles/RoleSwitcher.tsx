import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IonButton,
  IonIcon,
  IonActionSheet,
} from '@ionic/react';
import { swapHorizontalOutline } from 'ionicons/icons';
import { useAuthStore } from '@stores/authStore';
import { ROLE_CATALOG, ARCHETYPE_LABEL, archetypeOf } from '@models/roles';

/**
 * Multi-role accounts: switching swaps the whole shell (tabs + dashboard + features)
 * without re-login. See docs/04-user-flows.md §11.
 */
export function RoleSwitcher() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setActiveRole = useAuthStore((s) => s.setActiveRole);
  const [open, setOpen] = useState(false);

  if (!user || user.roles.length < 2) return null;

  return (
    <>
      <IonButton onClick={() => setOpen(true)} aria-label={t('roles.switchRole', 'Switch role')}>
        <IonIcon slot="icon-only" icon={swapHorizontalOutline} />
      </IonButton>
      <IonActionSheet
        isOpen={open}
        header={t('roles.switchRole', 'Switch role')}
        onDidDismiss={() => setOpen(false)}
        buttons={[
          ...user.roles.map((role) => ({
            text: `${ROLE_CATALOG[role].label} · ${ARCHETYPE_LABEL[archetypeOf(role)]}`,
            role: role === user.activeRole ? ('selected' as const) : undefined,
            handler: () => setActiveRole(role),
          })),
          { text: t('roles.cancel', 'Cancel'), role: 'cancel' as const },
        ]}
      />
    </>
  );
}
