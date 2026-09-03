import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonButton, IonIcon, IonModal, IonTextarea, IonSelect, IonSelectOption,
} from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { addOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import { workforceApi } from '@services/api/workforceApi';

/**
 * Site safety — incident reporting (injury / near-miss / unsafe condition / PPE
 * violation) with severity + action, and the safety scorecard a site runs on:
 * days-since-last-incident and open incidents by severity.
 */

type Incident = { incdnt_id: number; incdnt_dt: string; type_cd: string; svrty_cd: string; workr_nm: string | null; descr_tx: string; action_tx: string | null; sts_cd: string };
type Summary = { total_cnt: string | number; open_cnt: string | number; open_serious_cnt: string | number; critical_cnt: string | number; ppe_cnt: string | number; days_since_last: number | null };

const TYPE_LABEL: Record<string, string> = { injury: 'Injury', near_miss: 'Near miss', unsafe: 'Unsafe condition', ppe_violation: 'PPE violation', property: 'Property damage' };
const SEV_TONE: Record<string, string> = { low: '#6b7280', medium: '#d97706', high: '#ea580c', critical: 'var(--anrix-danger, #dc2626)' };
const num = (v: string | number | null | undefined) => (v == null ? 0 : typeof v === 'number' ? v : parseFloat(v) || 0);

export function SafetyPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<Incident[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState<{ type: string; severity: string; description: string; action: string }>({ type: 'unsafe', severity: 'low', description: '', action: '' });

  const load = () => {
    setLoading(true);
    Promise.all([workforceApi.incidents(id), workforceApi.safetySummary(id)])
      .then(([i, s]) => { setItems((i as Incident[]) || []); setSummary(s as Summary); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  const save = async () => {
    if (!f.description.trim()) return;
    await workforceApi.addIncident(id, { type: f.type, severity: f.severity, description: f.description.trim(), action: f.action.trim() || undefined });
    setShowAdd(false); setF({ type: 'unsafe', severity: 'low', description: '', action: '' }); load();
  };

  const toggle = async (i: Incident) => { await workforceApi.setIncidentStatus(i.incdnt_id, i.sts_cd === 'open' ? 'closed' : 'open'); load(); };

  const daysSince = summary?.days_since_last;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref={`/app/workforce/board/${id}`} /></IonButtons>
          <IonTitle>{t('wf.safety', 'Safety')}</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => setShowAdd(true)}><IonIcon slot="icon-only" icon={addOutline} /></IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        {loading ? (
          <BrandLoader />
        ) : (
          <div style={{ padding: 14 }}>
            {/* Scorecard */}
            <div style={{ padding: 18, borderRadius: 16, background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.30)', textAlign: 'center', marginBottom: 12 }}>
              <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 26, color: 'var(--anrix-success, #16a34a)' }} />
              <div style={{ fontWeight: 900, fontSize: 34, lineHeight: 1.1 }}>{daysSince == null ? '—' : daysSince}</div>
              <div style={{ fontSize: 13, color: 'var(--anrix-text-muted)' }}>{t('wf.daysSinceLastIncident', 'days since last incident')}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {[
                { label: t('wf.open', 'Open'), value: num(summary?.open_cnt), tone: 'var(--anrix-text)' },
                { label: t('wf.seriousOpen', 'Serious open'), value: num(summary?.open_serious_cnt), tone: 'var(--anrix-danger, #dc2626)' },
                { label: t('wf.ppeIssues', 'PPE issues'), value: num(summary?.ppe_cnt), tone: '#d97706' },
              ].map((c) => (
                <div key={c.label} style={{ flex: 1, padding: '12px', borderRadius: 14, background: 'var(--anrix-surface-2, #f7f7f5)', border: '1px solid var(--anrix-border)', textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: c.tone }}>{c.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Feed */}
            {!items.length ? (
              <div style={{ padding: 26, textAlign: 'center', color: 'var(--anrix-text-muted)' }}>{t('wf.noIncidentsReported', 'No incidents reported. Keep it that way 👷')}</div>
            ) : items.map((i) => (
              <div key={i.incdnt_id} className="anrix-card" style={{ padding: 14, marginBottom: 10, opacity: i.sts_cd === 'closed' ? 0.6 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>
                    <span style={{ color: SEV_TONE[i.svrty_cd] }}>●</span> {TYPE_LABEL[i.type_cd] || i.type_cd}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--anrix-text-muted)' }}>{i.incdnt_dt}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13.5 }}>{i.descr_tx}</p>
                {i.workr_nm && <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)', marginTop: 4 }}>{t('wf.workerLabel', 'Worker:')} {i.workr_nm}</div>}
                {i.action_tx && <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)', marginTop: 4 }}>{t('wf.actionLabel', 'Action:')} {i.action_tx}</div>}
                <IonButton size="small" fill="clear" style={{ marginTop: 6 }} onClick={() => toggle(i)}>{i.sts_cd === 'open' ? t('wf.markClosed', 'Mark closed') : t('wf.reopen', 'Reopen')}</IonButton>
              </div>
            ))}
          </div>
        )}

        <IonModal isOpen={showAdd} onDidDismiss={() => setShowAdd(false)} initialBreakpoint={0.85} breakpoints={[0, 0.85]}>
          <div style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{t('wf.reportIncident', 'Report incident')}</h3>
            <IonSelect label={t('wf.type', 'Type')} labelPlacement="stacked" value={f.type} onIonChange={(e) => setF((x) => ({ ...x, type: e.detail.value }))}>
              {Object.entries(TYPE_LABEL).map(([k, v]) => <IonSelectOption key={k} value={k}>{v}</IonSelectOption>)}
            </IonSelect>
            <IonSelect label={t('wf.severity', 'Severity')} labelPlacement="stacked" value={f.severity} onIonChange={(e) => setF((x) => ({ ...x, severity: e.detail.value }))}>
              {['low', 'medium', 'high', 'critical'].map((s) => <IonSelectOption key={s} value={s}>{s}</IonSelectOption>)}
            </IonSelect>
            <IonTextarea label={t('wf.whatHappened', 'What happened')} labelPlacement="stacked" autoGrow value={f.description} onIonInput={(e) => setF((x) => ({ ...x, description: e.detail.value || '' }))} placeholder={t('wf.describeIncident', 'Describe the incident')} />
            <IonTextarea label={t('wf.actionTaken', 'Action taken')} labelPlacement="stacked" autoGrow value={f.action} onIonInput={(e) => setF((x) => ({ ...x, action: e.detail.value || '' }))} placeholder={t('wf.optional', 'Optional')} />
            <IonButton expand="block" style={{ marginTop: 16 }} disabled={!f.description.trim()} onClick={save}>{t('wf.report', 'Report')}</IonButton>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
