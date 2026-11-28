import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpRight, Check, ChevronRight, Copy, Share2, X } from 'lucide-react';

export type RewardsTab = 'gifts' | 'points' | 'exchange' | 'referral';

type PointRow = {
  id: string;
  points: number;
  reason: string;
  source: string;
  created_at: string;
};

type ReferralRow = {
  id: string;
  status: 'pending' | 'validated' | 'rejected';
  reward_points: number;
  created_at: string;
  validated_at: string | null;
};

type OfferRow = {
  id: string;
  offer_type: 'flash' | 'surprise';
  title: string;
  description: string;
  cover_path: string | null;
  cover_url?: string;
  benefit_label: string | null;
  price_amount: number | null;
  currency: string;
  conditions: string | null;
  action_label: string | null;
  action_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
};

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

const formatShortDate = (iso: string | null | undefined, isEn: boolean) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
  });
};

interface RewardsHubViewProps {
  initialTab?: RewardsTab;
  unified?: boolean;
  embedded?: boolean;
  forcedMode?: 'points' | 'referral';
}

export const RewardsHubView: React.FC<RewardsHubViewProps> = ({
  embedded = false,
  forcedMode,
}) => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [points, setPoints] = useState<PointRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);

  const [copied, setCopied] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: authData }, offerResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('club_offers')
          .select(
            'id,offer_type,title,description,cover_path,benefit_label,price_amount,currency,conditions,action_label,action_url,starts_at,ends_at,status'
          )
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
      ]);

      if (!offerResult.error) {
        const offersWithCovers = await Promise.all(
          (offerResult.data || []).map(async (offer: OfferRow) => {
            if (!offer.cover_path) return offer;
            const { data: cover } = await supabase.storage
              .from('club-media')
              .createSignedUrl(offer.cover_path, 900);
            return { ...offer, cover_url: cover?.signedUrl || '' };
          })
        );
        setOffers(offersWithCovers);
      }

      if (!authData.user) {
        setIsSignedIn(false);
        setReferralCode('');
        setPoints([]);
        setReferrals([]);
        return;
      }

      setIsSignedIn(true);
      const userId = authData.user.id;

      let { data: profile, error: profileError } = await supabase
        .from('club_member_profiles')
        .select('referral_code')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        const created = await supabase
          .from('club_member_profiles')
          .insert({ user_id: userId })
          .select('referral_code')
          .single();
        if (created.error && created.error.code !== '23505') throw created.error;
        profile = created.data;
        if (!profile) {
          const retry = await supabase
            .from('club_member_profiles')
            .select('referral_code')
            .eq('user_id', userId)
            .single();
          if (retry.error) throw retry.error;
          profile = retry.data;
        }
      }

      setReferralCode(profile?.referral_code || '');

      const [pointResult, referralResult] = await Promise.all([
        supabase
          .from('club_point_transactions')
          .select('id,points,reason,source,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('club_referrals')
          .select('id,status,reward_points,created_at,validated_at')
          .eq('referrer_user_id', userId)
          .order('created_at', { ascending: false }),
      ]);

      if (pointResult.error) throw pointResult.error;
      if (referralResult.error) throw referralResult.error;

      setPoints(pointResult.data || []);
      setReferrals(referralResult.data || []);
    } catch (err: any) {
      setError(
        err?.message ||
          (isEn ? 'Unable to load Gift Points.' : 'Impossible de charger vos Gift Points.')
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  const balance = useMemo(() => points.reduce((sum, row) => sum + row.points, 0), [points]);
  const earned = useMemo(
    () => points.reduce((sum, row) => sum + Math.max(row.points, 0), 0),
    [points]
  );
  const used = useMemo(
    () => Math.abs(points.reduce((sum, row) => sum + Math.min(row.points, 0), 0)),
    [points]
  );

  const pendingReferrals = useMemo(
    () => referrals.filter((item) => item.status === 'pending'),
    [referrals]
  );
  const validatedReferrals = useMemo(
    () => referrals.filter((item) => item.status === 'validated'),
    [referrals]
  );

  const shareUrl =
    referralCode && typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
      : '';

  const visibleHistory = useMemo(
    () => (showAllHistory ? points : points.slice(0, 6)),
    [points, showAllHistory]
  );

  const handleCopy = async () => {
    const value = referralCode || shareUrl;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast(isEn ? 'Code copied' : 'Code copié', 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast(isEn ? 'Unable to copy' : 'Copie impossible', 'error');
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    const text = isEn
      ? `Join LUMARÉEL with my code ${referralCode}`
      : `Rejoins LUMARÉEL avec mon code ${referralCode}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'LUMARÉEL', text, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast(isEn ? 'Invitation link copied' : 'Lien d’invitation copié', 'success');
    } catch {
      showToast(isEn ? 'Unable to share' : 'Partage impossible', 'error');
    }
  };

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = codeInput.trim().toUpperCase();
    if (!cleaned) return;
    setApplying(true);
    try {
      const { error: rpcError } = await supabase.rpc('club_apply_referral_code', {
        p_code: cleaned,
      });
      if (rpcError) throw rpcError;
      setCodeInput('');
      setShowCodeInput(false);
      showToast(isEn ? 'Referral code applied' : 'Code de parrainage enregistré', 'success');
      await load();
    } catch (err: any) {
      showToast(
        err?.message || (isEn ? 'Invalid referral code' : 'Code de parrainage invalide'),
        'error'
      );
    } finally {
      setApplying(false);
    }
  };

  // Surface tokens adapt cleanly when embedded inside the dark Black Card page
  const isDark = embedded;
  const ink = isDark ? 'text-white' : 'text-[#111111]';
  const muted = isDark ? 'text-white/55' : 'text-[#6E6E73]';
  const subtle = isDark ? 'text-white/40' : 'text-[#86868B]';
  const hairline = isDark ? 'border-white/[0.10]' : 'border-black/[0.08]';
  const surfaceSoft = isDark ? 'bg-white/[0.05]' : 'bg-[#F2F2F5]';
  const primaryBtn = isDark
    ? 'bg-white text-black hover:bg-white/90'
    : 'bg-[#111111] text-white hover:bg-black/85';
  const secondaryBtn = isDark
    ? 'bg-white/[0.08] text-white hover:bg-white/[0.14]'
    : 'bg-[#EFEFF4] text-[#111111] hover:bg-[#E5E5EA]';

  const showPointsBlock = !embedded || forcedMode !== 'referral';
  const showReferralBlock = !embedded || forcedMode !== 'points';
  const showOffersBlock = !embedded;
  const showHistoryBlock = !embedded || forcedMode !== 'referral';

  return (
    <div
      className={
        embedded
          ? 'w-full'
          : 'min-h-screen bg-[#FBFBFD] text-[#111111] pt-16 md:pt-12 pb-32 md:pb-24'
      }
    >
      <div className={embedded ? 'space-y-8' : 'mx-auto max-w-[680px] px-5 sm:px-8'}>
        {error && (
          <p className={`mb-6 text-sm ${muted}`}>{error}</p>
        )}

        {/* 1. SOLDE GIFT POINTS */}
        {showPointsBlock && (
          <section className={embedded ? 'pb-6' : 'pt-6 sm:pt-10 pb-10 sm:pb-12'}>
            {!isSignedIn && !loading ? (
              <div className="space-y-5">
                <h1 className={`font-agrandir-extrabold text-3xl sm:text-4xl tracking-tight ${ink}`}>
                  Gift Points
                </h1>
                <p className={`text-[15px] leading-relaxed max-w-md ${muted}`}>
                  {isEn
                    ? 'Sign in to view your Gift Points balance and share your invitation code.'
                    : 'Connectez-vous pour retrouver votre solde de Gift Points et votre code de parrainage.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium transition-colors ${primaryBtn}`}
                >
                  {isEn ? 'Sign in' : 'Se connecter'}
                </button>
              </div>
            ) : (
              <div>
                <p className={`text-[13px] font-medium ${muted}`}>Gift Points</p>
                <div className="mt-2 flex items-baseline gap-3">
                  {loading ? (
                    <div className={`h-11 w-44 rounded-lg animate-pulse ${surfaceSoft}`} />
                  ) : (
                    <h1
                      className={`font-agrandir-extrabold text-[40px] sm:text-[52px] leading-none tracking-tight tabular-nums ${ink}`}
                    >
                      {formatNumber(balance)}
                    </h1>
                  )}
                </div>

                {!loading && (
                  <div className="mt-4 flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => setDetailsOpen(true)}
                      className={`inline-flex items-center gap-1 text-[13px] font-medium transition-opacity hover:opacity-70 ${muted}`}
                    >
                      <span>{isEn ? 'Details & how it works' : 'Comment ça marche'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* 2. PARRAINAGE */}
        {showReferralBlock && isSignedIn && !loading && (
          <section className={`border-t ${hairline} py-9 sm:py-11`}>
            <div className="space-y-5">
              <div>
                <h2 className={`font-agrandir-semibold text-xl sm:text-2xl tracking-tight ${ink}`}>
                  {isEn ? 'Invite a friend. Earn 500 points.' : 'Invite un ami. Gagne 500 points.'}
                </h2>
                {referrals.length > 0 && (
                  <p className={`mt-1.5 text-[13px] ${muted}`}>
                    {isEn
                      ? `${validatedReferrals.length} validated · ${pendingReferrals.length} pending`
                      : `${validatedReferrals.length} validé${validatedReferrals.length > 1 ? 's' : ''} · ${pendingReferrals.length} en attente`}
                  </p>
                )}
              </div>

              {referralCode && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
                  <div className="select-all font-mono text-[22px] sm:text-[24px] tracking-[0.14em] font-medium">
                    <span className={ink}>{referralCode}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${secondaryBtn}`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? (isEn ? 'Copied' : 'Copié') : isEn ? 'Copy' : 'Copier'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${primaryBtn}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Share' : 'Partager'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-1">
                {!showCodeInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCodeInput(true)}
                    className={`text-[13px] transition-opacity hover:opacity-70 ${subtle}`}
                  >
                    {isEn ? 'Have a referral code?' : 'J’ai un code de parrainage'}
                  </button>
                ) : (
                  <form onSubmit={handleApplyCode} className="flex items-center gap-2.5 max-w-sm pt-1">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder={isEn ? 'Enter code' : 'Entrer le code'}
                      autoFocus
                      className={`flex-1 bg-transparent border-b py-1.5 text-sm uppercase tracking-wider outline-none ${hairline} ${ink}`}
                    />
                    <button
                      type="submit"
                      disabled={applying || !codeInput.trim()}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium disabled:opacity-40 transition-colors ${primaryBtn}`}
                    >
                      {applying ? '...' : isEn ? 'Apply' : 'Valider'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCodeInput(false);
                        setCodeInput('');
                      }}
                      aria-label={isEn ? 'Cancel' : 'Annuler'}
                      className={`p-1 ${subtle}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 3. RÉCOMPENSES & SURPRISES */}
        {showOffersBlock && (
          <section className={`border-t ${hairline} py-9 sm:py-11`}>
            <h2 className={`text-[13px] font-medium mb-6 ${muted}`}>
              {isEn ? 'Rewards & Surprises' : 'Récompenses & Surprises'}
            </h2>

            {loading ? (
              <div className={`h-40 w-full rounded-xl animate-pulse ${surfaceSoft}`} />
            ) : offers.length === 0 ? (
              <p className={`text-[15px] ${subtle}`}>
                {isEn
                  ? 'No rewards available right now.'
                  : 'Aucune récompense disponible pour le moment.'}
              </p>
            ) : (
              <div className="space-y-10">
                {offers.map((offer) => {
                  const isSurprise = offer.offer_type === 'surprise';
                  const isRevealed = !isSurprise || Boolean(revealedIds[offer.id]);
                  const endLabel = formatShortDate(offer.ends_at, isEn);

                  return (
                    <article key={offer.id} className="group">
                      {offer.cover_url && (
                        <div className="mb-4 overflow-hidden rounded-xl bg-black/5">
                          <img
                            src={offer.cover_url}
                            alt={offer.title}
                            className="w-full aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                          />
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className={`font-agrandir-semibold text-lg sm:text-xl tracking-tight ${ink}`}>
                            {offer.title}
                          </h3>

                          {isRevealed ? (
                            <>
                              {offer.benefit_label && (
                                <p className={`text-[14px] font-medium ${ink}`}>{offer.benefit_label}</p>
                              )}
                              {offer.description && (
                                <p className={`text-[14px] leading-relaxed max-w-lg ${muted}`}>
                                  {offer.description}
                                </p>
                              )}
                              <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[12px] ${subtle}`}>
                                {offer.price_amount != null && (
                                  <span>
                                    {formatNumber(offer.price_amount)} {offer.currency || 'FCFA'}
                                  </span>
                                )}
                                {endLabel && (
                                  <span>
                                    {isEn ? `Ends ${endLabel}` : `Jusqu’au ${endLabel}`}
                                  </span>
                                )}
                                {offer.conditions && <span>{offer.conditions}</span>}
                              </div>
                            </>
                          ) : (
                            <p className={`text-[14px] ${muted}`}>
                              {isEn ? 'Member surprise' : 'Surprise réservée aux membres'}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0">
                          {isSurprise && !isRevealed ? (
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedIds((prev) => ({ ...prev, [offer.id]: true }))
                              }
                              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${primaryBtn}`}
                            >
                              <span>{isEn ? 'Reveal' : 'Découvrir'}</span>
                            </button>
                          ) : offer.action_url ? (
                            <a
                              href={offer.action_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${primaryBtn}`}
                            >
                              <span>{offer.action_label || (isEn ? 'Open' : 'Profiter')}</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* 4. HISTORIQUE */}
        {showHistoryBlock && isSignedIn && !loading && (
          <section className={`border-t ${hairline} py-9 sm:py-11`}>
            <h2 className={`text-[13px] font-medium mb-4 ${muted}`}>
              {isEn ? 'History' : 'Historique'}
            </h2>

            {points.length === 0 ? (
              <p className={`text-[15px] ${subtle}`}>
                {isEn ? 'No activity yet.' : 'Aucune activité pour le moment.'}
              </p>
            ) : (
              <>
                <ul className={`divide-y ${isDark ? 'divide-white/[0.08]' : 'divide-black/[0.07]'}`}>
                  {visibleHistory.map((row) => {
                    const isPositive = row.points >= 0;
                    return (
                      <li
                        key={row.id}
                        className="flex items-center justify-between gap-4 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className={`text-[14px] sm:text-[15px] truncate ${ink}`}>
                            {row.reason || (isPositive ? 'Gift Points' : isEn ? 'Reward' : 'Utilisation')}
                          </p>
                          <p className={`text-[12px] mt-0.5 ${subtle}`}>
                            {formatShortDate(row.created_at, isEn)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-[14px] sm:text-[15px] font-medium tabular-nums ${
                            isPositive ? ink : muted
                          }`}
                        >
                          {isPositive ? `+${formatNumber(row.points)}` : formatNumber(row.points)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {points.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllHistory((v) => !v)}
                    className={`mt-4 text-[13px] font-medium transition-opacity hover:opacity-70 ${muted}`}
                  >
                    {showAllHistory
                      ? isEn
                        ? 'Show less'
                        : 'Voir moins'
                      : isEn
                        ? `View all (${points.length})`
                        : `Voir tout (${points.length})`}
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </div>

      {/* SHEET / MODAL DÉTAILS & FONCTIONNEMENT */}
      <AnimatePresence>
        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setDetailsOpen(false)}
            className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white text-[#111111] p-6 sm:p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-agrandir-semibold text-lg tracking-tight">
                  Gift Points
                </h3>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="p-1.5 rounded-full text-[#6E6E73] hover:bg-black/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-black/[0.07] mb-6">
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-[#6E6E73]">{isEn ? 'Earned' : 'Points gagnés'}</span>
                  <span className="font-medium tabular-nums">{formatNumber(earned)}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-[#6E6E73]">{isEn ? 'Used' : 'Points utilisés'}</span>
                  <span className="font-medium tabular-nums">{formatNumber(used)}</span>
                </div>
                <div className="flex items-center justify-between py-3 text-sm">
                  <span className="text-[#6E6E73]">
                    {isEn ? 'Validated referrals' : 'Parrainages validés'}
                  </span>
                  <span className="font-medium tabular-nums">{validatedReferrals.length}</span>
                </div>
              </div>

              <div className="space-y-2.5 text-[13px] leading-relaxed text-[#6E6E73]">
                <p>
                  {isEn
                    ? '1 Gift Point equals 1 FCFA toward eligible LUMARÉEL rewards and offers.'
                    : '1 Gift Point correspond à 1 FCFA utilisable sur les récompenses et offres LUMARÉEL.'}
                </p>
                <p>
                  {isEn
                    ? 'Each validated friend invitation credits 500 Gift Points to your balance.'
                    : 'Chaque parrainage validé ajoute 500 Gift Points sur votre solde.'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
