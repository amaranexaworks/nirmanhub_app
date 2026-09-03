import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { downloadOutline, chevronBack, chevronForward } from 'ionicons/icons';
import { workforceApi } from '@services/api/workforceApi';
import { useTranslation } from 'react-i18next';

/**
 * Statutory compliance — the PF / ESI / BOCW run for a month, computed from the verified
 * muster. One line per worker (gross → PF + ESI deductions → net), plus employer
 * contributions and the project BOCW cess. This is the paperwork that today is done by
 * hand in a consultant's Excel; here it falls straight out of attendance.
 */

type Row = {
  workr_id: number; emp_cd: string; nm_tx: string; trade_tx: string | null;
  gross_am: string | number; pf_employee_am: string | number; pf_employer_am: string | number;
  esi_applicable: boolean; esi_employee_am: string | number; esi_employer_am: string | number; net_am: string | number;
};
type Totals = {
  gross: number; pfEmp: number; pfEr: number; esiEmp: number; esiEr: number; net: number;
  bocwRate: number; bocwCess: number; pfTotal: number; esiTotal: number;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);
const inr = (v: string | number | null | undefined) => `₹${num(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function CompliancePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    workforceApi.compliance(id, month)
      .then((r) => { if (alive) { setRows(r?.rows || []); setTotals(r?.totals || null); } })
      .catch(() => { if (alive) { setRows([]); setTotals(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id, month]);

  const [y, m] = month.split('-').map(Number);

  const exportCsv = () => {
    const head = ['Code', 'Name', 'Trade', 'Gross', 'PF (Emp)', 'PF (Employer)', 'ESI (Emp)', 'ESI (Employer)', 'Net'];
    const lines = rows.map((r) => [r.emp_cd, r.nm_tx, r.trade_tx || '', num(r.gross_am), num(r.pf_employee_am), num(r.pf_employer_am), num(r.esi_employee_am), num(r.esi_employer_am), num(r.net_am)]);
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `compliance-${id}-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const cards = useMemo(() => totals ? [
    { label: t('wf.pfPayable', 'PF payable'), value: inr(totals.pfTotal), sub: `Emp ${inr(totals.pfEmp)} + Employer ${inr(totals.pfEr)}` },
    { label: t('wf.esiPayable', 'ESI payable'), value: inr(totals.esiTotal), sub: `Emp ${inr(totals.esiEmp)} + Employer ${inr(totals.esiEr)}` },
    { label: t('wf.bocwCess', 'BOCW cess ({{rate}}%)', { rate: totals.bocwRate }), value: inr(totals.bocwCess), sub: t('wf.onLabourCost', 'On labour cost') },
  ] : [], [totals, t]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.pfEsiBocw', 'PF / ESI / BOCW')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={exportCsv} disabled={!rows.length}><IonIcon slot="icon-only" icon={downloadOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 12 }}>
            <IonButton fill="clear" size="small" onClick={() => setMonth((mm) => shiftMonth(mm, -1))}><IonIcon slot="icon-only" icon={chevronBack} /></IonButton>
            <span style={{ fontWeight: 800, fontSize: 16, minWidth: 130, textAlign: 'center' }}>{MONTHS[m - 1]} {y}</span>
            <IonButton fill="clear" size="small" onClick={() => setMonth((mm) => shiftMonth(mm, 1))}><IonIcon slot="icon-only" icon={chevronForward} /></IonButton>
          </div>

          {/* Employer liability summary */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {cards.map((c) => (
              <div key={c.label} style={{ flex: 1, padding: '12px 12px', borderRadius: 14, background: 'var(--anrix-surface-2, #f7f7f5)', border: '1px solid var(--anrix-border)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--anrix-text-muted)' }}>{c.label}</div>
                <div style={{ fontWeight: 800, fontSize: 18, margin: '2px 0' }}>{c.value}</div>
                <div style={{ fontSize: 10, color: 'var(--anrix-text-muted)' }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <BrandLoader />
          ) : !rows.length ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.noWageData', 'No wage data for {{month}} {{year}}.', { month: MONTHS[m - 1], year: y })}</div>
          ) : (
            <div style={{ overflowX: 'auto', border: '1px solid var(--anrix-border, #e5e7eb)', borderRadius: 12 }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap', width: '100%' }}>
                <thead>
                  <tr style={{ background: 'var(--anrix-surface-2, #f7f7f5)' }}>
                    <th style={{ ...th, textAlign: 'left', minWidth: 140 }}>{t('wf.worker', 'Worker')}</th>
                    <th style={th}>{t('wf.gross', 'Gross')}</th><th style={th}>{t('wf.pf', 'PF')}</th><th style={th}>{t('wf.esi', 'ESI')}</th><th style={th}>{t('wf.net', 'Net')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.workr_id} style={{ borderTop: '1px solid var(--anrix-border, #eee)' }}>
                      <td style={{ ...td, textAlign: 'left' }}>
                        <div style={{ fontWeight: 700 }}>{r.nm_tx}</div>
                        <div style={{ fontSize: 10, color: 'var(--anrix-text-muted)' }}>{r.emp_cd}{!r.esi_applicable ? t('wf.esiNa', ' · ESI N/A') : ''}</div>
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>{inr(r.gross_am)}</td>
                      <td style={td}>−{inr(r.pf_employee_am)}</td>
                      <td style={td}>{num(r.esi_employee_am) ? `−${inr(r.esi_employee_am)}` : '—'}</td>
                      <td style={{ ...td, fontWeight: 800 }}>{inr(r.net_am)}</td>
                    </tr>
                  ))}
                </tbody>
                {totals && (
                  <tfoot>
                    <tr style={{ background: 'var(--anrix-surface-2, #f7f7f5)', fontWeight: 800 }}>
                      <td style={{ ...td, textAlign: 'left' }}>{t('wf.total', 'Total')}</td>
                      <td style={td}>{inr(totals.gross)}</td>
                      <td style={td}>−{inr(totals.pfEmp)}</td>
                      <td style={td}>−{inr(totals.esiEmp)}</td>
                      <td style={td}>{inr(totals.net)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--anrix-text-muted)' }}>
            {t('wf.ratesFootnote', 'PF 12% (capped at ₹15,000 wage) · ESI 0.75% employee / 3.25% employer when gross ≤ ₹21,000 · BOCW cess 1%. Rates are configurable.')}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}

const th: React.CSSProperties = { padding: '9px 8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--anrix-border, #e5e7eb)' };
const td: React.CSSProperties = { padding: '8px 8px', textAlign: 'right' };
