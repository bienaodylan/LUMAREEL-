import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Gift,
  Lock,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetchJson } from '../lib/apiClient';

interface LoyaltyTransaction {
  id: string;
  points: number;
  transactionType: string;
  status: string;
  reason: string;
  source: string;
  createdAt: string;
}

interface LoyaltyReferral {
  id: string;
  refereeName: string;
  refereeEmail: string;
  status: 'pending' | 'validated' | 'rejected';
  rewardPoints: number;
  createdAt: string;
  validatedAt?: string;
}

interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  benefitLabel: string;
  pointsCost: number;
  stockLimit: number | null;
  redeemedCount: number;
  conditions: string;
}

interface LoyaltyRedemption {
  id: string;
  rewardTitle: string;
  pointsSpent: number;
  voucherCode: string;
  status: string;
  createdAt: string;
}

interface LoyaltyCampaign {
  id: string;
  title: string;
  description: string;
  bonusPoints: number;
  multiplier: number;
  endsAt: string | null;
}

interface LoyaltyRule {
  key: string;
  label: string;
  description: string;
  points: number;
}

interface LoyaltyDashboardData {
  profile: { referralCode: string; name: string; email: string };
  balance: number;
  earned: number;
  used: number;
  transactions: LoyaltyTransaction[];
  referrals: LoyaltyReferral[];
  redemptions: LoyaltyRedemption[];
  rewards: LoyaltyReward[];
  activeCampaigns: LoyaltyCampaign[];
  rules: LoyaltyRule[];
}

export type RewardsTab = 'gifts' | 'points' | 'exchange' | 'referral' | 'rewards' | 'referrals' | 'history';

interface RewardsHubViewProps {
  unified?: boolean;
  initialTab?: RewardsTab | string;
}

const mapInitialTab = (tab?: string): 'rewards' | 'referrals' | 'history' => {
  if (tab === 'referral' || tab === 'referrals') return 'referrals';
  if (tab === 'history' || tab === 'points') return 'history';
  return 'rewards';
};

export const RewardsHubView: React.FC<RewardsHubViewProps> = ({ initialTab }) => {
  const { currentUser, setIsAuthModalOpen, language, showToast } = useApp();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LoyaltyDashboardData | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rewards' | 'referrals' | 'history'>(() =>
    mapInitialTab(initialTab)
  );

  const loadDashboard = useCallback(async () => {
    if (!currentUser) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetchJson<LoyaltyDashboardData & { success: boolean }>(
        '/api/member/loyalty'
      );
      if (res?.success) {
        setData(res);
      }
    } catch (err: any) {
      showToast(err?.message || 'Impossible de charger ton solde Gift Points.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const referralCode = data?.profile?.referralCode || '';
  const referralUrl =
    typeof window !== 'undefined' && referralCode
      ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
      : '';

  const handleCopyReferral = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedCode(true);
      showToast(isEn ? 'Referral link copied!' : 'Lien de parrainage copié !', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast(referralUrl, 'info');
    }
  };

  const handleShareReferral = async () => {
    if (!referralUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'LUMARÉEL — Invitation Club',
          text: isEn
            ? `Join LUMARÉEL using my code ${referralCode} and earn welcome Gift Points on your first concert!`
            : `Rejoins LUMARÉEL avec mon code ${referralCode} et profite de l’expérience concerts + Gift Points !`,
          url: referralUrl,
        });
      } else {
        await handleCopyReferral();
      }
    } catch {
      // cancelled
    }
  };

  const handleRedeem = async (reward: LoyaltyReward) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setRedeemingId(reward.id);
    try {
      const res = await apiFetchJson<{
        redemption: LoyaltyRedemption;
        balance: number;
      }>('/api/member/loyalty/redeem', {
        method: 'POST',
        body: JSON.stringify({ rewardId: reward.id }),
      });
      showToast(
        isEn
          ? `Reward unlocked! Code: ${res.redemption.voucherCode}`
          : `Récompense débloquée ! Code : ${res.redemption.voucherCode}`,
        'success'
      );
      await loadDashboard();
    } catch (err: any) {
      showToast(err?.message || 'Impossible de débloquer cette récompense.', 'error');
    } finally {
      setRedeemingId(null);
    }
  };

  const copyVoucher = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedVoucher(code);
      showToast(isEn ? 'Voucher copied!' : 'Code privilège copié !', 'success');
      setTimeout(() => setCopiedVoucher(null), 1800);
    } catch {
      // ignore
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white flex items-center justify-center px-5 py-20 font-agrandir-regular">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center mx-auto">
            <Gift className="w-6 h-6" />
          </div>
          <h1 className="font-agrandir-extrabold text-3xl tracking-tight">
            {isEn ? 'Gift Points & Referrals' : 'Gift Points & Parrainage'}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
            {isEn
              ? 'Sign in to view your real Gift Points balance, invite friends with your unique code, and unlock concert rewards.'
              : 'Connecte-toi pour suivre ton vrai solde Gift Points, parrainer tes amis avec ton lien unique et débloquer tes récompenses.'}
          </p>
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="min-h-[48px] px-7 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer"
          >
            {isEn ? 'Sign in / Sign up' : 'Me connecter'}
          </button>
        </div>
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const earned = data?.earned ?? 0;
  const used = data?.used ?? 0;
  const referrals = data?.referrals || [];
  const validatedReferrals = referrals.filter((r) => r.status === 'validated').length;
  const pendingReferrals = referrals.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white pt-8 sm:pt-12 pb-28 sm:pb-20 px-4 sm:px-6 lg:px-10 font-agrandir-regular transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* SOLDE RÉEL — HÉRO ÉPURÉ */}
        <section className="space-y-6 pb-8 border-b border-black/10 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/45 dark:text-white/45 font-agrandir-semibold">
                GIFT POINTS
              </p>
              <div className="mt-2 flex items-baseline gap-2.5">
                <span className="font-agrandir-extrabold text-5xl sm:text-6xl tracking-tight tabular-nums">
                  {loading ? '—' : balance.toLocaleString('fr-FR')}
                </span>
                <span className="text-sm font-agrandir-semibold text-black/45 dark:text-white/45">
                  GP
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs">
              <div>
                <p className="text-black/45 dark:text-white/45">{isEn ? 'Earned' : 'Gagnés'}</p>
                <p className="mt-0.5 font-agrandir-extrabold text-base tabular-nums">
                  +{earned.toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="h-7 w-px bg-black/10 dark:bg-white/10" />
              <div>
                <p className="text-black/45 dark:text-white/45">{isEn ? 'Used' : 'Utilisés'}</p>
                <p className="mt-0.5 font-agrandir-extrabold text-base tabular-nums">
                  {used.toLocaleString('fr-FR')}
                </p>
              </div>
              <div className="h-7 w-px bg-black/10 dark:bg-white/10" />
              <div>
                <p className="text-black/45 dark:text-white/45">{isEn ? 'Referrals' : 'Parrainages'}</p>
                <p className="mt-0.5 font-agrandir-extrabold text-base tabular-nums">
                  {validatedReferrals}
                </p>
              </div>
            </div>
          </div>

          {/* CARTE PARRAINAGE AUTOMATIQUE */}
          {referralCode && (
            <div className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-agrandir-extrabold">
                  {isEn ? 'Invite your friends automatically' : 'Partage ton lien de parrainage'}
                </p>
                <p className="text-xs text-black/55 dark:text-white/55">
                  {isEn
                    ? 'Your Gift Points are credited automatically once your friend completes their first ticket order or Black Card.'
                    : 'Tes Gift Points sont crédités automatiquement dès le premier billet ou la Black Card validée par ton ami.'}
                </p>
                <p className="pt-1 font-mono text-xs text-black/80 dark:text-white/85 truncate">
                  {referralCode}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => void handleCopyReferral()}
                  className="min-h-[40px] px-4 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? (isEn ? 'Copied' : 'Copié') : isEn ? 'Copy link' : 'Copier le lien'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareReferral()}
                  className="w-10 h-10 rounded-full bg-black/[0.08] dark:bg-white/10 flex items-center justify-center cursor-pointer"
                  aria-label={isEn ? 'Share' : 'Partager'}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Campagne active (si configurée par l'Admin) */}
          {data?.activeCampaigns && data.activeCampaigns.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-black/10 dark:border-white/12 px-4 py-3 text-xs">
              <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-black/70 dark:text-white/75" />
              <div className="space-y-0.5">
                <p className="font-agrandir-extrabold">{data.activeCampaigns[0].title}</p>
                <p className="text-black/55 dark:text-white/55">
                  {data.activeCampaigns[0].description}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* NAVIGATION INTERNE SIMPLE */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'rewards' as const, label: isEn ? 'Rewards' : 'Récompenses' },
            {
              id: 'referrals' as const,
              label: `${isEn ? 'Referrals' : 'Parrainages'} (${referrals.length})`,
            },
            {
              id: 'history' as const,
              label: `${isEn ? 'History' : 'Historique'} (${data?.transactions.length || 0})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 min-h-[38px] px-4 rounded-full text-xs transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                  : 'bg-black/[0.05] dark:bg-white/[0.07] text-black/65 dark:text-white/65 font-agrandir-semibold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ONGLET 1 : RÉCOMPENSES + BONS DÉBLOQUÉS + RÈGLES DE GAIN */}
        {activeTab === 'rewards' && (
          <div className="space-y-10">
            {/* Mes codes débloqués */}
            {data?.redemptions && data.redemptions.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-[0.18em] text-black/45 dark:text-white/45 font-agrandir-semibold">
                  {isEn ? 'Your unlocked rewards' : 'Tes récompenses débloquées'}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.redemptions.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-black/10 dark:border-white/12 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-agrandir-extrabold truncate">{item.rewardTitle}</p>
                        <p className="mt-1 font-mono text-xs text-black/70 dark:text-white/80">
                          {item.voucherCode}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyVoucher(item.voucherCode)}
                        className="shrink-0 min-h-[34px] px-3 rounded-full bg-black/[0.06] dark:bg-white/10 text-[11px] font-agrandir-semibold cursor-pointer"
                      >
                        {copiedVoucher === item.voucherCode ? 'Copié' : 'Copier'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Catalogue de récompenses déblocables */}
            <section className="space-y-4">
              <div className="divide-y divide-black/10 dark:divide-white/10 border-t border-b border-black/10 dark:border-white/10">
                {(data?.rewards || []).map((reward) => {
                  const canAfford = balance >= reward.pointsCost;
                  const outOfStock =
                    reward.stockLimit !== null && reward.redeemedCount >= reward.stockLimit;
                  const missing = Math.max(0, reward.pointsCost - balance);

                  return (
                    <div
                      key={reward.id}
                      className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-black/45 dark:text-white/45" />
                          <h3 className="font-agrandir-extrabold text-base">{reward.title}</h3>
                        </div>
                        <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 leading-relaxed">
                          {reward.description}
                        </p>
                        {reward.conditions && (
                          <p className="text-[11px] text-black/45 dark:text-white/45">
                            {reward.conditions}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <p className="font-agrandir-extrabold text-sm tabular-nums">
                            {reward.pointsCost.toLocaleString('fr-FR')} GP
                          </p>
                          {!canAfford && !outOfStock && (
                            <p className="text-[11px] text-black/45 dark:text-white/45 tabular-nums">
                              {isEn ? `${missing} GP left` : `Encore ${missing} GP`}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford || outOfStock || redeemingId === reward.id}
                          onClick={() => void handleRedeem(reward)}
                          className={`min-h-[40px] px-4 rounded-full text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                            canAfford && !outOfStock
                              ? 'bg-[#111111] text-white dark:bg-white dark:text-black hover:opacity-85'
                              : 'bg-black/[0.06] dark:bg-white/[0.08] text-black/40 dark:text-white/40 cursor-not-allowed'
                          }`}
                        >
                          {!canAfford && <Lock className="w-3.5 h-3.5" />}
                          <span>
                            {redeemingId === reward.id
                              ? '...'
                              : outOfStock
                                ? isEn
                                  ? 'Sold out'
                                  : 'Épuisé'
                                : isEn
                                  ? 'Unlock'
                                  : 'Débloquer'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Comment gagner automatiquement */}
            {data?.rules && data.rules.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs uppercase tracking-[0.18em] text-black/45 dark:text-white/45 font-agrandir-semibold">
                  {isEn ? 'Automatic earning rules' : 'Comment gagner des Gift Points'}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {data.rules.map((rule) => (
                    <div
                      key={rule.key}
                      className="rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] p-4 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-agrandir-extrabold">{rule.label}</p>
                        <p className="text-[11px] text-black/55 dark:text-white/55 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>
                      <span className="shrink-0 font-agrandir-extrabold text-xs tabular-nums">
                        +{rule.points} GP
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* ONGLET 2 : PARRAINAGES */}
        {activeTab === 'referrals' && (
          <section className="space-y-5">
            <div className="flex items-center gap-6 text-xs">
              <span>
                <strong className="font-agrandir-extrabold text-base tabular-nums">
                  {referrals.length}
                </strong>{' '}
                <span className="text-black/55 dark:text-white/55">
                  {isEn ? 'invited' : 'invité(s)'}
                </span>
              </span>
              <span>
                <strong className="font-agrandir-extrabold text-base tabular-nums">
                  {validatedReferrals}
                </strong>{' '}
                <span className="text-black/55 dark:text-white/55">
                  {isEn ? 'validated' : 'validé(s)'}
                </span>
              </span>
              <span>
                <strong className="font-agrandir-extrabold text-base tabular-nums">
                  {pendingReferrals}
                </strong>{' '}
                <span className="text-black/55 dark:text-white/55">
                  {isEn ? 'pending' : 'en attente'}
                </span>
              </span>
            </div>

            {referrals.length === 0 ? (
              <div className="py-14 text-center space-y-2 border-t border-black/10 dark:border-white/10">
                <Users className="w-6 h-6 mx-auto text-black/35 dark:text-white/35" />
                <p className="text-sm text-black/55 dark:text-white/55">
                  {isEn
                    ? 'No referrals yet. Share your link to start earning automatically.'
                    : 'Aucun parrainage pour le moment. Partage ton lien pour gagner tes premiers Gift Points.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10 border-t border-b border-black/10 dark:border-white/10">
                {referrals.map((r) => (
                  <div key={r.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-agrandir-extrabold truncate">{r.refereeName}</p>
                      <p className="text-[11px] text-black/50 dark:text-white/50">
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')} ·{' '}
                        {r.status === 'validated'
                          ? isEn
                            ? 'Validated automatically'
                            : 'Validé automatiquement'
                          : r.status === 'rejected'
                            ? isEn
                              ? 'Not eligible'
                              : 'Refusé'
                            : isEn
                              ? 'Waiting for first order'
                              : 'En attente du premier achat'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-agrandir-extrabold tabular-nums">
                        {r.status === 'validated' ? `+${r.rewardPoints} GP` : `${r.rewardPoints} GP`}
                      </p>
                      <span
                        className={`text-[10px] font-agrandir-semibold ${
                          r.status === 'validated'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : r.status === 'rejected'
                              ? 'text-red-500'
                              : 'text-black/45 dark:text-white/45'
                        }`}
                      >
                        {r.status === 'validated'
                          ? 'Validé'
                          : r.status === 'rejected'
                            ? 'Refusé'
                            : 'En attente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ONGLET 3 : HISTORIQUE TRANSACTIONNEL COMPLET */}
        {activeTab === 'history' && (
          <section>
            {!data?.transactions.length ? (
              <div className="py-14 text-center text-sm text-black/55 dark:text-white/55 border-t border-black/10 dark:border-white/10">
                {isEn
                  ? 'No Gift Points transactions yet.'
                  : 'Aucune transaction Gift Points enregistrée pour le moment.'}
              </div>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10 border-t border-b border-black/10 dark:border-white/10">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-agrandir-semibold truncate">{tx.reason}</p>
                      <p className="text-[11px] text-black/45 dark:text-white/45">
                        {new Date(tx.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {tx.status === 'confirmed' ? 'Confirmé' : tx.status}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-agrandir-extrabold text-sm tabular-nums ${
                        tx.points > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[#111111] dark:text-white'
                      }`}
                    >
                      {tx.points > 0 ? `+${tx.points}` : tx.points} GP
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
