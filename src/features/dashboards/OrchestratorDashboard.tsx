import type { ReactNode } from 'react';
import { IonIcon, IonProgressBar } from '@ionic/react';
import { chevronForward, arrowUp, walletOutline, businessOutline, peopleOutline, trendingUpOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { SectionHeader, StatCard, type StatTone } from '@design/patterns';
import { useAuthStore } from '@stores/authStore';
import { useSubscriptionStore } from '@features/billing/store/subscriptionStore';
import { useWorkforceStore } from '@features/workforce/store/workforceStore';
import { workforceApi } from '@services/api/workforceApi';
import { projectStatusOf } from '@features/workforce/status';
import { statsApi, type DashboardStats } from '@services/api/statsApi';

/**
 * Photo action tiles — a real branded construction/finance photo fills each circle,
 * ringed in the action's accent colour (matches the builder Quick-Actions design).
 * Emoji is the offline fallback if the bundled image ever fails to load.
 */
import workersImg from '@assets/actions/workers.jpg';
import attendanceImg from '@assets/actions/attendance.jpg';
import payWagesImg from '@assets/actions/pay_wages.jpg';
import siteMoneyImg from '@assets/actions/site_money.jpg';
import loansImg from '@assets/actions/loans.jpg';
import orderImg from '@assets/actions/order.jpg';
import hireImg from '@assets/actions/hire.jpg';
import newWorkImg from '@assets/actions/new_work.jpg';

type Action = { emoji: string; label: string; i18nKey: string; go: string; ring: string; img: string };

/**
 * Quick actions. Attendance and Cashbook are per-project, so their route needs a project id —
 * `pid` is the builder's current/in-progress project (falls back to the picker when none).
 * Previously two tile pairs pointed at the same route (Workers=Attendance, PayWages=WageBook);
 * each destination is now distinct.
 */
const buildActions = (pid: string): Action[] => {
  const board = (leaf: string) => (pid ? `/app/workforce/board/${pid}/${leaf}` : '/app/workforce');
  return [
    { emoji: '👷', label: 'Workers', i18nKey: 'dash.actWorkers', go: '/app/workforce', ring: '#22406a', img: workersImg },
    { emoji: '🗓️', label: 'Attendance', i18nKey: 'dash.actAttendance', go: board('muster'), ring: '#ef8a2b', img: attendanceImg },
    { emoji: '💸', label: 'Pay Wages', i18nKey: 'dash.actPayWages', go: '/app/wage-register', ring: '#3a9d4e', img: payWagesImg },
    { emoji: '📒', label: 'Site Money', i18nKey: 'dash.actCashbook', go: board('cashbook'), ring: '#7c5cd6', img: siteMoneyImg },
    { emoji: '🏦', label: 'Loans', i18nKey: 'dash.actLoans', go: '/app/loans', ring: '#2ba79b', img: loansImg },
    { emoji: '🛒', label: 'Order', i18nKey: 'dash.actOrder', go: '/app/order', ring: '#3f7fd6', img: orderImg },
    { emoji: '🔨', label: 'Hire', i18nKey: 'dash.actHire', go: '/app/marketplace', ring: '#ef8a2b', img: hireImg },
    { emoji: '📣', label: 'New Work', i18nKey: 'dash.actNewWork', go: '/app/requirements', ring: '#2ba79b', img: newWorkImg },
  ];
};

const EMPTY: DashboardStats = { sites: 0, workers: 0, presentToday: 0, workersThisWeek: 0, wageBillWeek: 0, pendingPay: 0, spendMonth: 0, attendance: [] };

/** Compact ₹ format: ₹2.1L / ₹48.2K / ₹850. */
const fmtAmt = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${Math.round(n)}`);

/** "17–23 Jun" for the current Mon–Sun week. */
function weekLabel(): string {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = Monday
  const mon = new Date(now); mon.setDate(now.getDate() - day);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const d = (x: Date) => x.getDate();
  const m = (x: Date) => x.toLocaleDateString('en-IN', { month: 'short' });
  return m(mon) === m(sun) ? `${d(mon)}–${d(sun)} ${m(sun)}` : `${d(mon)} ${m(mon)} – ${d(sun)} ${m(sun)}`;
}

export function OrchestratorDashboard() {
  const history = useHistory();
  const { t } = useTranslation();
  const name = useAuthStore((s) => s.user?.name ?? 'Contractor');

  const plan = useSubscriptionStore((s) => s.plan);
  const proRemaining = useSubscriptionStore((s) => s.remaining());

  const { data: stats = EMPTY } = useQuery({ queryKey: ['stats', 'dashboard'], queryFn: () => statsApi.dashboard() });

  // Today's attendance reflects the SAME projects shown on the Sites & Teams page and the
  // Projects picker — one shared backend list. Present/total come from the local board
  // data keyed by the project's real id, so tapping through opens the right project.
  const { data: wfProjects = [] } = useQuery({ queryKey: ['workforce', 'projects'], queryFn: () => workforceApi.projects() });
  const workers = useWorkforceStore((s) => s.workers);
  const attendance = useWorkforceStore((s) => s.attendance);
  const today = new Date().toISOString().slice(0, 10);
  // Attendance is only for in-progress sites — not-started / completed sites are hidden.
  const todayAttendance = (wfProjects as any[])
    .filter((p) => projectStatusOf(p) === 'in_progress')
    .map((p) => {
      const pid = String(p.prjct_id);
      const team = workers.filter((w) => w.projectId === pid);
      const present = team.filter((w) => (attendance[today] ?? {})[w.id] === 'P').length;
      return { id: pid, site: p.nm_tx as string, present, total: team.length };
    });
  const openBoard = (projectId: string) => history.push(`/app/workforce/board/${projectId}`);

  // Per-project quick actions (Attendance, Cashbook) deep-link into the builder's current
  // project — prefer an in-progress site, else the first one; the picker handles "none".
  const actionPid = String(
    ((wfProjects as any[]).find((p) => projectStatusOf(p) === 'in_progress') ?? (wfProjects as any[])[0])?.prjct_id ?? '',
  );
  const actions = buildActions(actionPid);

  const kpis: { icon: ReactNode; value: string; label: string; tone: StatTone }[] = [
    { icon: <IonIcon icon={businessOutline} />, value: String(stats.sites), label: t('dash.activeSites', 'Active sites'), tone: 'blue' },
    { icon: <IonIcon icon={peopleOutline} />, value: String(stats.workers), label: t('dash.workers', 'Workers'), tone: 'green' },
    { icon: <IonIcon icon={walletOutline} />, value: fmtAmt(stats.pendingPay), label: t('dash.pendingPay', 'Pending pay'), tone: 'amber' },
    { icon: <IonIcon icon={trendingUpOutline} />, value: fmtAmt(stats.spendMonth), label: t('dash.spentMo', 'Spent · mo'), tone: 'violet' },
  ];

  return (
    <PageShell title={name}>
      <AnimatedPage>
        {/* ── Hero: this week's wage bill — uses the shared hero tokens so it follows the
             rotating brand palette (deep on green/indigo, soft on amber). ── */}
        <div style={{ padding: '14px 12px 0' }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 'var(--anrix-radius-xl)',
              background: 'var(--anrix-hero-bg)',
              padding: '18px 18px 16px',
              border: '1px solid var(--anrix-hero-border)',
              boxShadow: 'var(--anrix-hero-shadow)',
            }}
          >
            {/* soft top-right glow gives the gradient depth */}
            <div aria-hidden style={{ position: 'absolute', top: -46, right: -34, width: 170, height: 170, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)' }} />

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0,
                  background: 'var(--anrix-hero-chip)', border: '1px solid var(--anrix-hero-border)', color: 'var(--anrix-hero-text)' }}>
                  <IonIcon icon={walletOutline} style={{ fontSize: 17 }} />
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase', color: 'var(--anrix-hero-muted)' }}>
                  {t('dash.toPayThisWeek', 'To pay this week')}
                </span>
              </span>
              {stats.workersThisWeek > 0 && (
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 700,
                    color: 'var(--anrix-hero-text)', background: 'var(--anrix-hero-chip)', padding: '4px 9px',
                    borderRadius: 'var(--anrix-radius-pill)', border: '1px solid var(--anrix-hero-border)',
                  }}
                >
                  <IonIcon icon={arrowUp} style={{ fontSize: 12 }} /> {t('dash.nWorkers', '{{count}} workers', { count: stats.workersThisWeek })}
                </span>
              )}
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 12 }}>
              <span style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.2, color: 'var(--anrix-hero-accent)', lineHeight: 1 }}>
                ₹{stats.pendingPay.toLocaleString('en-IN')}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--anrix-hero-muted)', paddingBottom: 4 }}>{weekLabel()}</span>
            </div>
            <button
              onClick={() => history.push('/app/wage-register')}
              style={{
                position: 'relative', marginTop: 16, width: '100%', height: 46, borderRadius: 'var(--anrix-radius-md)', border: 'none', cursor: 'pointer',
                background: 'var(--anrix-surface)', color: 'var(--anrix-primary-strong)', fontWeight: 800, fontSize: 14.5,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: 'var(--anrix-shadow-2)',
              }}
            >
              {t('dash.payWagesNow', 'Pay wages now')}
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--anrix-primary-soft)', color: 'var(--anrix-primary-strong)', display: 'grid', placeItems: 'center' }}>
                <IonIcon icon={chevronForward} style={{ fontSize: 15 }} />
              </span>
            </button>
          </div>
        </div>

        {/* Go Pro banner — only for free users */}
        {plan === 'free' && (
          <button onClick={() => history.push('/app/plans')}
            style={{ width: 'calc(100% - 24px)', margin: '12px 12px 0', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--anrix-radius-lg)', border: '1px solid var(--anrix-border-strong)', cursor: 'pointer', background: 'var(--anrix-surface)', textAlign: 'left', boxShadow: 'var(--anrix-shadow-1)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 20, background: 'var(--anrix-primary-soft)', flexShrink: 0 }}>✨</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--anrix-text-strong)' }}>{t('dash.goProUnlimited', 'Go Pro — unlimited customers')}</div>
              <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('dash.freeUnlocksLeft', '{{count}} free unlocks left this month', { count: proRemaining })}</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--anrix-on-primary)', background: 'var(--anrix-primary)', padding: '6px 12px', borderRadius: 'var(--anrix-radius-pill)', flexShrink: 0 }}>{t('dash.upgrade', 'Upgrade')}</span>
          </button>
        )}

        {/* ── KPI stat tiles — colourful 2×2 metric cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 12px 0' }}>
          {kpis.map((k) => (
            <StatCard key={k.label} icon={k.icon} value={k.value} label={k.label} tone={k.tone} />
          ))}
        </div>

        {/* ── Quick actions — colorful rounded-square tiles ── */}
        <Reveal>
          <SectionHeader title={t('dash.quickActions', 'Quick actions')} />
          <div className="anrix-card" style={{ margin: '0 12px', padding: '16px 12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 18, columnGap: 12 }}>
              {actions.map((a) => (
                <button key={a.label} onClick={() => history.push(a.go)} className="anrix-pressable"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '2px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {/* Real photo fills the circle, ringed in the action's accent colour.
                      The ring is a padded border (background shows through the gap).
                      Emoji sits behind as the offline fallback. */}
                  <div style={{ position: 'relative', width: '100%', maxWidth: 104, aspectRatio: '1 / 1', borderRadius: '50%', padding: 3, background: a.ring, boxShadow: 'var(--anrix-shadow-1)' }}>
                    <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: 'var(--anrix-surface)', display: 'grid', placeItems: 'center', fontSize: 32 }}>
                      {a.emoji}
                      <img src={a.img} alt={a.label} loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </div>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--anrix-text-strong)', textAlign: 'center', lineHeight: 1.15 }}>{t(a.i18nKey, a.label)}</span>
                    <span style={{ width: 22, height: 3, borderRadius: 999, background: a.ring }} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ── Attendance snapshot ── */}
        <Reveal>
          <SectionHeader title={t('dash.todaysAttendance', "Today's attendance")} action={{ label: t('dash.viewAll', 'View all'), onClick: () => history.push('/app/workforce') }} />
          <div className="anrix-card" style={{ margin: '0 12px var(--anrix-space-7)' }}>
            {todayAttendance.length === 0 && (
              <div style={{ textAlign: 'center', padding: '18px 8px', color: 'var(--anrix-text-muted)', fontSize: 13.5 }}>
                {t('dash.noSitesInProgress', 'No sites in progress — mark a site as “In progress” to track attendance.')}
              </div>
            )}
            {todayAttendance.map((s, i) => {
              const full = s.total > 0 && s.present === s.total;
              // No workers on this project yet → attendance can't be marked. Prompt to add
              // supervisors/workers instead of showing a meaningless 0/0 progress bar.
              if (s.total === 0) {
                return (
                  <div key={s.id} className="anrix-pressable" onClick={() => openBoard(s.id)}
                    style={{ marginTop: i ? 16 : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>🏗️ {s.site}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12.5, fontWeight: 700, color: 'var(--anrix-primary-strong)', flexShrink: 0 }}>
                      {t('dash.addWorkers', 'Add workers')} <IonIcon icon={chevronForward} style={{ fontSize: 15 }} />
                    </span>
                  </div>
                );
              }
              return (
                <div key={s.id} className="anrix-pressable" onClick={() => openBoard(s.id)} style={{ marginTop: i ? 16 : 0, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>🏗️ {s.site}</span>
                    <span style={{ fontWeight: 700, color: full ? 'var(--anrix-success)' : 'var(--anrix-text)' }}>👷 {s.present}/{s.total}</span>
                  </div>
                  <IonProgressBar value={s.present / s.total} color={full ? 'success' : undefined} />
                </div>
              );
            })}
          </div>
        </Reveal>
      </AnimatedPage>
    </PageShell>
  );
}
