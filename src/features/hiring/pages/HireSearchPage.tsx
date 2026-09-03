import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { IonIcon, IonModal } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { motion, AnimatePresence } from 'framer-motion';
import { optionsOutline, locationOutline, closeOutline, checkmark, mapOutline, chevronForward } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { SearchField } from '@components/search/SearchField';
import { AnimatedPage } from '@components/motion';
import { Badge, GradientButton } from '@design/primitives';
import { ROLE_CATALOG, archetypeOf, type Role } from '@models/roles';
import { hiringApi, type ApiWorker } from '@services/api/hiringApi';
import type { Worker } from '../data/worker';
import { WorkerCard } from '../components/WorkerCard';

/** Map a backend worker row → the card's Worker shape. */
const mapWorker = (w: ApiWorker): Worker => ({
  id: String(w.usr_id),
  name: w.dsply_nm || 'Worker',
  trade: (w.rle_cd || 'labour') as Role,
  rating: Number(w.rtng_nm) || 0,
  ratingCount: w.rtng_cnt || 0,
  distanceKm: 0,
  dayRate: Number(w.day_rate_am) || 0,
  available: true,
  verified: w.kyc_tier_cd === 'verified',
  jobsDone: 0,
  responseMins: 0,
  skills: [],
});

const TRADES = (Object.keys(ROLE_CATALOG) as Role[]).filter((r) => archetypeOf(r) === 'worker');
type SortKey = 'match' | 'distance' | 'rating' | 'price';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'match', label: '✦ Best match' },
  { key: 'distance', label: 'Nearest first' },
  { key: 'rating', label: 'Highest rated' },
  { key: 'price', label: 'Lowest price' },
];

export function HireSearchPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const sortLabel = (s: { key: SortKey; label: string }) => t(`hire.sort_${s.key}`, s.label);
  // Shared raw cache across dashboard/search/map; each consumer maps via `select`
  // so the same queryKey never holds two different data shapes.
  const { data: WORKERS = [], isLoading } = useQuery({
    queryKey: ['hiring', 'workers'],
    queryFn: () => hiringApi.search({ limit: 100 }),
    select: (rows: ApiWorker[]) => rows.map(mapWorker),
  });
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [trade, setTrade] = useState<Role | 'all'>('all');

  // Deep-link support: ?trade=<role> pre-selects a trade, ?q=<text> pre-fills the search.
  // Runs on mount and whenever the query string changes (Ionic keeps tab pages mounted).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tr = params.get('trade');
    if (tr && (tr as Role) in ROLE_CATALOG) setTrade(tr as Role);
    const qp = params.get('q');
    if (qp !== null) setQuery(qp);
  }, [location.search]);
  const [sort, setSort] = useState<SortKey>('match');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [maxDist, setMaxDist] = useState(10);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Draft state while the sheet is open, applied on "Apply".
  const [draft, setDraft] = useState({ sort, availableOnly, maxDist, minRating });
  const openFilters = () => { setDraft({ sort, availableOnly, maxDist, minRating }); setShowFilters(true); };
  const applyFilters = () => {
    setSort(draft.sort); setAvailableOnly(draft.availableOnly); setMaxDist(draft.maxDist); setMinRating(draft.minRating);
    setShowFilters(false);
  };
  const activeCount = (sort !== 'match' ? 1 : 0) + (availableOnly ? 1 : 0) + (maxDist < 10 ? 1 : 0) + (minRating > 0 ? 1 : 0);

  // Trade suggestions for the animated search dropdown (filter by typed text).
  const tradeMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TRADES.filter((t) => !q || ROLE_CATALOG[t].label.toLowerCase().includes(q));
  }, [query]);
  const availableOf = (t: Role) => WORKERS.filter((w) => w.trade === t && w.available).length;
  const pickTrade = (t: Role | 'all') => { setTrade(t); setQuery(''); setSearchOpen(false); };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = WORKERS.filter((w) => {
      if (trade !== 'all' && w.trade !== trade) return false;
      if (availableOnly && !w.available) return false;
      if (w.distanceKm > maxDist) return false;
      if (w.rating < minRating) return false;
      // Match either the worker's name OR their trade label, so typing "labour" works.
      const tradeLabel = ROLE_CATALOG[w.trade]?.label.toLowerCase() ?? '';
      if (q && !w.name.toLowerCase().includes(q) && !tradeLabel.includes(q)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'distance') return a.distanceKm - b.distanceKm;
      if (sort === 'rating') return b.rating - a.rating;
      if (sort === 'price') return a.dayRate - b.dayRate;
      const score = (w: Worker) => w.rating * 2 - w.distanceKm * 0.3 + (w.available ? 1 : 0);
      return score(b) - score(a);
    });
    return list;
  }, [WORKERS, query, trade, sort, availableOnly, maxDist, minRating]);

  const open = (w: Worker) => history.push(`/app/pro/${w.id}`);

  return (
    <PageShell title={t('hire.hireWorkers', 'Hire Workers')}>
      {/* Sticky search + filters + trade chips — stays pinned while the list scrolls */}
      <div style={stickyControls}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 0' }}>
          <SearchField
            value={query} onChange={setQuery} placeholder={t('hire.searchTradeOrName', 'Search trade or name…')} style={{ flex: 1 }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
          />
          <button onClick={() => history.push('/app/nearby')} style={filterBtn} aria-label={t('hire.mapView', 'Map view')}>
            <IonIcon icon={mapOutline} style={{ fontSize: 20 }} />
          </button>
          <button onClick={openFilters} style={filterBtn} aria-label={t('hire.filters', 'Filters')}>
            <IonIcon icon={optionsOutline} style={{ fontSize: 20 }} />
            {activeCount > 0 && <span style={filterBadge}>{activeCount}</span>}
          </button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {searchOpen ? (
            /* Animated trade dropdown — matches reveal one after another */
            <motion.div key="dropdown" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', padding: '8px 12px 10px' }}>
              <div style={dropdownPanel}>
                {tradeMatches.length === 0 && (
                  <div style={{ padding: '14px 16px', color: 'var(--anrix-text-muted)', fontSize: 13.5 }}>{t('hire.noTradeMatches', 'No trade matches “{{query}}”.', { query })}</div>
                )}
                {tradeMatches.map((tr, i) => (
                  <motion.button key={tr} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, type: 'spring', stiffness: 320, damping: 26 }}
                    onMouseDown={(e) => e.preventDefault()} onClick={() => pickTrade(tr)} style={dropdownRow(i)}>
                    <span style={{ fontSize: 19, width: 26, textAlign: 'center' }}>{ROLE_CATALOG[tr].emoji}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, textAlign: 'left' }}>{ROLE_CATALOG[tr].label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--anrix-success)' }}>{t('hire.nearYou', '{{count}} near you', { count: availableOf(tr) })}</span>
                    <IonIcon icon={chevronForward} style={{ color: 'var(--anrix-text-muted)', fontSize: 15 }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="chips" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px 4px', color: 'var(--anrix-text-muted)', fontSize: 13 }}>
                <IonIcon icon={locationOutline} /> Bengaluru 560037 · <strong style={{ color: 'var(--anrix-success)' }}>{t('hire.availableNearYou', '{{count}} available near you', { count: WORKERS.filter((w) => w.available).length })}</strong>
              </div>
              <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '8px 16px 12px' }}>
                <Chip active={trade === 'all'} onClick={() => setTrade('all')} label={t('hire.all', 'All')} />
                {TRADES.map((tr) => (
                  <Chip key={tr} active={trade === tr} onClick={() => setTrade(tr)} label={ROLE_CATALOG[tr].label} emoji={ROLE_CATALOG[tr].emoji} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '10px 16px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>{t('hire.prosCount', '{{count}} pros', { count: results.length })}</span>
        <Badge tone="primary">{(() => { const s = SORTS.find((s) => s.key === sort); return s ? sortLabel(s) : ''; })()}</Badge>
      </div>

      <AnimatedPage>
        {/* Results reveal one after another */}
        {results.map((w, i) => (
          <motion.div key={w.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.4), type: 'spring', stiffness: 300, damping: 28 }}>
            <WorkerCard worker={w} onOpen={open} />
          </motion.div>
        ))}
        {isLoading && <BrandLoader />}
        {!isLoading && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--anrix-text-muted)' }}>
            {t('hire.noProsMatch', 'No pros match. Try widening your filters.')}
          </div>
        )}
      </AnimatedPage>

      {/* ---- Filter bottom sheet ---- */}
      <IonModal isOpen={showFilters} onDidDismiss={() => setShowFilters(false)} initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
        <div style={{ padding: 20, maxHeight: '85vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>{t('hire.filters', 'Filters')}</h2>
            <button onClick={() => setShowFilters(false)} style={{ background: 'var(--anrix-surface-2)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <IonIcon icon={closeOutline} style={{ fontSize: 20 }} />
            </button>
          </div>

          <SheetLabel>{t('hire.sortBy', 'Sort by')}</SheetLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {SORTS.map((s) => {
              const on = draft.sort === s.key;
              return (
                <button key={s.key} onClick={() => setDraft((d) => ({ ...d, sort: s.key }))} style={rowOpt(on)}>
                  <span style={{ fontWeight: 600 }}>{sortLabel(s)}</span>
                  {on && <IonIcon icon={checkmark} style={{ color: 'var(--anrix-primary-strong)', fontSize: 20 }} />}
                </button>
              );
            })}
          </div>

          <SheetLabel>{t('hire.availability', 'Availability')}</SheetLabel>
          <button onClick={() => setDraft((d) => ({ ...d, availableOnly: !d.availableOnly }))} style={rowOpt(draft.availableOnly)}>
            <span style={{ fontWeight: 600 }}>{t('hire.availableTodayOnly', 'Available today only')}</span>
            {draft.availableOnly && <IonIcon icon={checkmark} style={{ color: 'var(--anrix-primary-strong)', fontSize: 20 }} />}
          </button>

          <SheetLabel style={{ marginTop: 22 }}>{t('hire.maxDistance', 'Max distance · {{km}} km', { km: draft.maxDist })}</SheetLabel>
          <input type="range" min={1} max={10} value={draft.maxDist} onChange={(e) => setDraft((d) => ({ ...d, maxDist: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--anrix-primary)' }} />

          <SheetLabel style={{ marginTop: 18 }}>{t('hire.minimumRating', 'Minimum rating · {{rating}}', { rating: draft.minRating > 0 ? `${draft.minRating}★+` : t('hire.any', 'Any') })}</SheetLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {[0, 3, 4, 4.5].map((r) => {
              const on = draft.minRating === r;
              return (
                <button key={r} onClick={() => setDraft((d) => ({ ...d, minRating: r }))} style={{
                  flex: 1, height: 44, borderRadius: 12, fontWeight: 700, cursor: 'pointer',
                  border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
                  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)',
                  color: on ? 'var(--anrix-primary)' : 'var(--anrix-text)',
                }}>{r === 0 ? t('hire.any', 'Any') : `${r}★`}</button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 26 }}>
            <GradientButton variant="outline" full onClick={() => setDraft({ sort: 'match', availableOnly: false, maxDist: 10, minRating: 0 })} style={{ flex: 1 }}>{t('hire.reset', 'Reset')}</GradientButton>
            <GradientButton full onClick={applyFilters} style={{ flex: 2 }}>{t('hire.showResults', 'Show {{count}} results', { count: results.length })}</GradientButton>
          </div>
        </div>
      </IonModal>
    </PageShell>
  );
}

function Chip({ active, onClick, label, emoji }: { active: boolean; onClick: () => void; label: string; emoji?: string }) {
  return (
    <button onClick={onClick} style={pill(active)}>
      {emoji && <span style={{ marginRight: 5 }}>{emoji}</span>}
      {label}
    </button>
  );
}
function SheetLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 10, ...style }}>{children}</div>;
}

const pill = (active: boolean): React.CSSProperties => ({
  whiteSpace: 'nowrap', padding: '8px 14px', borderRadius: 999,
  border: active ? '1.5px solid transparent' : '1.5px solid var(--anrix-border)',
  background: active ? 'var(--anrix-primary)' : 'var(--anrix-surface)', color: active ? 'var(--anrix-on-primary)' : 'var(--anrix-text)',
  fontWeight: 600, fontSize: 13.5, boxShadow: active ? '0 6px 16px rgba(22, 24, 29,0.28)' : 'none', cursor: 'pointer',
});
const rowOpt = (on: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px',
  borderRadius: 14, cursor: 'pointer', border: on ? '1.5px solid var(--anrix-primary)' : '1.5px solid var(--anrix-border)',
  background: on ? 'var(--anrix-primary-soft)' : 'var(--anrix-surface)', color: 'var(--anrix-text-strong)',
});
const dropdownPanel: React.CSSProperties = {
  background: 'var(--anrix-surface)', border: '1px solid var(--anrix-border)', borderRadius: 16,
  boxShadow: '0 10px 30px rgba(22,24,29,0.14)', overflow: 'hidden',
};
const dropdownRow = (i: number): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 14px', cursor: 'pointer',
  background: 'transparent', border: 'none', borderTop: i ? '1px solid var(--anrix-border)' : 'none',
});
const stickyControls: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 5,
  background: 'var(--anrix-surface)',
  borderBottom: '1px solid var(--anrix-border)',
};
const filterBtn: React.CSSProperties = {
  position: 'relative', width: 44, height: 44, borderRadius: 12, border: '1.5px solid var(--anrix-border)',
  background: 'var(--anrix-surface)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
};
const filterBadge: React.CSSProperties = {
  position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: 'var(--anrix-primary)',
  color: '#fff', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 5px',
};
