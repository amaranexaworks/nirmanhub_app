import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonModal, IonInput, IonTextarea, IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { addOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { workforceApi } from '@services/api/workforceApi';

/**
 * Site progress & cost — the DPR feed (daily activities, manpower auto-pulled from the
 * muster, weather, blockers) and a budget-vs-actual cost view (labour from attendance +
 * expenses by category against the project budget). One screen for "how's the site doing".
 */

type Dpr = { dpr_id: number; dpr_dt: string; manpower_cnt: number | null; wthr_tx: string | null; activities_tx: string | null; issues_tx: string | null; materials_tx: string | null };
type Cost = { budget: number | null; actual: number; variance: number | null; breakdown: { labour: number; material: number; equipment: number; transport: number; misc: number } };

const inr = (v: number | null | undefined) => `₹${(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const CAT_COLOR: Record<string, string> = { labour: '#2563eb', material: '#16a34a', equipment: '#9333ea', transport: '#d97706', misc: '#6b7280' };

export function ProgressCostPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<'dpr' | 'cost'>('dpr');
  const [dprs, setDprs] = useState<Dpr[]>([]);
  const [cost, setCost] = useState<Cost | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<{ activities: string; weather: string; issues: string; materials: string; manpower: string }>({ activities: '', weather: '', issues: '', materials: '', manpower: '' });

  const [showBudget, setShowBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([workforceApi.dpr(id), workforceApi.costSummary(id)])
      .then(([d, c]) => { setDprs((d as Dpr[]) || []); setCost(c as Cost); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const saveDpr = async () => {
    await workforceApi.addDpr(id, {
      activities: form.activities || undefined, weather: form.weather || undefined,
      issues: form.issues || undefined, materials: form.materials || undefined,
      manpower: form.manpower ? Number(form.manpower) : undefined,
    });
    setShowAdd(false); setForm({ activities: '', weather: '', issues: '', materials: '', manpower: '' }); load();
  };

  const saveBudget = async () => {
    if (!budgetInput) return;
    await workforceApi.setBudget(id, Number(budgetInput));
    setShowBudget(false); setBudgetInput(''); load();
  };

  const cats = cost ? Object.entries(cost.breakdown) as [string, number][] : [];
  const maxCat = Math.max(1, ...cats.map(([, v]) => v));

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.progressAndCost', 'Progress & Cost')}</IonTitle>
          {tab === 'dpr' && <IonButtons slot="end"><IonButton onClick={() => setShowAdd(true)}><IonIcon slot="icon-only" icon={addOutline} /></IonButton></IonButtons>}
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={(e) => setTab(e.detail.value as any)}>
            <IonSegmentButton value="dpr"><IonLabel>{t('wf.dailyReport', 'Daily Report')}</IonLabel></IonSegmentButton>
            <IonSegmentButton value="cost"><IonLabel>{t('wf.cost', 'Cost')}</IonLabel></IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : tab === 'dpr' ? (
          <div style={{ padding: 14 }}>
            {!dprs.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.noDailyReports', "No daily reports yet. Tap ＋ to add today's.")}</div>
            ) : dprs.map((d) => (
              <div key={d.dpr_id} className="anrix-card" style={{ padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800 }}>{d.dpr_dt}</span>
                  <span style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>👷 {d.manpower_cnt ?? '—'} present{d.wthr_tx ? ` · ${d.wthr_tx}` : ''}</span>
                </div>
                {d.activities_tx && <p style={{ margin: '8px 0 0', fontSize: 13.5 }}>{d.activities_tx}</p>}
                {d.materials_tx && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--anrix-text-muted)' }}>📦 {d.materials_tx}</p>}
                {d.issues_tx && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--anrix-danger, #dc2626)' }}>⚠ {d.issues_tx}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 14 }}>
            {/* Budget vs actual */}
            <div className="anrix-card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>{t('wf.budgetVsActual', 'Budget vs Actual')}</span>
                <IonButton size="small" fill="clear" onClick={() => { setBudgetInput(cost?.budget ? String(cost.budget) : ''); setShowBudget(true); }}>{cost?.budget != null ? t('wf.editBudget', 'Edit budget') : t('wf.setBudget', 'Set budget')}</IonButton>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                <div><div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{t('wf.budget', 'Budget')}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{cost?.budget != null ? inr(cost.budget) : '—'}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{t('wf.actual', 'Actual')}</div><div style={{ fontWeight: 800, fontSize: 18 }}>{inr(cost?.actual)}</div></div>
                {cost?.variance != null && (
                  <div><div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{t('wf.remaining', 'Remaining')}</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: cost.variance < 0 ? 'var(--anrix-danger, #dc2626)' : 'var(--anrix-success, #16a34a)' }}>{inr(cost.variance)}</div></div>
                )}
              </div>
              {cost?.budget != null && cost.budget > 0 && (
                <div style={{ marginTop: 12, height: 10, borderRadius: 6, background: 'var(--anrix-surface-2, #eee)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.round(cost.actual / cost.budget * 100))}%`, height: '100%', background: cost.actual > cost.budget ? 'var(--anrix-danger, #dc2626)' : 'var(--anrix-primary, #f5b301)' }} />
                </div>
              )}
            </div>

            {/* Category breakdown */}
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--anrix-text-muted)', margin: '18px 2px 8px' }}>{t('wf.costBreakdown', 'Cost breakdown')}</div>
            <div className="anrix-card" style={{ padding: 16 }}>
              {cats.map(([cat, v]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ textTransform: 'capitalize' }}>{cat}</span><b>{inr(v)}</b>
                  </div>
                  <div style={{ height: 8, borderRadius: 5, background: 'var(--anrix-surface-2, #eee)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(v / maxCat * 100)}%`, height: '100%', background: CAT_COLOR[cat] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add DPR */}
        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} initialBreakpoint={0.9} breakpoints={[0, 0.9]}>
          <div style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{t('wf.dailyProgressReport', 'Daily progress report')}</h3>
            <IonTextarea label={t('wf.workDoneToday', 'Work done today')} labelPlacement="stacked" autoGrow value={form.activities} onIonInput={(e) => setForm((f) => ({ ...f, activities: e.detail.value || '' }))} placeholder={t('wf.workDonePlaceholder', 'e.g. 2nd floor slab shuttering completed')} />
            <IonInput label={t('wf.weather', 'Weather')} labelPlacement="stacked" value={form.weather} onIonInput={(e) => setForm((f) => ({ ...f, weather: e.detail.value || '' }))} placeholder={t('wf.weatherPlaceholder', 'sunny / rain')} />
            <IonInput label={t('wf.manpowerAutoLabel', 'Manpower (blank = auto from muster)')} labelPlacement="stacked" type="number" value={form.manpower} onIonInput={(e) => setForm((f) => ({ ...f, manpower: e.detail.value || '' }))} />
            <IonTextarea label={t('wf.materialsConsumed', 'Materials consumed')} labelPlacement="stacked" autoGrow value={form.materials} onIonInput={(e) => setForm((f) => ({ ...f, materials: e.detail.value || '' }))} placeholder={t('wf.materialsPlaceholder', 'e.g. 40 bags cement, 2T steel')} />
            <IonTextarea label={t('wf.issuesBlockers', 'Issues / blockers')} labelPlacement="stacked" autoGrow value={form.issues} onIonInput={(e) => setForm((f) => ({ ...f, issues: e.detail.value || '' }))} placeholder={t('wf.optional', 'Optional')} />
            <IonButton expand="block" style={{ marginTop: 16 }} onClick={saveDpr}>{t('wf.saveReport', 'Save report')}</IonButton>
          </div>
        </IonModal>

        {/* Set budget */}
        <IonModal isOpen={showBudget} onDidDismiss={() => setShowBudget(false)} initialBreakpoint={0.4} breakpoints={[0, 0.4]}>
          <div style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{t('wf.projectBudget', 'Project budget')}</h3>
            <IonInput label={t('wf.totalBudget', 'Total budget (₹)')} labelPlacement="stacked" type="number" value={budgetInput} onIonInput={(e) => setBudgetInput(e.detail.value || '')} placeholder="e.g. 5000000" />
            <IonButton expand="block" style={{ marginTop: 16 }} disabled={!budgetInput} onClick={saveBudget}>{t('wf.save', 'Save')}</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
