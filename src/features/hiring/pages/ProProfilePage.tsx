import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { chatbubbleEllipsesOutline, checkmarkCircle, locationOutline, briefcaseOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { Avatar, Badge, RatingStars, GradientButton } from '@design/primitives';
import { ROLE_CATALOG, type Role } from '@models/roles';
import { profileApi } from '@services/api/profileApi';

export function ProProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { data: worker, isLoading } = useQuery({ queryKey: ['user', id], queryFn: () => profileApi.getById(id), enabled: !!id });

  if (isLoading || !worker) {
    return <PageShell title={t('hire.profile', 'Profile')} showBack><BrandLoader /></PageShell>;
  }

  const roleLabel = worker.activeRole && ROLE_CATALOG[worker.activeRole as Role] ? ROLE_CATALOG[worker.activeRole as Role].label : t('hire.professional', 'Professional');
  const verified = worker.kycTier === 'verified';
  const skills = worker.skills ?? [];

  return (
    <PageShell title={worker.name} showBack footer={<GradientButton icon={briefcaseOutline} onClick={() => history.push(`/app/chat/${id}`)}>{t('hire.requestQuote', 'Request Quote')}</GradientButton>}>
      <AnimatedPage>
        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 16px 8px', textAlign: 'center' }}>
            <Avatar name={worker.name} size={92} verified={verified} />
            <h2 style={{ margin: '12px 0 2px', fontSize: 22, fontWeight: 800 }}>{worker.name}</h2>
            <div className="anrix-muted">{worker.headline || roleLabel}</div>
            <div style={{ marginTop: 8 }}>
              <RatingStars value={worker.rating || 0} count={worker.ratingCount || 0} size={16} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {verified && <Badge tone="success">{t('hire.verified', 'Verified')}</Badge>}
              {worker.city && <Badge tone="info" icon={locationOutline}>{worker.city}</Badge>}
            </div>
            <div style={{ marginTop: 14, width: '100%', maxWidth: 260 }}>
              <GradientButton variant="outline" icon={chatbubbleEllipsesOutline} onClick={() => history.push(`/app/chat/${id}`)}>{t('hire.chat', 'Chat')}</GradientButton>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ display: 'flex', margin: 16, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--anrix-border)' }}>
            {[
              { key: 'rating', label: t('hire.rating', 'Rating'), v: `${(worker.rating || 0).toFixed(1)}★` },
              { key: 'reviews', label: t('hire.reviews', 'Reviews'), v: `${worker.ratingCount || 0}` },
              { key: 'dayRate', label: t('hire.dayRate', 'Day rate'), v: worker.dayRate ? `₹${worker.dayRate}` : '—' },
            ].map((s, i) => (
              <div key={s.key} style={{ flex: 1, padding: '14px 8px', textAlign: 'center', borderLeft: i ? '1px solid var(--anrix-border)' : 'none' }}>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{s.v}</div>
                <div className="anrix-muted" style={{ fontSize: 12 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {worker.bio && (
          <Section title={t('hire.about', 'About')}>
            <p style={{ margin: '0 16px', color: 'var(--anrix-text)', fontSize: 14, lineHeight: 1.5 }}>{worker.bio}</p>
          </Section>
        )}

        {skills.length > 0 && (
          <Section title={t('hire.skills', 'Skills')}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '0 16px' }}>
              {skills.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
            </div>
          </Section>
        )}

        <Section title={t('hire.verification', 'Verification')}>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { k: 'identityKyc', label: t('hire.identityKyc', 'Identity (KYC)'), ok: verified },
              { k: 'phoneVerified', label: t('hire.phoneVerified', 'Phone verified'), ok: true },
            ].map((v) => (
              <div key={v.k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IonIcon icon={checkmarkCircle} style={{ color: v.ok ? 'var(--anrix-success)' : 'var(--anrix-text-muted)', fontSize: 20 }} />
                <span style={{ color: v.ok ? 'var(--anrix-text-strong)' : 'var(--anrix-text-muted)' }}>{v.label}</span>
              </div>
            ))}
          </div>
        </Section>
      </AnimatedPage>
    </PageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <div style={{ fontSize: 17, fontWeight: 700, margin: '18px 16px 10px' }}>{title}</div>
      {children}
    </Reveal>
  );
}
