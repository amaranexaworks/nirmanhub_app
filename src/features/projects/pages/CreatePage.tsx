import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { peopleOutline, briefcaseOutline, businessOutline, documentTextOutline, cubeOutline, chevronForward } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Pressable } from '@components/motion';

const ACTIONS = [
  { icon: peopleOutline, key: 'postTeamJob', title: 'Post a Team Job', sub: 'Need a crew? e.g. 1 mason + 3 labour with rates', go: '/app/post-team', tone: 'var(--anrix-primary)' },
  { icon: briefcaseOutline, key: 'hireSingleWorker', title: 'Hire a Single Worker', sub: 'Browse & hire one pro near your site', go: '/app/marketplace', tone: 'var(--anrix-success)' },
  { icon: businessOutline, key: 'postProject', title: 'Post a Project', sub: 'Invite contractors to bid on your project', go: '/app/marketplace', tone: 'var(--anrix-info)' },
  { icon: documentTextOutline, key: 'requestQuote', title: 'Request a Quote', sub: 'Get quotes from experts & vendors', go: '/app/marketplace', tone: 'var(--anrix-warning)' },
  { icon: cubeOutline, key: 'addSite', title: 'Add a Site', sub: 'Create a site to track teams & progress', go: '/app/sites', tone: 'var(--anrix-primary)' },
];

export function CreatePage() {
  const history = useHistory();
  const { t } = useTranslation();
  return (
    <PageShell title={t('proj.create', 'Create')}>
      <AnimatedPage>
        <p className="anrix-muted" style={{ padding: '4px 20px 8px', fontSize: 14 }}>{t('proj.whatToDo', 'What would you like to do?')}</p>
        <div style={{ padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ACTIONS.map((a) => (
            <Pressable key={a.title} onPress={() => history.push(a.go)}>
              <div className="anrix-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)' }}>
                  <IonIcon icon={a.icon} style={{ fontSize: 24, color: a.tone }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t(`proj.${a.key}Title`, a.title)}</div>
                  <div className="anrix-muted" style={{ fontSize: 13 }}>{t(`proj.${a.key}Sub`, a.sub)}</div>
                </div>
                <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)' }} />
              </div>
            </Pressable>
          ))}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}
