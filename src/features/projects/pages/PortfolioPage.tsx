import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IonIcon, IonModal, IonSpinner, useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { addOutline, imagesOutline, trashOutline, cloudUploadOutline, locationOutline, calendarOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { StatCard } from '@design/patterns';
import { GradientButton } from '@design/primitives';
import { useAuthStore } from '@stores/authStore';
import { portfolioApi } from '@services/api/portfolioApi';
import { filesApi } from '@services/api/filesApi';

/** Portfolio — a professional's showcase of completed projects, backed by the server. */
export function PortfolioPage() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const [toast] = useIonToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; location: string; year: string; coverUrl?: string }>({ title: '', location: '', year: '' });
  const [uploading, setUploading] = useState(false);

  const itemsQ = useQuery({ queryKey: ['portfolio', 'mine'], queryFn: () => portfolioApi.list() });
  const items = itemsQ.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['portfolio', 'mine'] });
  const createMut = useMutation({
    mutationFn: () => portfolioApi.create({ title: form.title.trim(), location: form.location.trim() || undefined, year: form.year ? Number(form.year) : undefined, coverUrl: form.coverUrl }),
    onSuccess: () => { invalidate(); setOpen(false); setForm({ title: '', location: '', year: '' }); void toast({ message: t('proj.projectAdded', 'Project added'), duration: 1400, position: 'top' }); },
    onError: (e: any) => void toast({ message: e?.message || 'Failed', duration: 1600, position: 'top' }),
  });
  const removeMut = useMutation({
    mutationFn: (id: number) => portfolioApi.remove(id),
    onSuccess: invalidate,
  });

  const pickCover = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const up = await filesApi.uploadFile('portfolio', file);
      const url = await filesApi.signedUrl(up.kind, up.id);
      setForm((f) => ({ ...f, coverUrl: url }));
    } catch (e: any) {
      void toast({ message: e?.message || 'Upload failed', duration: 1600, position: 'top' });
    } finally { setUploading(false); }
  };

  return (
    <PageShell title={t('proj.portfolio', 'Portfolio')} footer={<GradientButton icon={addOutline} onClick={() => setOpen(true)}>{t('proj.addProject', 'Add Project')}</GradientButton>}>
      <AnimatedPage>
        <Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: 16 }}>
            <StatCard icon="📁" label={t('proj.projects', 'Projects')} value={items.length} tone="blue" />
            <StatCard icon="⭐" label={t('proj.rating', 'Rating')} value={`${(user?.rating || 0).toFixed(1)}★`} tone="amber" />
            <StatCard icon="💬" label={t('proj.reviews', 'Reviews')} value={user?.ratingCount || 0} tone="green" />
          </div>
        </Reveal>

        {itemsQ.isLoading && <BrandLoader />}

        {!itemsQ.isLoading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={imagesOutline} style={{ fontSize: 44, opacity: 0.4 }} />
            <h3 style={{ margin: '12px 0 4px', color: 'var(--anrix-text-strong)', fontSize: 18 }}>{t('proj.showcaseYourWork', 'Showcase your work')}</h3>
            <p style={{ fontSize: 14, maxWidth: 300, margin: '0 auto 16px' }}>
              {t('proj.showcaseYourWorkMsg', 'Add photos of completed projects so customers can see your quality and hire you with confidence.')}
            </p>
            <GradientButton full={false} icon={addOutline} onClick={() => setOpen(true)}>{t('proj.addFirstProject', 'Add your first project')}</GradientButton>
          </div>
        )}

        {items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '0 16px 24px' }}>
            {items.map((it: any) => (
              <div key={it.prtfl_id} className="anrix-card" style={{ overflow: 'hidden', padding: 0 }}>
                <div style={{ height: 110, background: 'var(--anrix-surface-2)' }}>
                  {it.cover_url_tx
                    ? <img src={it.cover_url_tx} alt={it.ttl_tx} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--anrix-text-muted)' }}><IonIcon icon={imagesOutline} style={{ fontSize: 28, opacity: 0.5 }} /></div>}
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{it.ttl_tx}</div>
                  <div className="anrix-muted" style={{ fontSize: 12 }}>{[it.lctn_tx, it.year_nm].filter(Boolean).join(' · ') || '—'}</div>
                  <button onClick={() => removeMut.mutate(it.prtfl_id)} style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--anrix-danger)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    <IonIcon icon={trashOutline} /> {t('proj.remove', 'Remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedPage>

      {/* Add-project sheet */}
      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} breakpoints={[0, 0.9]} initialBreakpoint={0.9}>
        <div style={{ padding: 20 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, fontWeight: 800 }}>{t('proj.addProject', 'Add Project')}</h2>

          <button onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 140, borderRadius: 14, border: '1.5px dashed var(--anrix-border)', background: 'var(--anrix-surface-2)', display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: 14 }}>
            {form.coverUrl
              ? <img src={form.coverUrl} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'var(--anrix-text-muted)', display: 'grid', placeItems: 'center', gap: 6 }}>{uploading ? <IonSpinner /> : <><IonIcon icon={cloudUploadOutline} style={{ fontSize: 28 }} /> {t('proj.addCoverPhoto', 'Add cover photo')}</>}</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0])} />

          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t('proj.projectTitle', 'Project title (e.g. 3BHK villa, Gachibowli)')} style={inp} />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, ...inpWrap }}>
              <IonIcon icon={locationOutline} style={{ color: 'var(--anrix-text-muted)' }} />
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={t('proj.location', 'Location')} style={inpBare} />
            </div>
            <div style={{ width: 110, display: 'flex', alignItems: 'center', gap: 6, ...inpWrap }}>
              <IonIcon icon={calendarOutline} style={{ color: 'var(--anrix-text-muted)' }} />
              <input inputMode="numeric" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value.replace(/\D/g, '').slice(0, 4) }))} placeholder={t('proj.year', 'Year')} style={inpBare} />
            </div>
          </div>

          <GradientButton icon={addOutline} onClick={() => createMut.mutate()} disabled={!form.title.trim() || createMut.isPending || uploading} style={{ marginTop: 16 }}>
            {createMut.isPending ? t('proj.saving', 'Saving…') : t('proj.addProject', 'Add Project')}
          </GradientButton>
        </div>
      </IonModal>
    </PageShell>
  );
}

const inp: React.CSSProperties = { width: '100%', height: 48, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' };
const inpWrap: React.CSSProperties = { height: 48, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 12px' };
const inpBare: React.CSSProperties = { flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 15, color: 'var(--anrix-text-strong)', width: '100%' };
