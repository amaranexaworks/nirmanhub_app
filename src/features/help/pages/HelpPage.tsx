import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { callOutline, mailOutline, logoWhatsapp, chevronDown, helpCircleOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';

const FAQS = [
  { k: 'hireWorker', q: 'How do I hire a worker?', a: 'Open Discover, search by trade and location, view a pro’s profile, then tap Request Quote or Chat to connect.' },
  { k: 'payment', q: 'How does payment work?', a: 'Payments are held in escrow and released to the worker once you confirm the job is done. UPI payouts are instant.' },
  { k: 'kyc', q: 'How do I get verified (KYC)?', a: 'Go to Settings → Identity verification, upload an ID document, and we’ll verify it — usually within a few hours.' },
  { k: 'switchRoles', q: 'Can I switch between roles?', a: 'Yes. Open the side menu → Switch Role. You can hold multiple roles and add more anytime from onboarding.' },
  { k: 'postJob', q: 'How do I post a job or requirement?', a: 'Use the Create tab (builders/contractors) or the Open Work Board to post what you need; matching pros will respond with quotes.' },
];

export function HelpPage() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const contact = [
    { k: 'call', icon: callOutline, label: t('help.callSupport', 'Call support'), sub: '1800-000-000', href: 'tel:1800000000', tone: 'var(--anrix-primary)' },
    { k: 'whatsapp', icon: logoWhatsapp, label: t('help.whatsapp', 'WhatsApp'), sub: t('help.chatWithUs', 'Chat with us'), href: 'https://wa.me/910000000000', tone: '#25D366' },
    { k: 'email', icon: mailOutline, label: t('help.email', 'Email'), sub: 'help@nirmanamhub.com', href: 'mailto:help@nirmanamhub.com', tone: 'var(--anrix-info)' },
  ];

  return (
    <PageShell title={t('help.title', 'Help & Support')} showBack>
      <AnimatedPage>
        <div style={{ padding: '4px 16px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {contact.map((c) => (
            <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
              style={{ textDecoration: 'none', color: 'inherit', background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
              <IonIcon icon={c.icon} style={{ fontSize: 24, color: c.tone }} />
              <div style={{ fontWeight: 700, fontSize: 12.5, marginTop: 6 }}>{c.label}</div>
              <div className="anrix-muted" style={{ fontSize: 11 }}>{c.sub}</div>
            </a>
          ))}
        </div>

        <div style={{ padding: '14px 16px 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)' }}>{t('help.frequentlyAsked', 'FREQUENTLY ASKED')}</div>
        {FAQS.map((f, i) => (
          <div key={i} className="anrix-card" style={{ margin: '0 16px 8px', overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <IonIcon icon={helpCircleOutline} style={{ color: 'var(--anrix-primary-strong)', fontSize: 18, flexShrink: 0 }} />
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{t(`help.faq_${f.k}_q`, f.q)}</span>
              <IonIcon icon={chevronDown} style={{ transition: 'transform .2s', transform: open === i ? 'rotate(180deg)' : 'none', color: 'var(--anrix-text-muted)' }} />
            </button>
            {open === i && <div className="anrix-muted" style={{ padding: '0 14px 14px 42px', fontSize: 13.5, lineHeight: 1.5 }}>{t(`help.faq_${f.k}_a`, f.a)}</div>}
          </div>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
