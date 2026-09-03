import { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { useQuery } from '@tanstack/react-query';
import { chevronForward, cubeOutline, cardOutline, walletOutline, receiptOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { EmptyState } from '@design/patterns';
import { materialsApi } from '@services/api/materialsApi';
import { creditApi } from '@services/api/creditApi';
import { walletApi } from '@services/api/walletApi';

type Tone = 'success' | 'primary' | 'info';
const chipTone: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: 'rgba(31,169,113,0.14)', fg: 'var(--anrix-success)' },
  primary: { bg: 'var(--anrix-primary-soft)', fg: 'var(--anrix-primary-strong)' },
  info: { bg: 'rgba(91,100,114,0.14)', fg: 'var(--anrix-info)' },
};

interface Entry {
  ts: number; icon: string; tint: string; status: string; tone: Tone;
  title: string; subtitle: string; amount?: string; go: string;
}

const dayKey = (ts: number) => {
  const d = new Date(ts); const now = new Date();
  const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((strip(now) - strip(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
const timeLabel = (ts: number) => new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export function HistoryPage() {
  const { t } = useTranslation();
  const history = useHistory();

  const { data: orders = [] } = useQuery({ queryKey: ['materials', 'orders'], queryFn: () => materialsApi.orders() });
  const { data: credit = [] } = useQuery({ queryKey: ['credit', 'orders'], queryFn: () => creditApi.orders() });
  const { data: wallet = [] } = useQuery({ queryKey: ['wallet', 'txns'], queryFn: () => walletApi.transactions() });

  const groups = useMemo(() => {
    const entries: Entry[] = [];

    for (const o of orders as any[]) {
      const ts = Date.parse(o.i_ts) || 0;
      entries.push({
        ts, icon: cubeOutline, tint: '#eef3ff', status: t('history.statusOrder', 'Order'), tone: 'info',
        title: t('history.materialsOrder', 'Materials order #{{id}}', { id: o.ordr_id }),
        subtitle: `${o.item_count || 0} ${(o.item_count || 0) > 1 ? t('history.items', 'items') : t('history.item', 'item')}${o.dlvry_tx ? ` · ${o.dlvry_tx}` : ''}`,
        amount: o.ttl_am != null ? `-₹${Number(o.ttl_am).toLocaleString('en-IN')}` : undefined,
        go: '/app/order',
      });
    }
    for (const c of credit as any[]) {
      const ts = Date.parse(c.ordrd_ts) || 0;
      const paid = c.sts_cd === 'paid';
      entries.push({
        ts, icon: cardOutline, tint: '#fff4e0', status: paid ? t('history.statusRepaid', 'Repaid') : t('history.statusOnCredit', 'On credit'), tone: paid ? 'success' : 'primary',
        title: `${t('history.credit', 'Credit')} · ${c.vndr_tx || t('history.vendor', 'Vendor')}`,
        subtitle: paid ? t('history.repaidInFull', 'Repaid in full') : t('history.repaymentPending', 'Repayment pending'),
        amount: c.ttl_am != null ? `-₹${Number(c.ttl_am).toLocaleString('en-IN')}` : undefined,
        go: '/app/credit',
      });
    }
    for (const w of wallet as any[]) {
      const ts = Date.parse(w.i_ts) || 0;
      const credited = w.kind_cd === 'credit';
      entries.push({
        ts, icon: walletOutline, tint: '#eaf7ef', status: credited ? t('history.statusAdded', 'Added') : t('history.statusWithdrawn', 'Withdrawn'), tone: credited ? 'success' : 'info',
        title: w.ttl_tx, subtitle: t('history.wallet', 'Wallet'),
        amount: `${credited ? '+' : '−'}₹${Number(w.amt_am).toLocaleString('en-IN')}`,
        go: '/app/wallet',
      });
    }

    entries.sort((a, b) => b.ts - a.ts);
    const map = new Map<string, Entry[]>();
    for (const e of entries) {
      const k = dayKey(e.ts);
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return Array.from(map, ([day, items]) => ({ day, items }));
  }, [orders, credit, wallet, t]);

  const empty = groups.length === 0;

  return (
    <PageShell title={t('history.title', 'History')} showBack>
      <AnimatedPage>
        {empty ? (
          <EmptyState
            icon={receiptOutline}
            title={t('history.emptyTitle', 'No activity yet')}
            message={t('history.emptyMessage', 'Your orders, credit purchases, and wallet payments will show up here as they happen.')}
          />
        ) : (
          <div style={{ padding: '4px 12px 24px' }}>
            {groups.map((g) => (
              <div key={g.day} style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--anrix-text-muted)', margin: '0 2px 10px' }}>{g.day === 'Today' ? t('history.today', 'Today') : g.day === 'Yesterday' ? t('history.yesterday', 'Yesterday') : g.day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {g.items.map((a, i) => {
                    const c = chipTone[a.tone];
                    return (
                      <div key={i} className="anrix-card" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: c.fg, background: c.bg, padding: '3px 9px', borderRadius: 'var(--anrix-radius-pill)' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.fg }} /> {a.status}
                          </span>
                          <span style={{ fontSize: 11.5, color: 'var(--anrix-text-muted)' }}>{timeLabel(a.ts)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 11 }}>
                          <span style={{ width: 44, height: 44, borderRadius: 12, background: a.tint, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <IonIcon icon={a.icon} style={{ fontSize: 21, color: 'var(--anrix-text-strong)' }} />
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--anrix-text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--anrix-text-muted)', marginTop: 1 }}>{a.subtitle}</div>
                          </div>
                          {a.amount && <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--anrix-text-strong)', flexShrink: 0 }}>{a.amount}</span>}
                        </div>
                        <button onClick={() => history.push(a.go)} className="anrix-pressable"
                          style={{ marginTop: 12, width: '100%', height: 40, borderRadius: 'var(--anrix-radius-md)', border: '1.5px solid var(--anrix-border-strong)', background: 'var(--anrix-surface)', color: 'var(--anrix-text-strong)', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {t('history.viewDetails', 'View details')} <IonIcon icon={chevronForward} style={{ fontSize: 15 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedPage>
    </PageShell>
  );
}
