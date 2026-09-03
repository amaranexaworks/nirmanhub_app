import { IonApp } from '@ionic/react';

/* Core Ionic CSS — required */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/text-alignment.css';

/* Nirmanam design tokens + globals (must come after Ionic base to override) */
import '@design/theme/variables.css';
import '@design/theme/global.css';

import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './routing/AppRouter';

export default function App() {
  return (
    <IonApp>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </IonApp>
  );
}
