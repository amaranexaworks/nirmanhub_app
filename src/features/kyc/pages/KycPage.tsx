import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { IonIcon, IonToast, IonSpinner } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  cloudUploadOutline, checkmarkCircle, shieldCheckmark, lockClosedOutline, documentTextOutline, warningOutline,
  calendarOutline, callOutline, timeOutline,
} from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { Badge, GradientButton } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { useRoleContext } from '@features/roles/useRoleContext';
import { kycApi } from '@services/api/kycApi';
import { filesApi, type FileMeta } from '@services/api/filesApi';
import { docsFor } from '../data/requirements';

/**
 * Identity verification. Uploaded proofs land in the central file stores
 * (image_lst_t / document_lst_t) via /files, tagged `kyc_<docKey>`; the checklist
 * status is read back from there — no local/dummy "uploaded" flags.
 */
export function KycPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const qc = useQueryClient();
  const { archetype } = useRoleContext();
  const kycTier = useAuthStore((s) => s.user?.kycTier ?? 'none');
  const phone = useAuthStore((s) => s.user?.phone ?? '');
  const patchUser = useAuthStore((s) => s.patchUser);

  const docs = docsFor(archetype ?? 'seeker');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Latest submission — tells us if a verification slot is already booked.
  const { data: kycStatus } = useQuery({ queryKey: ['kyc', 'status'], queryFn: () => kycApi.status() });
  const bookedSlot: string | null = kycStatus?.slot_sts_cd === 'booked' ? kycStatus.slot_ts : null;

  // Bookable slots: next 5 days × a few windows, at least 1h ahead. Grouped by day.
  const SLOT_HOURS = [10, 12, 15, 17];
  const slotDays: { day: string; items: { iso: string; label: string }[] }[] = [];
  for (let off = 0; off < 5; off++) {
    const base = new Date();
    base.setDate(base.getDate() + off);
    const items: { iso: string; label: string }[] = [];
    for (const h of SLOT_HOURS) {
      const dt = new Date(base);
      dt.setHours(h, 0, 0, 0);
      if (dt.getTime() < Date.now() + 60 * 60 * 1000) continue;
      items.push({ iso: dt.toISOString(), label: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) });
    }
    if (items.length) slotDays.push({ day: base.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), items });
  }
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const pendingKey = useRef<string | null>(null);

  // Real uploaded status — combine both file stores, keyed by purpose `kyc_<key>`.
  const { data: images = [] } = useQuery({ queryKey: ['files', 'images'], queryFn: () => filesApi.images() });
  const { data: documents = [] } = useQuery({ queryKey: ['files', 'documents'], queryFn: () => filesApi.documents() });
  const uploadedSet = new Set<string>([...images, ...documents].map((f: FileMeta) => f.purpose_cd));
  const isDone = (key: string) => uploadedSet.has(`kyc_${key}`);

  const requiredKeys = docs.filter((d) => !d.hint.includes('optional')).map((d) => d.key);
  const allDone = requiredKeys.every((k) => isDone(k));
  const doneCount = docs.filter((d) => isDone(d.key)).length;

  const uploadMut = useMutation({
    mutationFn: ({ key, file }: { key: string; file: File }) => filesApi.uploadFile(`kyc_${key}`, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['files', 'images'] });
      qc.invalidateQueries({ queryKey: ['files', 'documents'] });
      setToast(t('kyc.documentUploaded', 'Document uploaded ✓'));
    },
    onError: (e: any) => setToast(e.message || t('kyc.uploadFailed', 'Upload failed')),
    onSettled: () => setUploadingKey(null),
  });

  const pickFor = (key: string) => { pendingKey.current = key; fileInput.current?.click(); };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = pendingKey.current;
    e.target.value = ''; // allow re-selecting the same file
    if (!file || !key) return;
    if (file.size > 10 * 1024 * 1024) { setToast(t('kyc.fileTooLarge', 'File too large (max 10 MB)')); return; }
    setUploadingKey(key);
    uploadMut.mutate({ key, file });
  };

  const submit = async () => {
    if (!slot) { setToast(t('kyc.pleasePickSlot', 'Please pick a verification slot')); return; }
    setBusy(true);
    try {
      if (rescheduling && bookedSlot) {
        // Already submitted — just move the slot.
        await kycApi.bookSlot(slot, phone);
      } else {
        await kycApi.submit({ docType: requiredKeys[0] || 'aadhaar', tier: 'verified', slotTs: slot, contactPhone: phone });
        patchUser({ kycTier: kycTier === 'none' ? 'basic' : kycTier });
      }
      qc.invalidateQueries({ queryKey: ['kyc', 'status'] });
      setToast(t('kyc.slotBooked', 'Slot booked! Our team will call you to verify. ✓'));
      setRescheduling(false);
      setTimeout(() => history.goBack(), 1400);
    } catch (e: any) {
      setToast(e.message || t('kyc.couldNotSubmit', 'Could not submit'));
    } finally {
      setBusy(false);
    }
  };

  if (kycTier === 'verified') {
    return (
      <PageShell title={t('kyc.verification', 'Verification')} showBack>
        <AnimatedPage>
          <Reveal>
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(31,157,107,0.14)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                <IonIcon icon={shieldCheckmark} style={{ fontSize: 52, color: 'var(--anrix-success)' }} />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{t('kyc.youreVerified', "You're verified ✓")}</h2>
              <p className="anrix-muted" style={{ maxWidth: 300, margin: '0 auto' }}>
                {t('kyc.identityConfirmed', 'Your identity is confirmed. The verified badge now shows on your profile — customers trust you more.')}
              </p>
            </div>
          </Reveal>
        </AnimatedPage>
      </PageShell>
    );
  }

  // Slot already booked → show the scheduled confirmation (Slice-style).
  if (bookedSlot && !rescheduling) {
    return (
      <PageShell title={t('kyc.verification', 'Verification')} showBack>
        <AnimatedPage>
          <Reveal>
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--anrix-primary-soft)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}>
                <IonIcon icon={calendarOutline} style={{ fontSize: 48, color: 'var(--anrix-primary-strong)' }} />
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{t('kyc.verificationScheduled', 'Verification scheduled')}</h2>
              <p className="anrix-muted" style={{ maxWidth: 320, margin: '0 auto 18px' }}>
                {t('kyc.teamWillCall', 'Our verification team will call you to confirm your identity. Keep your original documents handy.')}
              </p>
              <div className="anrix-card" style={{ maxWidth: 340, margin: '0 auto', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <IonIcon icon={timeOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
                  <span style={{ fontWeight: 700 }}>{new Date(bookedSlot).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IonIcon icon={callOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
                  <span className="anrix-muted">{t('kyc.wellCallNumber', "We'll call {{phone}}", { phone: kycStatus?.contact_ph_tx || phone })}</span>
                </div>
              </div>
              <button onClick={() => { setRescheduling(true); setSlot(null); }} style={{ ...uploadBtn, margin: '20px auto 0' }}>
                <IonIcon icon={calendarOutline} /> {t('kyc.rescheduleSlot', 'Reschedule slot')}
              </button>
            </div>
          </Reveal>
        </AnimatedPage>
        <IonToast isOpen={!!toast} message={toast} duration={1400} onDidDismiss={() => setToast('')} />
      </PageShell>
    );
  }

  const canSubmit = (allDone || (rescheduling && !!bookedSlot)) && !!slot;
  const footerLabel = busy ? t('kyc.booking', 'Booking…')
    : !allDone && !rescheduling ? t('kyc.uploadRequiredDocs', 'Upload {{count}} required docs', { count: requiredKeys.filter((k) => !isDone(k)).length })
    : !slot ? t('kyc.pickSlot', 'Pick a verification slot')
    : t('kyc.bookSlotSubmit', 'Book slot & submit');

  return (
    <PageShell
      title={t('kyc.verifyIdentity', 'Verify Identity')}
      showBack
      footer={<GradientButton disabled={!canSubmit || busy} onClick={() => void submit()} icon={shieldCheckmark}>
        {footerLabel}
      </GradientButton>}
    >
      <AnimatedPage>
        {/* Status banner */}
        <Reveal>
          <div style={{ margin: 16, padding: 12, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <IonIcon icon={lockClosedOutline} style={{ fontSize: 28, color: 'var(--anrix-hero-accent)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{t('kyc.whyVerify', 'Why verify?')}</div>
                <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 13 }}>{t('kyc.whyVerifyDesc', 'Verified profiles get hired more & build trust. Your docs are encrypted and never shared publicly.')}</div>
              </div>
            </div>
            <div style={{ marginTop: 14, height: 6, borderRadius: 3, background: 'var(--anrix-hero-chip)', overflow: 'hidden' }}>
              <div style={{ width: `${(doneCount / docs.length) * 100}%`, height: '100%', background: 'var(--anrix-primary)', transition: 'width .3s' }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--anrix-hero-muted)' }}>{t('kyc.documentsUploaded', '{{done}}/{{total}} documents uploaded', { done: doneCount, total: docs.length })}</div>
          </div>
        </Reveal>

        {/* Document list */}
        <div style={{ padding: '0 16px 16px' }}>
          {docs.map((d) => {
            const done = isDone(d.key);
            const loading = uploadingKey === d.key;
            return (
              <Reveal key={d.key}>
                <div className="anrix-card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14,
                  borderColor: done ? 'var(--anrix-success)' : d.critical ? 'var(--anrix-warning)' : 'var(--anrix-border-strong)' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center',
                    background: done ? 'rgba(31,157,107,0.14)' : 'var(--anrix-surface-2)' }}>
                    <IonIcon icon={done ? checkmarkCircle : documentTextOutline}
                      style={{ fontSize: 24, color: done ? 'var(--anrix-success)' : 'var(--anrix-text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>{d.label}</span>
                      {d.critical && !done && <Badge tone="warning" icon={warningOutline}>{t('kyc.required', 'Required')}</Badge>}
                    </div>
                    <div className="anrix-muted" style={{ fontSize: 12.5 }}>{d.hint}</div>
                  </div>
                  {done ? (
                    <Badge tone="success">{t('kyc.uploaded', 'Uploaded')}</Badge>
                  ) : loading ? (
                    <span style={{ ...uploadBtn, cursor: 'default' }}><IonSpinner name="crescent" style={{ width: 16, height: 16 }} /> {t('kyc.uploading', 'Uploading')}</span>
                  ) : (
                    <button onClick={() => pickFor(d.key)} style={uploadBtn}>
                      <IonIcon icon={cloudUploadOutline} /> {t('kyc.upload', 'Upload')}
                    </button>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* Slot booking — appears once required docs are up (or when rescheduling). */}
        {(allDone || rescheduling) && (
          <Reveal>
            <div style={{ padding: '0 16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 2px 12px' }}>
                <IonIcon icon={calendarOutline} style={{ fontSize: 20, color: 'var(--anrix-primary-strong)' }} />
                <span style={{ fontWeight: 800, fontSize: 15.5 }}>{t('kyc.pickSlot', 'Pick a verification slot')}</span>
              </div>
              <p className="anrix-muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>
                {t('kyc.slotCallDesc', 'Our team will call you at this time to verify your identity over a quick call.')}
              </p>
              {slotDays.map((d) => (
                <div key={d.day} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--anrix-text-muted)', marginBottom: 8 }}>{d.day}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {d.items.map((s) => {
                      const on = slot === s.iso;
                      return (
                        <button key={s.iso} onClick={() => setSlot(s.iso)}
                          style={{ padding: '9px 14px', borderRadius: 11, fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                            border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border-strong)',
                            background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                            color: on ? 'var(--anrix-primary-strong)' : 'var(--anrix-text)' }}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <IonIcon icon={callOutline} style={{ fontSize: 16, color: 'var(--anrix-text-muted)' }} />
                <span className="anrix-muted" style={{ fontSize: 12.5 }}>{t('kyc.wellCallYouOn', "We'll call you on {{phone}}", { phone: phone || t('kyc.yourRegisteredNumber', 'your registered number') })}</span>
              </div>
            </div>
          </Reveal>
        )}
      </AnimatedPage>

      {/* one shared hidden picker — accepts photos & PDFs */}
      <input ref={fileInput} type="file" accept="image/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />

      <IonToast isOpen={!!toast} message={toast} duration={1400} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

const uploadBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 10,
  border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
};
