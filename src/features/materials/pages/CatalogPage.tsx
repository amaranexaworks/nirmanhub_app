import { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery } from '@tanstack/react-query';
import { createOutline, trendingUpOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { SearchField } from '@components/search/SearchField';
import { AnimatedPage } from '@components/motion';
import { Badge } from '@design/primitives';
import { materialsApi } from '@services/api/materialsApi';
import { categoryAccent } from '../data/categoryAccent';

export function CatalogPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const cats = useQuery({ queryKey: ['materials', 'categories'], queryFn: () => materialsApi.categories() });
  const items = useQuery({ queryKey: ['materials', 'catalog', cat, q], queryFn: () => materialsApi.catalog({ category: cat === 'all' ? undefined : cat, q: q || undefined }) });

  const chips = [{ ctgry_cd: 'all', ctgry_nm: t('mat.all', 'All') }, ...(cats.data ?? [])];

  return (
    <PageShell title={t('mat.catalog', 'Catalog')}>
      <AnimatedPage>
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--anrix-bg)', borderBottom: '1px solid var(--anrix-border)' }}>
          <div style={{ padding: '8px 16px' }}><SearchField value={q} onChange={setQ} placeholder={t('mat.searchProducts', 'Search products')} /></div>
          <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 16px 12px' }}>
            {chips.map((c: any) => {
              const active = cat === c.ctgry_cd;
              // One consistent filter row: calm neutral chips, a single amber
              // selected state (the app's brand action colour). Per-category
              // colour still lives on the product cards below, where it reads well.
              return (
                <button key={c.ctgry_cd} onClick={() => setCat(c.ctgry_cd)} className="anrix-pressable" style={{
                  whiteSpace: 'nowrap', padding: '8px 15px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  border: `1.5px solid ${active ? 'var(--anrix-primary)' : 'var(--anrix-border)'}`,
                  background: active ? 'var(--anrix-primary)' : 'var(--anrix-surface)',
                  color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
                  boxShadow: active ? '0 4px 12px rgba(214, 158, 15, 0.28)' : 'none',
                  transition: 'background 150ms var(--anrix-ease-standard), border-color 150ms var(--anrix-ease-standard)',
                }}>{c.ctgry_nm}</button>
              );
            })}
          </div>
        </div>

        {items.isLoading && <BrandLoader />}
        {items.isSuccess && (items.data ?? []).length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--anrix-text-muted)' }}>{t('mat.noProductsHere', 'No products here.')}</div>}

        <div className="anrix-grid-products" style={{ padding: '12px 16px 32px' }}>
          {(items.data ?? []).map((p: any) => {
            const ac = categoryAccent(p.ctgry_nm || 'Other');
            return (
            <div key={p.item_id} style={{ borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)' }}>
              <div style={{ height: 118, background: ac.bg, position: 'relative', display: 'grid', placeItems: 'center', fontSize: 40, overflow: 'hidden' }}>
                {p.img_url_tx
                  ? <img src={p.img_url_tx} alt={p.nm_tx} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.emoji_tx}
                {p.poplr_in === 1 && <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}><Badge tone="success">{t('mat.popular', 'Popular')}</Badge></span>}
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nm_tx}</div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: ac.fg, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>{p.ctgry_nm}{p.eta_min ? ` · ~${p.eta_min}min` : ''}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <strong style={{ color: 'var(--anrix-text-strong)' }}>₹{Number(p.price_am)}<span className="anrix-muted" style={{ fontWeight: 400, fontSize: 12 }}>/{p.unit_tx}</span></strong>
                  <IonIcon icon={createOutline} onClick={() => history.push('/app/add')} style={{ color: 'var(--anrix-primary-strong)', fontSize: 20, cursor: 'pointer' }} />
                </div>
              </div>
            </div>
            );
          })}
        </div>

        <div style={{ padding: '0 16px 40px' }}>
          <div className="anrix-card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IonIcon icon={trendingUpOutline} style={{ fontSize: 22, color: 'var(--anrix-success)' }} />
            <span style={{ fontSize: 13.5 }}>{t('mat.boostListing', 'Boost a listing to appear first in buyer searches')}</span>
          </div>
        </div>
      </AnimatedPage>
    </PageShell>
  );
}
