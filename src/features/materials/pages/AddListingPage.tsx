import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon, useIonToast } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cameraOutline, cubeOutline, carOutline, businessOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { GradientButton } from '@design/primitives';
import { materialsApi } from '@services/api/materialsApi';

const TYPES = [
  { key: 'material', label: 'Material', icon: cubeOutline },
  { key: 'equipment', label: 'Equipment', icon: carOutline },
  { key: 'property', label: 'Property', icon: businessOutline },
];

export function AddListingPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const qc = useQueryClient();
  const [toast] = useIonToast();
  const [type, setType] = useState('material');
  const [form, setForm] = useState({ name: '', price: '', unit: '', category: '', etaMin: '' });
  const cats = useQuery({ queryKey: ['materials', 'categories'], queryFn: () => materialsApi.categories() });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const publish = useMutation({
    mutationFn: () => materialsApi.addItem({
      name: form.name, price: Number(form.price), unit: form.unit || undefined,
      category: form.category || 'other', etaMin: form.etaMin ? Number(form.etaMin) : undefined,
    }),
    onSuccess: () => {
      void toast({ message: t('mat.listingPublished', 'Listing published ✓'), duration: 1400, color: 'success', position: 'top' });
      qc.invalidateQueries({ queryKey: ['materials', 'catalog'] });
      history.push('/app/catalog');
    },
    onError: (e: any) => toast({ message: e.message || t('mat.couldNotPublish', 'Could not publish'), duration: 1800, color: 'danger', position: 'top' }),
  });

  const onPublish = () => {
    if (type !== 'material') { void toast({ message: t('mat.listingsComingSoon', '{{type}} listings are coming soon', { type }), duration: 1600, position: 'top' }); return; }
    if (!form.name || !form.price) { void toast({ message: t('mat.nameAndPriceRequired', 'Name and price are required'), duration: 1600, color: 'warning', position: 'top' }); return; }
    publish.mutate();
  };

  return (
    <PageShell title={t('mat.addListing', 'Add Listing')} footer={<GradientButton onClick={onPublish}>{publish.isPending ? t('mat.publishing', 'Publishing…') : t('mat.publishListing', 'Publish Listing')}</GradientButton>}>
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          <Label>{t('mat.listingType', 'Listing type')}</Label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {TYPES.map((ty) => {
              const on = type === ty.key;
              return (
                <button key={ty.key} onClick={() => setType(ty.key)} style={{
                  flex: 1, padding: '14px 8px', borderRadius: 14, cursor: 'pointer',
                  border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                }}>
                  <IonIcon icon={ty.icon} style={{ fontSize: 24, color: on ? 'var(--anrix-primary)' : 'var(--anrix-text-muted)' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: on ? 'var(--anrix-primary)' : 'var(--anrix-text)' }}>{t(`mat.type_${ty.key}`, ty.label)}</span>
                </button>
              );
            })}
          </div>

          <Label>{t('mat.photos', 'Photos')}</Label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 88, height: 88, borderRadius: 14, border: '1.5px dashed var(--anrix-border)', display: 'grid', placeItems: 'center', color: 'var(--anrix-text-muted)' }}>
              <div style={{ textAlign: 'center' }}>
                <IonIcon icon={cameraOutline} style={{ fontSize: 24 }} />
                <div style={{ fontSize: 11 }}>{t('mat.add', 'Add')}</div>
              </div>
            </div>
          </div>

          <Field label={t('mat.productName', 'Product name')} placeholder={t('mat.productNamePlaceholder', 'e.g. UltraTech OPC 53')} value={form.name} onChange={(v) => set('name', v)} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}><Field label={t('mat.priceRupees', 'Price (₹)')} placeholder="385" numeric value={form.price} onChange={(v) => set('price', v)} /></div>
            <div style={{ flex: 1 }}><Field label={t('mat.unit', 'Unit')} placeholder={t('mat.unitPlaceholder', 'bag')} value={form.unit} onChange={(v) => set('unit', v)} /></div>
          </div>
          <Label>{t('mat.category', 'Category')}</Label>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
            {(cats.data ?? []).map((c: any) => (
              <button key={c.ctgry_cd} onClick={() => set('category', c.ctgry_cd)} style={{
                whiteSpace: 'nowrap', padding: '8px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: form.category === c.ctgry_cd ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                background: form.category === c.ctgry_cd ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                color: form.category === c.ctgry_cd ? 'var(--anrix-primary)' : 'var(--anrix-text)',
              }}>{c.ctgry_nm}</button>
            ))}
          </div>
          <Field label={t('mat.deliveryTimeMin', 'Delivery time (min)')} placeholder="120" numeric value={form.etaMin} onChange={(v) => set('etaMin', v)} />
        </div>
      </AnimatedPage>
    </PageShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>{children}</div>;
}
function Field({ label, placeholder, numeric, value, onChange }: { label: string; placeholder: string; numeric?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Label>{label}</Label>
      <input inputMode={numeric ? 'numeric' : 'text'} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: '100%', height: 52, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' }} />
    </div>
  );
}
