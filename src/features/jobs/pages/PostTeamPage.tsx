import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { IonIcon, IonToast } from '@ionic/react';
import { addOutline, trashOutline, removeOutline, peopleOutline, calendarOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { GradientButton, Badge } from '@design/primitives';
import { LocationField } from '@components/form/LocationField';
import { ROLE_CATALOG, archetypeOf, type Role } from '@models/roles';
import { hiringApi } from '@services/api/hiringApi';
import { jobsApi } from '@services/api/jobsApi';

const WORKER_TRADES = (Object.keys(ROLE_CATALOG) as Role[]).filter((r) => archetypeOf(r) === 'worker');
const DEFAULT_RATE = 800;

interface CrewRow { id: number; trade: Role; count: number; rate: number }

let nextId = 1;

/**
 * Builders/contractors post a whole crew requirement — e.g. "1 Mason + 3 Labour" —
 * with per-day rates auto-suggested from the LIVE market rates (/hiring/market-rates,
 * averaged server-side from real offers) and an auto-computed budget.
 */
export function PostTeamPage() {
  const { t } = useTranslation();
  const history = useHistory();
  // Live market rates from the backend — no hardcoded rate table.
  const { data: rates = [] } = useQuery({ queryKey: ['hiring', 'market-rates'], queryFn: () => hiringApi.marketRates() });
  const rateFor = (trade: Role): number | undefined => {
    const mr = rates.find((r) => r.rle_cd === trade);
    return mr ? Math.round(Number(mr.avg_am)) : undefined;
  };
  const newRow = (trade: Role): CrewRow => ({ id: nextId++, trade, count: 1, rate: rateFor(trade) ?? DEFAULT_RATE });

  const [title, setTitle] = useState('');
  const [days, setDays] = useState(7);
  const [location, setLocation] = useState('');
  const [rows, setRows] = useState<CrewRow[]>(() => [newRow('mason'), { ...newRow('labour'), count: 3 }]);
  const [toast, setToast] = useState('');
  const [posting, setPosting] = useState(false);

  // Once live rates arrive, fill the initial rows' suggested rates (which started at
  // the neutral default because the query hadn't resolved yet). Runs once.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!rates.length || hydrated.current) return;
    hydrated.current = true;
    setRows((rs) => rs.map((r) => ({ ...r, rate: rateFor(r.trade) ?? r.rate })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  const totalWorkers = rows.reduce((s, r) => s + r.count, 0);
  const perDay = rows.reduce((s, r) => s + r.count * r.rate, 0);
  const totalBudget = perDay * days;

  const addRow = () => {
    const used = new Set(rows.map((r) => r.trade));
    const next = WORKER_TRADES.find((t) => !used.has(t)) ?? 'labour';
    setRows((r) => [...r, newRow(next)]);
  };
  const removeRow = (id: number) => setRows((r) => r.filter((x) => x.id !== id));
  const patch = (id: number, p: Partial<CrewRow>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const setTrade = (id: number, trade: Role) => patch(id, { trade, rate: rateFor(trade) ?? DEFAULT_RATE });

  // Post the crew requirement to the backend as one job per trade row (the jobs
  // marketplace is single-trade), so each shows up searchable for matching workers.
  const post = async () => {
    if (posting || !title || rows.length === 0) return;
    setPosting(true);
    try {
      await Promise.all(rows.map((r) => jobsApi.create({
        title: `${title} — ${r.count}× ${ROLE_CATALOG[r.trade].label}`,
        trade: r.trade,
        pay: r.rate,
        payUnit: 'day',
        days,
        location: location || undefined,
        description: `Crew requirement: ${r.count} × ${ROLE_CATALOG[r.trade].label} @ ₹${r.rate}/day for ${days} days.`,
      })));
      setToast(t('jobs.teamJobPosted', 'Team job posted — matching workers now…'));
      setTimeout(() => history.goBack(), 1300);
    } catch (e: any) {
      setToast(e?.message || t('jobs.postFailed', 'Could not post the job. Please try again.'));
      setPosting(false);
    }
  };

  return (
    <PageShell
      title={t('jobs.postTeamJob', 'Post a Team Job')}
      showBack
      footer={
        <GradientButton disabled={rows.length === 0 || !title || posting} onClick={post} icon={peopleOutline}>
          {t('jobs.postJobSummary', 'Post job · {{workers}} workers · ₹{{budget}}', { workers: totalWorkers, budget: totalBudget.toLocaleString('en-IN') })}
        </GradientButton>
      }
    >
      <AnimatedPage>
        <div style={{ padding: 16 }}>
          <Label>{t('jobs.jobTitle', 'Job title')}</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('jobs.jobTitlePlaceholder', 'e.g. Villa civil work — crew needed')} style={input} />

          <Label style={{ marginTop: 16 }}>{t('jobs.teamYouNeed', 'Team you need')}</Label>
          {rows.map((r) => {
            const marketAvg = rateFor(r.trade);
            return (
              <Reveal key={r.id}>
                <div className="anrix-card" style={{ marginBottom: 12, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>{ROLE_CATALOG[r.trade].emoji}</span>
                    <select value={r.trade} onChange={(e) => setTrade(r.id, e.target.value as Role)} style={select}>
                      {WORKER_TRADES.map((t) => <option key={t} value={t}>{ROLE_CATALOG[t].label}</option>)}
                    </select>
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(r.id)} style={iconBtn} aria-label={t('jobs.remove', 'Remove')}>
                        <IonIcon icon={trashOutline} style={{ color: 'var(--anrix-danger)' }} />
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
                    {/* count stepper */}
                    <div>
                      <div style={smallLabel}>{t('jobs.count', 'Count')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => patch(r.id, { count: Math.max(1, r.count - 1) })} style={stepBtn}><IonIcon icon={removeOutline} /></button>
                        <span style={{ fontWeight: 800, fontSize: 17, minWidth: 22, textAlign: 'center' }}>{r.count}</span>
                        <button onClick={() => patch(r.id, { count: r.count + 1 })} style={stepBtn}><IonIcon icon={addOutline} /></button>
                      </div>
                    </div>
                    {/* rate */}
                    <div style={{ flex: 1 }}>
                      <div style={smallLabel}>{t('jobs.ratePerDay', 'Rate / day')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontWeight: 700 }}>₹</span>
                        <input inputMode="numeric" value={r.rate} onChange={(e) => patch(r.id, { rate: +e.target.value.replace(/\D/g, '') || 0 })}
                          style={{ ...input, height: 40, width: 90 }} />
                        {marketAvg != null && <Badge tone="primary">{t('jobs.avgRate', 'avg ₹{{rate}}', { rate: marketAvg })}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="anrix-muted" style={{ fontSize: 12, marginTop: 8 }}>
                    {r.count} × ₹{r.rate} = <strong style={{ color: 'var(--anrix-text-strong)' }}>₹{(r.count * r.rate).toLocaleString('en-IN')}/day</strong>
                  </div>
                </div>
              </Reveal>
            );
          })}

          <button onClick={addRow} style={addRowBtn}><IonIcon icon={addOutline} /> {t('jobs.addAnotherTrade', 'Add another trade')}</button>

          {/* Duration + location */}
          <Label style={{ marginTop: 12 }}>{t('jobs.duration', 'Duration')}</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IonIcon icon={calendarOutline} style={{ color: 'var(--anrix-primary-strong)', fontSize: 20 }} />
            <input type="range" min={1} max={90} value={days} onChange={(e) => setDays(+e.target.value)} style={{ flex: 1, accentColor: 'var(--anrix-primary)' }} />
            <strong style={{ minWidth: 64, textAlign: 'right' }}>{t('jobs.days', '{{count}} days', { count: days })}</strong>
          </div>

          <Label style={{ marginTop: 16 }}>{t('jobs.siteLocation', 'Site location')}</Label>
          <LocationField value={location} onChange={setLocation} placeholder={t('jobs.siteLocationPlaceholder', 'Site address / area')} inputStyle={input} />

          {/* Budget summary */}
          <div style={{ marginTop: 16, padding: 12, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--anrix-hero-muted)' }}><span>{t('jobs.teamSize', 'Team size')}</span><span>{t('jobs.workersCount', '{{count}} workers', { count: totalWorkers })}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--anrix-hero-muted)', marginTop: 4 }}><span>{t('jobs.perDay', 'Per day')}</span><span>₹{perDay.toLocaleString('en-IN')}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--anrix-hero-border)' }}>
              <span style={{ fontWeight: 700 }}>{t('jobs.totalBudgetDays', 'Total budget · {{count}} days', { count: days })}</span>
              <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--anrix-hero-accent)' }}>₹{totalBudget.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </AnimatedPage>
      <IonToast isOpen={!!toast} message={toast} duration={1300} onDidDismiss={() => setToast('')} />
    </PageShell>
  );
}

function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 8, ...style }}>{children}</div>;
}
const smallLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--anrix-text-muted)', textTransform: 'uppercase', marginBottom: 4 };
const input: React.CSSProperties = { width: '100%', height: 48, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 14px', fontSize: 15, color: 'var(--anrix-text-strong)', outline: 'none' };
const select: React.CSSProperties = { flex: 1, height: 44, borderRadius: 12, border: '1.5px solid var(--anrix-border)', background: 'var(--anrix-surface)', padding: '0 12px', fontSize: 15, fontWeight: 600, color: 'var(--anrix-text-strong)' };
const iconBtn: React.CSSProperties = { width: 40, height: 40, borderRadius: 10, border: '1px solid var(--anrix-border)', background: 'var(--anrix-surface)', display: 'grid', placeItems: 'center', cursor: 'pointer' };
const stepBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: 9, border: '1.5px solid var(--anrix-primary)', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 18 };
const addRowBtn: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 12, border: '1.5px dashed var(--anrix-border)', background: 'transparent', color: 'var(--anrix-primary-strong)', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 };
