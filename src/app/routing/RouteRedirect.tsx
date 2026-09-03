import { useEffect } from 'react';
import { IonPage, IonContent, useIonRouter } from '@ionic/react';

/**
 * Ionic-safe redirect. A bare react-router <Redirect> rendered as a route's
 * page content inside an IonRouterOutlet leaves the outlet with no IonPage to
 * show — the screen goes blank (empty app background) for a frame or permanently
 * when it races a state change (logout, guard). Instead we always render a real
 * IonPage and navigate imperatively through Ionic's own router stack.
 */
export function RouteRedirect({ to }: { to: string }) {
  const router = useIonRouter();

  useEffect(() => {
    router.push(to, 'root', 'replace');
  }, [to, router]);

  // Opaque dark placeholder — matches the splash so there's never a blank flash.
  return (
    <IonPage>
      <IonContent fullscreen scrollY={false} style={{ '--background': '#0c0d11' } as React.CSSProperties} />
    </IonPage>
  );
}
