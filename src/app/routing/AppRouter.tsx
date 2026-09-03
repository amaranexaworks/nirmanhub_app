import { useEffect } from 'react';
import { IonReactRouter } from '@ionic/react-router';
import { IonRouterOutlet } from '@ionic/react';
import { Redirect, Route, useHistory, useLocation } from 'react-router-dom';
import { AppShell } from './AppShell';
import { AppMenu } from './AppMenu';
import { AuthGuard } from './guards/AuthGuard';
import { SplashScreen } from '@features/auth/SplashScreen';
import { LoginScreen } from '@features/auth/LoginScreen';
import { OnboardingScreen } from '@features/onboarding/OnboardingScreen';
import { GuestBrowsePage } from '@features/guest/GuestBrowsePage';

/** On every cold load (once per session), route through the animated splash first. */
function ColdStart() {
  const history = useHistory();
  const location = useLocation();
  useEffect(() => {
    if (!sessionStorage.getItem('nirmaan_splashed') && location.pathname !== '/splash') {
      history.replace('/splash');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export function AppRouter() {
  return (
    <IonReactRouter>
      <ColdStart />
      <AppMenu />
      <IonRouterOutlet id="main">
        <Route exact path="/splash">
          <SplashScreen />
        </Route>
        <Route exact path="/auth/login">
          <LoginScreen />
        </Route>
        <Route exact path="/onboarding">
          <OnboardingScreen />
        </Route>
        <Route exact path="/browse">
          <GuestBrowsePage />
        </Route>
        <Route path="/app">
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        </Route>
        <Route exact path="/">
          <Redirect to="/splash" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  );
}
