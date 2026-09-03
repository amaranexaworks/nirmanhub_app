import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { downloadOutline, shieldCheckmark, warningOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { workforceApi } from '@services/api/workforceApi';

/**
 * Digital Muster Roll — the statutory attendance register, generated from verified
 * punches. One row per worker, one column per day of the month, plus the totals a
 * labour inspector or payroll run needs (paid days, OT, and the geo-verified vs
 * flagged split that exposes ghost/fake attendance). Exports to CSV for records.
 */

type Cell = { s: string; ot: number; v: string };
type Row = {
  workr_id: number; emp_cd: string; nm_tx: string; trade_tx: string | null; skill_cd: string | null;
  day_rate_am: string | number | null; days: Record<string, Cell>;
  paid_days: string | number; ot_hours: string | number; absent_days: string | number;
  verified_cnt: string | number; flagged_cnt: string | number;
};

// Mark → colour. Flagged punches get a red ring drawn over the mark.
const MARK_TONE: Record<string, string> = {
  P: 'var(--anrix-success, #16a34a)', H: '#d97706', A: 'var(--anrix-danger, #dc2626)',
  L: '#6b7280', WO: '#9ca3af',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);

export function MusterRollPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    workforceApi.muster(id, month)
      .then((r) => { if (alive) setRows((r as Row[]) || []); })
      .catch(() => { if (alive) setRows([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, month]);

  const dim = daysInMonth(month);
  const days = useMemo(() => Array.from({ length: dim }, (_, i) => i + 1), [dim]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    paid: acc.paid + num(r.paid_days),
    ot: acc.ot + num(r.ot_hours),
    verified: acc.verified + num(r.verified_cnt),
    flagged: acc.flagged + num(r.flagged_cnt),
  }), { paid: 0, ot: 0, verified: 0, flagged: 0 }), [rows]);

  const wage = (r: Row) => Math.round(num(r.paid_days) * num(r.day_rate_am));

  const exportCsv = () => {
    const head = ['Code', 'Name', 'Trade', 'Skill', ...days.map(String), 'Paid Days', 'OT Hrs', 'Absent', 'Verified', 'Flagged', 'Day Rate', 'Gross Wage'];
    const lines = rows.map((r) => [
      r.emp_cd, r.nm_tx, r.trade_tx || '', r.skill_cd || '',
      ...days.map((d) => r.days[String(d)]?.s || ''),
      num(r.paid_days), num(r.ot_hours), num(r.absent_days), num(r.verified_cnt), num(r.flagged_cnt),
      num(r.day_rate_am), wage(r),
    ]);
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `muster-roll-${id}-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const [y, m] = month.split('-').map(Number);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.musterRoll', 'Muster Roll')}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={exportCsv} disabled={!rows.length}><IonIcon slot="icon-only" icon={downloadOutline} /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: 14 }}>
          {/* Month stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
            <IonButton fill="clear" size="small" onClick={() => setMonth((mm) => shiftMonth(mm, -1))}>
              <IonIcon slot="icon-only" icon={chevronBack} />
            </IonButton>
            <span style={{ fontWeight: 800, fontSize: 16, minWidth: 130, textAlign: 'center' }}>{MONTHS[m - 1]} {y}</span>
            <IonButton fill="clear" size="small" onClick={() => setMonth((mm) => shiftMonth(mm, 1))}>
              <IonIcon slot="icon-only" icon={chevronForward} />
            </IonButton>
          </div>

          {/* Fraud / verification summary */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.30)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <IonIcon icon={shieldCheckmark} style={{ color: 'var(--anrix-success, #16a34a)', fontSize: 20 }} />
                <span style={{ fontWeight: 800, fontSize: 20 }}>{totals.verified}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('wf.geoVerifiedPunches', 'Geo-verified punches')}</span>
            </div>
            <div style={{ flex: 1, padding: '12px 14px', borderRadius: 14, background: totals.flagged ? 'rgba(220,38,38,0.10)' : 'rgba(0,0,0,0.04)', border: `1px solid ${totals.flagged ? 'rgba(220,38,38,0.30)' : 'rgba(0,0,0,0.08)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <IonIcon icon={warningOutline} style={{ color: totals.flagged ? 'var(--anrix-danger, #dc2626)' : '#9ca3af', fontSize: 20 }} />
                <span style={{ fontWeight: 800, fontSize: 20 }}>{totals.flagged}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{t('wf.flaggedOutsideSite', 'Flagged (outside site)')}</span>
            </div>
          </div>

          {loading ? (
            <BrandLoader />
          ) : !rows.length ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>
              {t('wf.noWorkersForMonth', 'No workers or attendance for {{month}} {{year}}.', { month: MONTHS[m - 1], year: y })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--anrix-border, #e5e7eb)', borderRadius: 12 }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: 'var(--anrix-surface-2, #f7f7f5)' }}>
                    <th style={{ ...th, position: 'sticky', left: 0, background: 'var(--anrix-surface-2, #f7f7f5)', textAlign: 'left', minWidth: 150 }}>{t('wf.worker', 'Worker')}</th>
                    {days.map((d) => <th key={d} style={{ ...th, minWidth: 26 }}>{d}</th>)}
                    <th style={{ ...th, minWidth: 44 }}>{t('wf.daysCol', 'Days')}</th>
                    <th style={{ ...th, minWidth: 40 }}>{t('wf.otCol', 'OT')}</th>
                    <th style={{ ...th, minWidth: 70 }}>{t('wf.wageCol', 'Wage ₹')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.workr_id} style={{ borderTop: '1px solid var(--anrix-border, #eee)' }}>
                      <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--anrix-surface, #fff)', textAlign: 'left' }}>
                        <div style={{ fontWeight: 700 }}>{r.nm_tx}</div>
                        <div style={{ fontSize: 10, color: 'var(--anrix-text-muted)' }}>{r.emp_cd} · {r.trade_tx || '—'}</div>
                      </td>
                      {days.map((d) => {
                        const c = r.days[String(d)];
                        const flagged = c?.v === 'flagged';
                        return (
                          <td key={d} style={{ ...td }}>
                            {c ? (
                              <span title={flagged ? t('wf.punchOutsideGeofence', 'Punch outside site geofence') : c.v} style={{
                                display: 'inline-block', minWidth: 18, fontWeight: 800,
                                color: MARK_TONE[c.s] || '#374151',
                                borderBottom: flagged ? '2px solid var(--anrix-danger, #dc2626)' : 'none',
                              }}>{c.s}</span>
                            ) : <span style={{ color: '#d1d5db' }}>·</span>}
                          </td>
                        );
                      })}
                      <td style={{ ...td, fontWeight: 800 }}>{num(r.paid_days)}</td>
                      <td style={{ ...td }}>{num(r.ot_hours)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{wage(r).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--anrix-surface-2, #f7f7f5)', fontWeight: 800 }}>
                    <td style={{ ...td, position: 'sticky', left: 0, background: 'var(--anrix-surface-2, #f7f7f5)', textAlign: 'left' }}>{t('wf.total', 'Total')}</td>
                    {days.map((d) => <td key={d} style={td} />)}
                    <td style={td}>{totals.paid}</td>
                    <td style={td}>{totals.ot}</td>
                    <td style={td}>{rows.reduce((s, r) => s + wage(r), 0).toLocaleString('en-IN')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--anrix-text-muted)' }}>
            {Object.entries({ P: t('wf.legendPresent', 'Present'), H: t('wf.legendHalfDay', 'Half day'), A: t('wf.legendAbsent', 'Absent'), L: t('wf.legendLeave', 'Leave'), WO: t('wf.legendWeekOff', 'Week-off') }).map(([k, v]) => (
              <span key={k}><b style={{ color: MARK_TONE[k] }}>{k}</b> {v}</span>
            ))}
            <span><b style={{ borderBottom: '2px solid var(--anrix-danger, #dc2626)' }}>{t('wf.underline', 'underline')}</b> {t('wf.eqFlaggedPunch', '= flagged punch')}</span>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

const th: React.CSSProperties = { padding: '8px 6px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--anrix-border, #e5e7eb)' };
const td: React.CSSProperties = { padding: '7px 6px', textAlign: 'center' };
