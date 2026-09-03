import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useIonToast } from '@ionic/react';
import { BrandLoader } from '@components/feedback/BrandLoader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageShell } from '@components/layout/PageShell';
import { AnimatedPage } from '@components/motion';
import { Segmented } from '@components/data/Segmented';
import { Avatar, Badge, GradientButton } from '@design/primitives';
import { lendingApi } from '@services/api/lendingApi';

const TONE: Record<string, 'warning' | 'success' | 'danger'> = { pending: 'warning', approved: 'success', disbursed: 'success', rejected: 'danger' };

export function ApplicationsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const qc = useQueryClient();
  const [toast] = useIonToast();
  const { data: all = [], isLoading } = useQuery({ queryKey: ['lending', 'review-queue'], queryFn: () => lendingApi.reviewQueue() });

  const review = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => lendingApi.review(id, status),
    onSuccess: (_d, v) => { void toast({ message: `Application ${v.status} ✓`, duration: 1400, color: v.status === 'approved' ? 'success' : 'medium', position: 'top' }); qc.invalidateQueries({ queryKey: ['lending', 'review-queue'] }); },
    onError: (e: any) => toast({ message: e.message || 'Failed', duration: 1800, color: 'danger', position: 'top' }),
  });

  const list = all.filter((a: any) => (tab === 'approved' ? a.sts_cd === 'approved' || a.sts_cd === 'disbursed' : a.sts_cd === tab));

  return (
    <PageShell title={t('lend.loanApplications', 'Loan Applications')}>
      <AnimatedPage>
        <Segmented value={tab} onChange={setTab}
          options={[{ key: 'pending', label: t('lend.pending', 'Pending') }, { key: 'approved', label: t('lend.approved', 'Approved') }, { key: 'rejected', label: t('lend.rejected', 'Rejected') }]} />

        {isLoading && <BrandLoader />}
        {!isLoading && list.length === 0 && <div style={{ textAlign: 'center', padding: 56, color: 'var(--anrix-text-muted)' }}>{t('lend.nothingHere', 'Nothing here.')}</div>}

        {list.map((a: any) => (
          <div key={a.aplctn_id} className="anrix-card" style={{ margin: '0 16px 14px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar name={a.aplcnt_nm || 'Applicant'} size={46} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{a.aplcnt_nm}</span>
                  <Badge tone={TONE[a.sts_cd] || 'neutral'}>{a.sts_cd}</Badge>
                </div>
                <div className="anrix-muted" style={{ fontSize: 13 }}>{a.product_nm}{a.purpose_tx ? ` · ${a.purpose_tx}` : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 13, flexWrap: 'wrap' }}>
              {a.amt_am != null && <span><span className="anrix-muted">{t('lend.amount', 'Amount')} </span><strong>₹{Number(a.amt_am).toLocaleString('en-IN')}</strong></span>}
              {a.tenure_tx && <span><span className="anrix-muted">{t('lend.tenure', 'Tenure')} </span><strong>{a.tenure_tx}</strong></span>}
              {a.rtng_nm != null && <span><span className="anrix-muted">{t('lend.rating', 'Rating')} </span><strong style={{ color: 'var(--anrix-success)' }}>★{Number(a.rtng_nm).toFixed(1)}</strong></span>}
            </div>
            {a.sts_cd === 'pending' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <GradientButton variant="outline" full style={{ flex: 1 }} onClick={() => review.mutate({ id: a.aplctn_id, status: 'rejected' })}>{t('lend.reject', 'Reject')}</GradientButton>
                <GradientButton full style={{ flex: 1 }} onClick={() => review.mutate({ id: a.aplctn_id, status: 'approved' })}>{t('lend.approve', 'Approve')}</GradientButton>
              </div>
            )}
          </div>
        ))}
      </AnimatedPage>
    </PageShell>
  );
}
