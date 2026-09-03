import { useTranslation } from 'react-i18next';
import { IonIcon, useIonToast, useIonAlert } from '@ionic/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addOutline, arrowUpOutline, walletOutline, arrowDownOutline } from 'ionicons/icons';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage, Reveal } from '@components/motion';
import { GradientButton } from '@design/primitives';
import { walletApi, type WalletTxn } from '@services/api/walletApi';

const rupee = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const fmtDate = (ts?: string) => (ts ? new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

export function WalletPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [toast] = useIonToast();
  const [alert] = useIonAlert();

  const { data: balance = 0 } = useQuery({ queryKey: ['wallet', 'balance'], queryFn: () => walletApi.balance() });
  const { data: txns = [] } = useQuery({ queryKey: ['wallet', 'txns'], queryFn: () => walletApi.transactions() });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['wallet', 'balance'] }); qc.invalidateQueries({ queryKey: ['wallet', 'txns'] }); };

  const addMut = useMutation({
    mutationFn: (amount: number) => walletApi.addMoney(amount),
    onSuccess: () => { refresh(); void toast({ message: t('wallet.moneyAdded', 'Money added ✓'), duration: 1400, color: 'success', position: 'top' }); },
    onError: (e: any) => toast({ message: e.message || t('wallet.couldNotAddMoney', 'Could not add money'), duration: 1800, color: 'danger', position: 'top' }),
  });
  const withdrawMut = useMutation({
    mutationFn: (amount: number) => walletApi.withdraw(amount),
    onSuccess: () => { refresh(); void toast({ message: t('wallet.withdrawalRequested', 'Withdrawal requested ✓'), duration: 1400, color: 'success', position: 'top' }); },
    onError: (e: any) => toast({ message: e.message || t('wallet.couldNotWithdraw', 'Could not withdraw'), duration: 1800, color: 'danger', position: 'top' }),
  });

  const ask = (title: string, onOk: (amt: number) => void) => alert({
    header: title,
    inputs: [{ name: 'amount', type: 'number', placeholder: t('wallet.amountPlaceholder', 'Amount (₹)'), min: 1 }],
    buttons: [
      { text: t('wallet.cancel', 'Cancel'), role: 'cancel' },
      { text: t('wallet.confirm', 'Confirm'), handler: (v) => { const a = Number(v.amount); if (a > 0) onOk(a); } },
    ],
  });

  return (
    <PageShell title={t('wallet.wallet', 'Wallet')} showBack>
      <AnimatedPage>
        <Reveal>
          <div style={{ margin: 16, padding: 22, borderRadius: 'var(--anrix-radius-xl)', background: 'var(--anrix-hero-bg)', color: 'var(--anrix-hero-text)', border: '1px solid var(--anrix-hero-border)', boxShadow: 'var(--anrix-hero-shadow)' }}>
            <div style={{ color: 'var(--anrix-hero-muted)', fontSize: 14 }}>{t('wallet.availableBalance', 'Available balance')}</div>
            <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--anrix-hero-accent)' }}>{rupee(balance)}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <GradientButton variant="glass" icon={addOutline} full={false} style={{ flex: 1, color: 'var(--anrix-hero-text)' }} onClick={() => ask(t('wallet.addMoney', 'Add money'), (a) => addMut.mutate(a))}>{t('wallet.addMoney', 'Add money')}</GradientButton>
              <GradientButton variant="glass" icon={arrowUpOutline} full={false} style={{ flex: 1, color: 'var(--anrix-hero-text)' }} onClick={() => ask(t('wallet.withdrawToBank', 'Withdraw to bank'), (a) => withdrawMut.mutate(a))}>{t('wallet.withdraw', 'Withdraw')}</GradientButton>
            </div>
          </div>
        </Reveal>

        <div style={{ fontWeight: 700, fontSize: 15, margin: '4px 20px 8px', color: 'var(--anrix-text-strong)' }}>{t('wallet.transactions', 'Transactions')}</div>

        {txns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--anrix-text-muted)' }}>
            <IonIcon icon={walletOutline} style={{ fontSize: 44, opacity: 0.4 }} />
            <p style={{ marginTop: 12, fontSize: 14, maxWidth: 300, marginInline: 'auto' }}>
              {t('wallet.noTransactions', 'No transactions yet. Add money to get started — payments will appear here.')}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px 24px' }}>
          {txns.map((t: WalletTxn) => {
            const credit = t.kind_cd === 'credit';
            return (
              <div key={t.txn_id} className="anrix-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: credit ? 'rgba(31,169,113,0.14)' : 'var(--anrix-surface-2)' }}>
                  <IonIcon icon={credit ? arrowDownOutline : arrowUpOutline} style={{ fontSize: 18, color: credit ? 'var(--anrix-success)' : 'var(--anrix-text)' }} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--anrix-text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ttl_tx}</div>
                  <div style={{ fontSize: 12, color: 'var(--anrix-text-muted)' }}>{fmtDate(t.i_ts)}</div>
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: credit ? 'var(--anrix-success)' : 'var(--anrix-text-strong)', flexShrink: 0 }}>
                  {credit ? '+' : '−'}{rupee(t.amt_am)}
                </span>
              </div>
            );
          })}
        </div>
      </AnimatedPage>
    </PageShell>
  );
}
