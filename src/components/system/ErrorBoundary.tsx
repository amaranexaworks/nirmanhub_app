import { Component, type ReactNode } from 'react';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import { alertCircleOutline, refreshOutline } from 'ionicons/icons';

/**
 * Catches render errors in a page subtree so one bad data row can never blank the
 * whole app (previously any thrown error left a white screen). Shows a recoverable
 * message and a retry that re-mounts the subtree.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface it for debugging; the UI stays usable.
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    // Must render an ion-page so Ionic's router outlet actually displays it
    // (a bare <div> here shows as a blank white screen inside IonRouterOutlet).
    return (
      <IonPage>
        <IonContent>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '100%', padding: 24, textAlign: 'center' }}>
            <div style={{ maxWidth: 320 }}>
              <IonIcon icon={alertCircleOutline} style={{ fontSize: 46, color: 'var(--anrix-text-muted)' }} />
              <h2 style={{ margin: '14px 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--anrix-text-strong)' }}>Something went wrong</h2>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--anrix-text-muted)' }}>This screen hit an error. Try again — the rest of the app is fine.</p>
              <button onClick={() => this.setState({ error: null })}
                style={{ marginTop: 18, height: 46, padding: '0 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontSize: 15, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <IonIcon icon={refreshOutline} /> Retry
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }
}
