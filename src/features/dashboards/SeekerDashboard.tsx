import { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { star, checkmarkCircle, locationOutline, chevronForward, searchOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { SearchField } from '@components/search/SearchField';
import { SectionHeader } from '@design/patterns';
import { useQuery } from '@tanstack/react-query';
import { ROLE_CATALOG, type Role } from '@models/roles';
import { tradePhoto } from '@assets/services/serviceImages';
import { hiringApi } from '@services/api/hiringApi';
import { BRAND } from '@design/brand/brand';

/** All hireable worker trades + a popular subset, for the search-bar suggestions. */
const WORKER_TRADES = (Object.keys(ROLE_CATALOG) as Role[]).filter((r) => ROLE_CATALOG[r].archetype === 'worker');
const POPULAR_TRADES: Role[] = ['mason', 'plumber', 'painter', 'electrician', 'carpenter', 'tile_worker'];

/** Professional category photos (stable Unsplash CDN — verified to load). */
const catImg = (id: string) => `https://images.unsplash.com/${id}?w=200&q=80&auto=format&fit=crop`;

/** Top-level marketplace categories — shown as the circle row right under search. */
const CATEGORIES = [
  { label: 'Workers', i18nKey: 'dash.catWorkers', section: 'workers', image: catImg('photo-1504307651254-35680f356dfd') },
  { label: 'Materials', i18nKey: 'dash.catMaterials', section: 'materials', image: catImg('photo-1587582423116-ec07293f0395') },
  { label: 'Equipment', i18nKey: 'dash.catEquipment', section: 'equipment', image: catImg('photo-1590496794008-383c8070b257') },
  { label: 'Property', i18nKey: 'dash.catProperty', section: 'property', image: catImg('photo-1486406146926-c627a92ad1ab') },
  { label: 'Transport', i18nKey: 'dash.catTransport', section: 'transport', image: catImg('photo-1601584115197-04ecc0da31d7') },
  { label: 'Loans', i18nKey: 'dash.catLoans', section: 'loans', image: catImg('photo-1554224155-6726b3ff858f') },
];

/** Popular-service cards — a real trade-in-action photo (mason laying brick, painter with
 *  roller) filling the top of a clean card, with the starting price and a Book-now CTA. */
const SERVICES: { label: string; i18nKey: string; trade: Role; price: string }[] = [
  { label: 'Electrician', i18nKey: 'dash.svcElectrician', trade: 'electrician', price: '₹99' },
  { label: 'Plumbing', i18nKey: 'dash.svcPlumbing', trade: 'plumber', price: '₹349' },
  { label: 'Painting', i18nKey: 'dash.svcPainting', trade: 'painter', price: '₹18/sqft' },
  { label: 'Masonry', i18nKey: 'dash.svcMasonry', trade: 'mason', price: '₹850/day' },
  { label: 'Carpentry', i18nKey: 'dash.svcCarpentry', trade: 'carpenter', price: '₹900/day' },
  { label: 'Cleaning', i18nKey: 'dash.svcCleaning', trade: 'housekeeping', price: '₹349' },
];

/** Archetype A dashboard. Layout per docs/05-screens-wireframes.md (Seeker — Home). */
export function SeekerDashboard() {
  const history = useHistory();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  // Real "N available" counts per trade for the search suggestions.
  const { data: workers = [] } = useQuery({ queryKey: ['hiring', 'workers'], queryFn: () => hiringApi.search({ limit: 100 }) });
  const availableOf = (t: Role) => workers.filter((w: any) => w.rle_cd === t).length;

  // Top-rated pros near you — highest-rated real workers from the hiring index.
  const topRated = [...workers]
    .sort((a: any, b: any) => (Number(b.rtng_nm) || 0) - (Number(a.rtng_nm) || 0))
    .slice(0, 3)
    .map((w: any) => ({
      id: String(w.usr_id), name: w.dsply_nm, trade: w.rle_cd as Role,
      rating: (Number(w.rtng_nm) || 0).toFixed(1), count: w.rtng_cnt || 0,
      city: w.cty_nm || '', rate: Number(w.day_rate_am) || 0, photo: w.avtr_url_tx || '',
      verified: w.kyc_tier_cd === 'verified',
    }));

  // Search suggestions: popular trades when empty, filtered by label as the user types.
  const q = query.trim().toLowerCase();
  const suggestions = (q ? WORKER_TRADES.filter((t) => ROLE_CATALOG[t].label.toLowerCase().includes(q)) : POPULAR_TRADES).slice(0, 6);
  const goToTrade = (t: Role) => { setSearchOpen(false); setQuery(''); history.push(`/app/discover?trade=${t}`); };
  const goToSearch = () => { setSearchOpen(false); const t = query.trim(); history.push(`/app/discover${t ? `?q=${encodeURIComponent(t)}` : ''}`); };

  return (
    <PageShell title={BRAND.name}>
      {/* Sticky top — search + category circles stay pinned while the feed scrolls */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--anrix-bg)', borderBottom: '1px solid var(--anrix-border)' }}>
      <div style={{ padding: 'var(--anrix-space-3) var(--anrix-space-4)', position: 'relative', zIndex: 50 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          rotatePrefix={t('dash.searchForPrefix', 'Search for ')}
          rotatingPlaceholders={['workers', 'materials', 'equipment', 'property', 'transport', 'loans']}
          onFocus={() => setSearchOpen(true)}
          onBlur={() => window.setTimeout(() => setSearchOpen(false), 160)}
        />

        <AnimatePresence>
          {searchOpen && (
            <>
              {/* Scrim — dims the page and closes the panel on outside tap */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onMouseDown={() => setSearchOpen(false)}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.18)', zIndex: 40 }}
              />
              {/* Suggestions dropdown — floats below the search bar */}
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                style={{
                  position: 'absolute', top: 'calc(100% - 4px)', left: 'var(--anrix-space-4)', right: 'var(--anrix-space-4)', zIndex: 50,
                  background: 'var(--anrix-surface)', borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border)',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.16)', overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px 7px', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--anrix-text-muted)' }}>
                  <IonIcon icon={locationOutline} style={{ fontSize: 14 }} /> {q ? t('dash.matchingServices', 'Matching services') : t('dash.popularNearYou', 'Popular near you')}
                </div>

                {suggestions.length === 0 && (
                  <div style={{ padding: '8px 16px 16px', color: 'var(--anrix-text-muted)', fontSize: 13.5 }}>{t('dash.noServiceMatches', 'No service matches “{{query}}”.', { query: query.trim() })}</div>
                )}

                {suggestions.map((trade, i) => {
                  const n = availableOf(trade);
                  return (
                    <motion.button key={trade} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                      onMouseDown={(e) => e.preventDefault()} onClick={() => goToTrade(trade)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 14px', background: 'none', border: 'none', borderTop: i === 0 ? 'none' : '1px solid var(--anrix-border)', cursor: 'pointer', textAlign: 'left' }}>
                      <span style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', display: 'grid', placeItems: 'center', background: 'var(--anrix-primary-soft)', flexShrink: 0 }}>
                        <img src={tradePhoto(trade)} alt="" loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14.5 }}>{ROLE_CATALOG[trade].label}</span>
                      {n > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--anrix-success)', whiteSpace: 'nowrap' }}>{t('dash.nAvailable', '{{count}} available', { count: n })}</span>}
                      <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 16, flexShrink: 0 }} />
                    </motion.button>
                  );
                })}

                {q && (
                  <button onMouseDown={(e) => e.preventDefault()} onClick={goToSearch}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'var(--anrix-surface-2)', border: 'none', borderTop: '1px solid var(--anrix-border)', cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 14 }}>
                    <IonIcon icon={searchOutline} style={{ fontSize: 18, color: 'var(--anrix-primary-strong)' }} /> {t('dash.searchQuery', 'Search “{{query}}”', { query: query.trim() })}
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Top-level categories — round circles right under the search */}
      <SectionHeader title={t('dash.browseCategories', 'Browse categories')} action={{ label: t('dash.all', 'All'), onClick: () => history.push('/app/discover') }} style={{ marginTop: 'var(--anrix-space-3)' }} />
      <div className="no-scrollbar" style={{ display: 'flex', gap: 16, overflowX: 'auto', padding: '0 var(--anrix-space-5) var(--anrix-space-4)' }}>
        {CATEGORIES.map((c) => (
          <div key={c.label} onClick={() => history.push(`/app/discover?section=${c.section}`)}
            className="anrix-pressable"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 78 }}>
            <div style={{ width: 78, height: 78, borderRadius: 18, overflow: 'hidden', position: 'relative',
              background: 'var(--anrix-surface-2)', border: '1px solid var(--anrix-border)', boxShadow: 'var(--anrix-shadow-1)' }}>
              <img src={c.image} alt={c.label} loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap', color: 'var(--anrix-text-strong)' }}>{t(c.i18nKey, c.label)}</div>
          </div>
        ))}
      </div>
      </div>
      {/* /sticky top */}

      {/* Post a requirement — "build my house" → builders contact you */}
      <div onClick={() => history.push('/app/post-requirement')} className="anrix-pressable"
        style={{ margin: '0 var(--anrix-space-5) var(--anrix-space-4)', padding: '11px 14px', borderRadius: 'var(--anrix-radius-lg)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--anrix-hero-shadow)' }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--anrix-hero-chip)', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>🏗️</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.25 }}>{t('dash.wantToBuildRenovate', 'Want to build or renovate?')}</div>
          <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t('dash.postRequirementProsContact', 'Post your requirement — pros contact you')}</div>
        </div>
        <IonIcon icon={chevronForward} style={{ fontSize: 19, color: 'var(--anrix-hero-accent)', flexShrink: 0 }} />
      </div>

      {/* Popular services — full-bleed photo cards (hirenow style) */}
      <SectionHeader title={t('dash.popularServices', 'Popular services')} action={{ label: t('dash.seeAll', 'See all'), onClick: () => history.push('/app/discover') }} />
      <div className="no-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 var(--anrix-space-5) var(--anrix-space-5)' }}>
        {SERVICES.map((s) => (
          <div key={s.label} onClick={() => history.push(`/app/discover?trade=${s.trade}`)} className="anrix-pressable"
            style={{ minWidth: 142, flexShrink: 0, background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border-strong)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--anrix-shadow-1)' }}>
            <div style={{ height: 118, background: 'var(--anrix-primary-soft)' }}>
              <img src={tradePhoto(s.trade)} alt={t(s.i18nKey, s.label)} loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--anrix-primary-strong)', whiteSpace: 'nowrap' }}>{t(s.i18nKey, s.label)}</div>
              <div className="anrix-muted" style={{ fontSize: 11.5, marginTop: 1, marginBottom: 9 }}>{t('dash.startingAt', 'starting at {{price}}', { price: s.price })}</div>
              <div style={{ background: 'var(--anrix-primary)', color: 'var(--anrix-on-primary)', fontWeight: 700, fontSize: 12, textAlign: 'center', padding: '7px 0', borderRadius: 10 }}>{t('dash.bookNow', 'Book now')}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top rated — pro cards with real photos */}
      <SectionHeader title={t('dash.topRatedNearYou', 'Top rated near you')} action={{ label: t('dash.mapAction', '🗺 Map'), onClick: () => history.push('/app/nearby') }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--anrix-space-3)', padding: '0 var(--anrix-space-5) var(--anrix-space-4)' }}>
        {topRated.length === 0 && (
          <div className="anrix-card" style={{ padding: 'var(--anrix-space-5)', textAlign: 'center', color: 'var(--anrix-text-muted)', fontSize: 13.5 }}>
            {t('dash.noProsListed', 'No pros listed near you yet — check back soon.')}
          </div>
        )}
        {topRated.map((p) => {
          const role = ROLE_CATALOG[p.trade];
          return (
          <div key={p.id} className="anrix-card anrix-pressable" onClick={() => history.push(`/app/pro/${p.id}`)}
            style={{ display: 'flex', gap: 14, padding: 'var(--anrix-space-4)' }}>
            <img src={tradePhoto(p.trade, p.photo)} alt={p.name} width={60} height={60} loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
              style={{ width: 60, height: 60, borderRadius: 'var(--anrix-radius-md)', objectFit: 'cover', flexShrink: 0, background: 'var(--anrix-surface-2)' }} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                  {p.verified && <IonIcon icon={checkmarkCircle} style={{ color: 'var(--anrix-primary-strong)', fontSize: 16, flexShrink: 0 }} />}
                </div>
                {p.rate > 0 && (
                  <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>
                    ₹{p.rate}<span className="anrix-muted" style={{ fontWeight: 600, fontSize: 11 }}>/day</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--anrix-radius-pill)' }}>
                  {role?.emoji} {role?.label ?? p.trade}
                </span>
                <span className="anrix-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5 }}>
                  <IonIcon icon={star} style={{ color: 'var(--anrix-warning)', fontSize: 12 }} /> {p.rating} ({p.count}){p.city ? ` · ${p.city}` : ''}
                </span>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </PageShell>
  );
}
