import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ClubSpaceNav } from './club/ClubSpaceNav';
import {
  ArrowUpRight,
  CalendarClock,
  Check,
  Copy,
  Gift,
  History,
  Share2,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';

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

type ActivityFilter = 'all' | 'points' | 'referrals' | 'redeemed';

const formatNumber = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

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
  const { currentUser, setIsAuthModalOpen, setCurrentPage, showToast, language } = useApp();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [points, setPoints] = useState<PointRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [copiedKey, setCopiedKey] = useState<'code' | 'link' | null>(null);
  const [applying, setApplying] = useState(false);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

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
          (isEn ? 'Unable to load your Club space.' : 'Impossible de charger votre espace Club.')
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
  const redeemedRows = useMemo(() => points.filter((row) => row.points < 0), [points]);

  const pendingReferrals = useMemo(
    () => referrals.filter((item) => item.status === 'pending'),
    [referrals]
  );
  const validatedReferrals = useMemo(
    () => referrals.filter((item) => item.status === 'validated'),
    [referrals]
  );
  const pendingPoints = useMemo(
    () => pendingReferrals.reduce((sum, item) => sum + item.reward_points, 0),
    [pendingReferrals]
  );
  const referralEarnedFcfa = useMemo(
    () => validatedReferrals.reduce((sum, item) => sum + item.reward_points, 0),
    [validatedReferrals]
  );

  const shareUrl =
    referralCode && typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}`
      : '';

  const surpriseOffers = useMemo(
    () => offers.filter((offer) => offer.offer_type === 'surprise'),
    [offers]
  );
  const flashOffers = useMemo(
    () => offers.filter((offer) => offer.offer_type === 'flash'),
    [offers]
  );

  const copyValue = async (value: string, key: 'code' | 'link', message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      showToast(message, 'success');
      window.setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      showToast(
        isEn ? 'Copy is unavailable on this device.' : 'Copie indisponible sur cet appareil.',
        'error'
      );
    }
  };

  const shareInvite = async () => {
    if (!shareUrl) return;
    const payload = {
      title: 'LUMARÉEL',
      text: isEn
        ? 'Discover LUMARÉEL — use my invitation link.'
        : 'Découvrez LUMARÉEL — utilisez mon lien d’invitation.',
      url: shareUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user cancelled share sheet
      }
    }
    await copyValue(
      shareUrl,
      'link',
      isEn ? 'Invitation link copied.' : 'Lien d’invitation copié.'
    );
  };

  const applyReferralCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      setIsAuthModalOpen(true);
      return;
    }
    const normalized = codeInput.trim().toUpperCase();
    if (normalized.length < 5) {
      showToast(
        isEn ? 'Please enter a valid invitation code.' : 'Veuillez saisir un code d’invitation valide.',
        'error'
      );
      return;
    }
    setApplying(true);
    const { error: rpcError } = await supabase.rpc('club_apply_referral_code', {
      p_code: normalized,
    });
    setApplying(false);

    if (rpcError) {
      const msg = rpcError.message.includes('REFERRAL_ALREADY_APPLIED')
        ? isEn
          ? 'A referral code has already been applied to this account.'
          : 'Un code de parrainage a déjà été appliqué à ce compte.'
        : rpcError.message.includes('SELF_REFERRAL_NOT_ALLOWED')
          ? isEn
            ? 'You cannot use your own referral code.'
            : 'Vous ne pouvez pas utiliser votre propre code de parrainage.'
          : rpcError.message.includes('REFERRAL_CODE_NOT_FOUND')
            ? isEn
              ? 'This referral code was not found.'
              : 'Ce code de parrainage est introuvable.'
            : isEn
              ? 'This referral code could not be applied.'
              : 'Ce code de parrainage ne peut pas être appliqué.';
      showToast(msg, 'error');
      return;
    }

    setCodeInput('');
    showToast(
      isEn
        ? 'Invitation recorded. The 500 FCFA Gift Points reward is credited after a qualifying purchase.'
        : 'Parrainage enregistré. La récompense de 500 FCFA en Gift Points sera créditée après un achat qualifiant.',
      'success'
    );
    await load();
  };

  const getOfferStatus = (offer: OfferRow) => {
    const now = Date.now();
    if (offer.ends_at && new Date(offer.ends_at).getTime() < now) {
      return isEn ? 'Ended' : 'Terminée';
    }
    if (offer.starts_at && new Date(offer.starts_at).getTime() > now) {
      return isEn ? 'Upcoming' : 'Bientôt';
    }
    return isEn ? 'Available' : 'Disponible';
  };

  const isOfferActive = (offer: OfferRow) => {
    const now = Date.now();
    return (
      (!offer.starts_at || new Date(offer.starts_at).getTime() <= now) &&
      (!offer.ends_at || new Date(offer.ends_at).getTime() >= now)
    );
  };

  const unifiedTimeline = useMemo(() => {
    const pointEvents = points.map((row) => ({
      id: `pt-${row.id}`,
      kind: row.points < 0 ? ('redeemed' as const) : ('points' as const),
      title: row.reason,
      subtitle:
        row.source === 'referral'
          ? isEn
            ? 'Validated referral'
            : 'Parrainage validé'
          : row.source === 'ticket_purchase'
            ? isEn
              ? 'Ticket purchase'
              : 'Achat de billets'
            : row.source === 'concert_attendance'
              ? isEn
                ? 'Confirmed attendance'
                : 'Présence confirmée'
              : row.source === 'black_card_subscription'
                ? 'LUMARÉEL Black Card'
                : isEn
                  ? 'Club benefit'
                  : 'Avantage Club',
      amountLabel: `${row.points > 0 ? '+' : ''}${formatNumber(row.points)} GP`,
      isPositive: row.points > 0,
      date: row.created_at,
    }));

    const referralEvents = referrals.map((ref) => ({
      id: `ref-${ref.id}`,
      kind: 'referrals' as const,
      title:
        ref.status === 'validated'
          ? isEn
            ? 'Referral validated'
            : 'Invitation validée'
          : ref.status === 'rejected'
            ? isEn
              ? 'Referral declined'
              : 'Invitation non retenue'
            : isEn
              ? 'Invitation awaiting qualifying purchase'
              : 'Invitation en attente d’achat qualifiant',
      subtitle:
        ref.status === 'validated'
          ? isEn
            ? '500 FCFA credited in Gift Points'
            : '500 FCFA crédités en Gift Points'
          : ref.status === 'pending'
            ? isEn
              ? 'Pending verification'
              : 'Validation automatique après achat'
            : isEn
              ? 'Did not meet program rules'
              : 'Conditions du programme non réunies',
      amountLabel:
        ref.status === 'validated'
          ? `+${formatNumber(ref.reward_points)} F`
          : ref.status === 'pending'
            ? `${formatNumber(ref.reward_points)} F`
            : '—',
      isPositive: ref.status === 'validated',
      date: ref.validated_at || ref.created_at,
    }));

    return [...pointEvents, ...referralEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [points, referrals, isEn]);

  const filteredTimeline = useMemo(() => {
    if (activityFilter === 'all') return unifiedTimeline;
    return unifiedTimeline.filter((entry) => entry.kind === activityFilter);
  }, [unifiedTimeline, activityFilter]);

  const showPointsBlock = !forcedMode || forcedMode === 'points';
  const showReferralBlock = !forcedMode || forcedMode === 'referral';
  const showOffersAndHistory = !forcedMode;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={`w-full text-white bg-black ${
        embedded ? 'py-2' : 'min-h-screen max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-3 sm:pt-8 pb-20'
      }`}
    >
      {!embedded && <ClubSpaceNav active="rewards" className="mb-8 sm:mb-12" />}

      {/* A. PRÉSENTATION */}
      {!embedded && (
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="pb-9 sm:pb-12 border-b border-white/10"
        >
          <p className="text-[10px] uppercase tracking-[0.26em] text-neutral-500">
            LUMARÉEL CLUB · {isEn ? 'REWARDS & INVITATIONS' : 'GIFT POINTS & PARRAINAGE'}
          </p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.25rem,7.2vw,4.9rem)] font-agrandir-extrabold leading-[0.95] tracking-[-0.03em] text-white">
            {isEn ? 'Every invitation can bring something back.' : 'Chaque invitation peut rapporter.'}
          </h1>
          <p className="mt-5 max-w-xl text-sm sm:text-base leading-7 text-neutral-400">
            {isEn
              ? 'Introduce friends to LUMARÉEL, enjoy member benefits and discover the surprises waiting for you.'
              : 'Faites découvrir LUMARÉEL, profitez d’avantages et découvrez les surprises qui vous attendent.'}
          </p>

          <div className="mt-7 flex items-center gap-5 overflow-x-auto scrollbar-hide text-[11px] uppercase tracking-[0.14em] text-neutral-500">
            {[
              { id: 'gp-points', label: 'Gift Points' },
              { id: 'gp-parrainage', label: isEn ? 'Referrals' : 'Parrainage' },
              { id: 'gp-surprises', label: 'Surprises' },
              { id: 'gp-flash', label: isEn ? 'Flash Sales' : 'Vente Flash' },
              { id: 'gp-historique', label: isEn ? 'History' : 'Historique' },
            ].map((anchor) => (
              <button
                key={anchor.id}
                type="button"
                onClick={() => scrollToSection(anchor.id)}
                className="shrink-0 py-1 hover:text-white transition-colors cursor-pointer"
              >
                {anchor.label}
              </button>
            ))}
          </div>
        </motion.header>
      )}

      {error && (
        <div
          role="alert"
          className="my-6 border border-white/15 bg-[#0a0a0a] px-5 py-4 text-xs sm:text-sm text-neutral-300 flex items-center justify-between gap-4"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="underline underline-offset-4 text-white shrink-0 cursor-pointer"
          >
            {isEn ? 'Retry' : 'Réessayer'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 space-y-6">
          <div className="h-28 w-full lum-skeleton" />
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="h-44 lum-skeleton" />
            <div className="h-44 lum-skeleton" />
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {/* B. GIFT POINTS */}
          {showPointsBlock && (
            <section id="gp-points" className="py-10 sm:py-14 scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    01 · GIFT POINTS
                  </p>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold tracking-tight">
                    {isEn ? 'Your balance & rewards' : 'Votre solde & vos récompenses'}
                  </h2>
                </div>
                {isSignedIn && (
                  <p className="text-xs text-neutral-500">
                    {isEn ? '1 Gift Point = 1 FCFA value' : '1 Gift Point = 1 FCFA de valeur'}
                  </p>
                )}
              </div>

              {!isSignedIn ? (
                <div className="border border-white/12 bg-[#080808] p-6 sm:p-9 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="max-w-lg">
                    <p className="text-base sm:text-lg font-agrandir-extrabold text-white">
                      {isEn
                        ? 'Connect your LUMARÉEL account'
                        : 'Accédez à votre solde de Gift Points'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">
                      {isEn
                        ? 'Sign in to view your real Gift Points balance, personal invitation code and member history.'
                        : 'Connectez-vous pour consulter votre solde réel, votre code de parrainage personnel et votre historique.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="min-h-12 px-7 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.12em] hover:bg-neutral-200 transition-colors cursor-pointer shrink-0"
                  >
                    {isEn ? 'Sign in' : 'Se connecter'}
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 border-y border-white/12 divide-x divide-y lg:divide-y-0 divide-white/10">
                    <div className="py-6 pr-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {isEn ? 'Available balance' : 'Solde disponible'}
                      </p>
                      <p className="mt-3 text-3xl sm:text-4xl font-agrandir-extrabold tabular-nums text-white">
                        {formatNumber(balance)}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {formatNumber(balance)} FCFA
                      </p>
                    </div>
                    <div className="py-6 px-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {isEn ? 'Points earned' : 'Points gagnés'}
                      </p>
                      <p className="mt-3 text-2xl sm:text-3xl font-agrandir-semibold tabular-nums text-neutral-200">
                        {formatNumber(earned)}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-600">
                        {isEn ? 'Cumulative' : 'Cumulés'}
                      </p>
                    </div>
                    <div className="py-6 pr-4 lg:px-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {isEn ? 'Points used' : 'Points utilisés'}
                      </p>
                      <p className="mt-3 text-2xl sm:text-3xl font-agrandir-semibold tabular-nums text-neutral-300">
                        {formatNumber(used)}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-600">
                        {redeemedRows.length}{' '}
                        {isEn ? 'reward(s)' : 'récompense(s)'}
                      </p>
                    </div>
                    <div className="py-6 pl-4">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {isEn ? 'Pending' : 'En attente'}
                      </p>
                      <p className="mt-3 text-2xl sm:text-3xl font-agrandir-semibold tabular-nums text-neutral-400">
                        {formatNumber(pendingPoints)}
                      </p>
                      <p className="mt-1 text-[11px] text-neutral-600">
                        {pendingReferrals.length}{' '}
                        {isEn ? 'invitation(s)' : 'invitation(s)'}
                      </p>
                    </div>
                  </div>

                  {/* État vide élégant si 0 point */}
                  {balance === 0 && points.length === 0 ? (
                    <div className="border border-white/10 bg-[#080808] p-6 sm:p-9">
                      <div className="max-w-2xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                          {isEn ? 'GETTING STARTED' : 'COMMENCER À CUMULER'}
                        </p>
                        <h3 className="mt-3 text-xl sm:text-2xl font-agrandir-extrabold text-white">
                          {isEn
                            ? 'You do not have any Gift Points yet.'
                            : 'Vous n’avez pas encore de Gift Points.'}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-neutral-400">
                          {isEn
                            ? 'Your Gift Points accumulate automatically with your real activity on LUMARÉEL: ticket bookings, confirmed concert attendance, LUMARÉEL Black Card membership, and validated friend referrals (500 FCFA per friend).'
                            : 'Vos Gift Points se cumulent automatiquement avec votre activité réelle sur LUMARÉEL : achats de billets, présence validée aux événements, adhésion LUMARÉEL Black Card et parrainages validés (500 FCFA par ami).'}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => scrollToSection('gp-parrainage')}
                            className="min-h-11 px-5 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.1em] hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            {isEn ? 'Invite a friend' : 'Inviter un ami'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrentPage('discover')}
                            className="min-h-11 px-5 border border-white/20 text-white text-xs font-agrandir-semibold uppercase tracking-[0.1em] hover:border-white transition-colors cursor-pointer"
                          >
                            {isEn ? 'Explore events' : 'Découvrir les événements'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border border-white/10 bg-[#080808] p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            {isEn ? 'USING YOUR POINTS' : 'UTILISER VOS GIFT POINTS'}
                          </p>
                          <Ticket size={16} className="text-neutral-500" />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-neutral-300">
                          {isEn
                            ? 'Your available balance can be applied to eligible LUMARÉEL member advantages, exclusive drops and upcoming ticketing benefits.'
                            : 'Votre solde disponible peut être mobilisé sur les avantages membres LUMARÉEL, les privilèges du Club et les offres éligibles.'}
                        </p>
                      </div>

                      <div className="border border-white/10 bg-[#080808] p-5 sm:p-6">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            {isEn ? 'REDEEMED REWARDS' : 'RÉCOMPENSES OBTENUES'}
                          </p>
                          <Gift size={16} className="text-neutral-500" />
                        </div>
                        {redeemedRows.length > 0 ? (
                          <ul className="mt-3 divide-y divide-white/10">
                            {redeemedRows.slice(0, 3).map((item) => (
                              <li
                                key={item.id}
                                className="py-2.5 flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="text-neutral-200 truncate">{item.reason}</span>
                                <span className="text-neutral-400 tabular-nums shrink-0">
                                  {formatNumber(Math.abs(item.points))} GP
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm leading-6 text-neutral-500">
                            {isEn
                              ? 'No points have been spent yet. Your redeemed benefits will appear here.'
                              : 'Aucun point utilisé pour le moment. Vos récompenses débloquées apparaîtront ici.'}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* C. PARRAINAGE */}
          {showReferralBlock && (
            <section id="gp-parrainage" className="py-10 sm:py-14 scroll-mt-20">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
                <div className="lg:col-span-5 space-y-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      02 · {isEn ? 'REFERRALS' : 'PARRAINAGE'}
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold tracking-tight">
                      {isEn ? 'Invite your circle.' : 'Invitez votre entourage.'}
                    </h2>
                  </div>
                  <p className="text-sm leading-7 text-neutral-400">
                    {isEn
                      ? 'Receive 500 FCFA in Gift Points for each referred friend whose participation is validated by a qualifying purchase.'
                      : 'Recevez 500 FCFA en Gift Points pour chaque ami parrainé et validé conformément aux conditions du programme.'}
                  </p>

                  <div className="pt-2 space-y-2.5 text-xs text-neutral-500 border-t border-white/10">
                    <div className="flex items-start gap-2.5">
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-neutral-400" />
                      <span>
                        {isEn
                          ? 'Validation occurs automatically upon a qualifying paid order. Self-referrals and duplicates are blocked.'
                          : 'Validation automatique après un achat qualifiant. Les auto-parrainages et doublons sont bloqués.'}
                      </span>
                    </div>
                  </div>

                  {isSignedIn && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 pt-3">
                      <div className="border-t border-white/15 pt-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          {isEn ? 'Invited' : 'Invités'}
                        </p>
                        <p className="mt-1.5 text-xl font-agrandir-extrabold tabular-nums">
                          {referrals.length}
                        </p>
                      </div>
                      <div className="border-t border-white/15 pt-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          {isEn ? 'Pending' : 'En attente'}
                        </p>
                        <p className="mt-1.5 text-xl font-agrandir-extrabold tabular-nums text-neutral-300">
                          {pendingReferrals.length}
                        </p>
                      </div>
                      <div className="border-t border-white/15 pt-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          {isEn ? 'Validated' : 'Validés'}
                        </p>
                        <p className="mt-1.5 text-xl font-agrandir-extrabold tabular-nums">
                          {validatedReferrals.length}
                        </p>
                      </div>
                      <div className="border-t border-white/15 pt-3">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                          {isEn ? 'Rewards earned' : 'Gains validés'}
                        </p>
                        <p className="mt-1.5 text-xl font-agrandir-extrabold tabular-nums">
                          {formatNumber(referralEarnedFcfa)}{' '}
                          <span className="text-xs font-normal text-neutral-500">F</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 space-y-6">
                  {isSignedIn && referralCode ? (
                    <>
                      <div className="border border-white/15 bg-[#090909] p-6 sm:p-8">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                          {isEn ? 'YOUR PERSONAL CODE' : 'VOTRE CODE PERSONNEL'}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-4 pb-5 border-b border-white/10">
                          <p className="min-w-0 break-all font-mono text-2xl sm:text-3xl font-bold tracking-[0.1em] text-white">
                            {referralCode}
                          </p>
                          <button
                            type="button"
                            aria-label={isEn ? 'Copy code' : 'Copier le code'}
                            onClick={() =>
                              void copyValue(
                                referralCode,
                                'code',
                                isEn ? 'Referral code copied.' : 'Code de parrainage copié.'
                              )
                            }
                            className="h-11 w-11 shrink-0 border border-white/20 hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                          >
                            {copiedKey === 'code' ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                        </div>

                        <p className="mt-4 text-[11px] text-neutral-500 truncate">{shareUrl}</p>

                        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              void copyValue(
                                shareUrl,
                                'link',
                                isEn ? 'Invitation link copied.' : 'Lien d’invitation copié.'
                              )
                            }
                            className="min-h-12 flex-1 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.1em] inline-flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            {copiedKey === 'link' ? <Check size={15} /> : <Copy size={15} />}
                            {isEn ? 'Copy invitation link' : 'Copier mon lien'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void shareInvite()}
                            className="min-h-12 px-6 border border-white/20 hover:border-white text-white text-xs font-agrandir-semibold uppercase tracking-[0.1em] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
                          >
                            <Share2 size={15} />
                            {isEn ? 'Share' : 'Partager'}
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-5">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 mb-3">
                          {isEn ? 'INVITED BY A MEMBER?' : 'INVITÉ PAR UN MEMBRE ?'}
                        </p>
                        <form onSubmit={applyReferralCode} className="flex flex-col sm:flex-row gap-2.5">
                          <input
                            value={codeInput}
                            onChange={(e) => setCodeInput(e.target.value)}
                            maxLength={32}
                            placeholder={
                              isEn ? 'Enter a friend’s referral code' : 'Saisir un code de parrainage'
                            }
                            className="min-h-12 min-w-0 flex-1 bg-transparent border border-white/20 px-4 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={applying || !codeInput.trim()}
                            className="min-h-12 px-6 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.1em] disabled:opacity-35 hover:bg-neutral-200 transition-colors cursor-pointer"
                          >
                            {applying ? '…' : isEn ? 'Apply' : 'Valider le code'}
                          </button>
                        </form>
                      </div>
                    </>
                  ) : (
                    <div className="border border-white/12 bg-[#080808] p-6 sm:p-8">
                      <Users size={20} className="text-neutral-500" />
                      <h3 className="mt-4 text-lg font-agrandir-extrabold">
                        {isEn
                          ? 'Generate your personal invitation link'
                          : 'Retrouvez votre code d’invitation personnel'}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">
                        {isEn
                          ? 'Sign in to obtain your unique referral code, track pending and validated invitations, and earn 500 FCFA in Gift Points per validated friend.'
                          : 'Connectez-vous pour obtenir votre code personnel, suivre vos invitations en attente ou validées et recevoir 500 FCFA en Gift Points par ami validé.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="mt-5 min-h-11 px-6 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.1em] cursor-pointer"
                      >
                        {isEn ? 'Sign in' : 'Se connecter'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* D. SURPRISES */}
          {showOffersAndHistory && (
            <section id="gp-surprises" className="py-10 sm:py-14 scroll-mt-20">
              <div className="flex items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    03 · {isEn ? 'MEMBER PRIVILEGES' : 'PRIVILÈGES DU CLUB'}
                  </p>
                  <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold tracking-tight">
                    {isEn ? 'Surprises are waiting for you.' : 'Des surprises vous attendent.'}
                  </h2>
                </div>
                <Sparkles size={20} className="text-neutral-600 shrink-0" />
              </div>

              {surpriseOffers.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-8">
                  {surpriseOffers.map((offer) => {
                    const active = isOfferActive(offer);
                    return (
                      <article
                        key={offer.id}
                        className="group border-t border-white/15 pt-5 flex flex-col justify-between"
                      >
                        <div>
                          {offer.cover_url && (
                            <div className="mb-5 aspect-[16/10] w-full overflow-hidden bg-[#111]">
                              <img
                                src={offer.cover_url}
                                alt={offer.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                            <span>{isEn ? 'CLUB SURPRISE' : 'SURPRISE MEMBRE'}</span>
                            <span className={active ? 'text-white' : 'text-neutral-600'}>
                              {getOfferStatus(offer)}
                            </span>
                          </div>
                          <h3 className="mt-2.5 text-xl sm:text-2xl font-agrandir-extrabold leading-snug text-white">
                            {offer.title}
                          </h3>
                          {offer.description && (
                            <p className="mt-2.5 text-sm leading-6 text-neutral-400">
                              {offer.description}
                            </p>
                          )}
                          {offer.benefit_label && (
                            <p className="mt-3 text-xs font-agrandir-semibold text-neutral-200">
                              {offer.benefit_label}
                            </p>
                          )}
                          {offer.conditions && (
                            <p className="mt-2 text-xs text-neutral-500">{offer.conditions}</p>
                          )}
                        </div>

                        {offer.action_url && active && (
                          <div className="mt-5 pt-4 border-t border-white/10">
                            <a
                              href={offer.action_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-agrandir-extrabold uppercase tracking-[0.12em] text-white hover:opacity-70 transition-opacity"
                            >
                              {offer.action_label || (isEn ? 'Discover' : 'Découvrir')}
                              <ArrowUpRight size={14} />
                            </a>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-white/10 bg-[#070707] px-6 py-12 sm:py-16 text-center">
                  <p className="text-lg sm:text-xl font-agrandir-extrabold text-white">
                    {isEn ? 'Nothing announced just yet.' : 'Les prochaines surprises se préparent.'}
                  </p>
                  <p className="mt-2.5 max-w-md mx-auto text-sm leading-6 text-neutral-500">
                    {isEn
                      ? 'Exclusive gifts, privileged access, VIP invitations and community rewards will appear here as soon as they open.'
                      : 'Cadeaux, accès privilégiés, invitations exclusives et avantages membres apparaîtront ici dès leur ouverture.'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* E. VENTE FLASH */}
          {showOffersAndHistory && (
            <section id="gp-flash" className="py-10 sm:py-14 scroll-mt-20">
              <div className="mb-8">
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  04 · {isEn ? 'LIMITED WINDOW' : 'OFFRES TEMPORAIRES'}
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold tracking-tight">
                  {isEn ? 'Flash Sales' : 'Vente Flash'}
                </h2>
                <p className="mt-2 max-w-xl text-sm text-neutral-400">
                  {isEn
                    ? 'Presales, preferential Club rates, early access and limited quantities.'
                    : 'Préventes, tarifs préférentiels Club, accès anticipés et quantités limitées.'}
                </p>
              </div>

              {flashOffers.length > 0 ? (
                <div className="space-y-6">
                  {flashOffers.map((offer) => {
                    const active = isOfferActive(offer);
                    return (
                      <article
                        key={offer.id}
                        className="border border-white/12 bg-[#080808] grid md:grid-cols-12 overflow-hidden"
                      >
                        {offer.cover_url && (
                          <div className="md:col-span-5 aspect-[16/10] md:aspect-auto bg-[#111] overflow-hidden">
                            <img
                              src={offer.cover_url}
                              alt={offer.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div
                          className={`${
                            offer.cover_url ? 'md:col-span-7' : 'md:col-span-12'
                          } p-6 sm:p-8 flex flex-col justify-between gap-5`}
                        >
                          <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em]">
                              <span className="text-neutral-500">
                                {isEn ? 'FLASH OFFER' : 'VENTE FLASH'}
                              </span>
                              <span
                                className={`px-2.5 py-1 border ${
                                  active
                                    ? 'border-white/30 text-white'
                                    : 'border-white/10 text-neutral-500'
                                }`}
                              >
                                {getOfferStatus(offer)}
                              </span>
                            </div>
                            <h3 className="mt-3 text-xl sm:text-2xl font-agrandir-extrabold text-white">
                              {offer.title}
                            </h3>
                            {offer.description && (
                              <p className="mt-2 text-sm leading-6 text-neutral-400">
                                {offer.description}
                              </p>
                            )}
                            {offer.benefit_label && (
                              <p className="mt-3 text-xs font-agrandir-semibold text-neutral-200">
                                {offer.benefit_label}
                              </p>
                            )}
                            {offer.conditions && (
                              <p className="mt-2 text-xs text-neutral-500">{offer.conditions}</p>
                            )}
                          </div>

                          <div className="pt-4 border-t border-white/10 flex flex-wrap items-end justify-between gap-4">
                            <div>
                              {offer.price_amount !== null && (
                                <p className="text-2xl font-agrandir-extrabold tabular-nums text-white">
                                  {formatNumber(offer.price_amount)}{' '}
                                  <span className="text-xs font-normal text-neutral-400">
                                    {offer.currency}
                                  </span>
                                </p>
                              )}
                              {offer.ends_at && (
                                <p className="mt-1.5 text-[11px] text-neutral-500 inline-flex items-center gap-1.5">
                                  <CalendarClock size={13} />
                                  {isEn ? 'Ends ' : 'Jusqu’au '}
                                  {new Date(offer.ends_at).toLocaleString(
                                    isEn ? 'en-GB' : 'fr-FR',
                                    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
                                  )}
                                </p>
                              )}
                            </div>

                            {offer.action_url && active && (
                              <a
                                href={offer.action_url}
                                target="_blank"
                                rel="noreferrer"
                                className="min-h-11 px-6 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.1em] inline-flex items-center gap-2 hover:bg-neutral-200 transition-colors"
                              >
                                {offer.action_label || (isEn ? 'Access offer' : 'Profiter de l’offre')}
                                <ArrowUpRight size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-white/10 bg-[#070707] px-6 py-12 text-center">
                  <p className="text-lg font-agrandir-extrabold text-white">
                    {isEn ? 'No flash sale live right now.' : 'Aucune vente flash en cours.'}
                  </p>
                  <p className="mt-2 max-w-md mx-auto text-sm text-neutral-500">
                    {isEn
                      ? 'Temporary Club offers, presales and limited preferential rates will be published here.'
                      : 'Les préventes, billets en promotion et accès anticipés du Club apparaîtront ici dès leur ouverture.'}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* F. HISTORIQUE */}
          {showOffersAndHistory && (
            <section id="gp-historique" className="py-10 sm:py-14 scroll-mt-20">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    05 · {isEn ? 'ACTIVITY' : 'SUIVI'}
                  </p>
                  <h2 className="mt-2 text-2xl font-agrandir-extrabold flex items-center gap-3">
                    <History size={20} className="text-neutral-500" />
                    {isEn ? 'History' : 'Historique'}
                  </h2>
                </div>

                {isSignedIn && unifiedTimeline.length > 0 && (
                  <div className="flex items-center gap-5 text-[11px] uppercase tracking-[0.12em] overflow-x-auto scrollbar-hide">
                    {(
                      [
                        { id: 'all', label: isEn ? 'All' : 'Tout' },
                        { id: 'points', label: isEn ? 'Earned' : 'Obtenus' },
                        { id: 'redeemed', label: isEn ? 'Used' : 'Utilisés' },
                        { id: 'referrals', label: isEn ? 'Referrals' : 'Parrainages' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivityFilter(tab.id)}
                        className={`pb-1 transition-colors cursor-pointer shrink-0 ${
                          activityFilter === tab.id
                            ? 'text-white border-b border-white font-agrandir-extrabold'
                            : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isSignedIn ? (
                <p className="py-8 border-t border-white/10 text-sm text-neutral-500">
                  {isEn
                    ? 'Sign in to view your Gift Points and referral history.'
                    : 'Connectez-vous pour consulter l’historique de vos Gift Points et parrainages.'}
                </p>
              ) : filteredTimeline.length > 0 ? (
                <div className="divide-y divide-white/10 border-y border-white/10">
                  {filteredTimeline.map((entry) => (
                    <article
                      key={entry.id}
                      className="py-4 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-white truncate">{entry.title}</p>
                        <p className="mt-1 text-[11px] text-neutral-500">
                          {entry.subtitle} ·{' '}
                          {new Date(entry.date).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-agrandir-extrabold tabular-nums shrink-0 ${
                          entry.isPositive ? 'text-white' : 'text-neutral-500'
                        }`}
                      >
                        {entry.amountLabel}
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="py-10 border-t border-white/10 text-sm text-neutral-500">
                  {isEn
                    ? 'No activity recorded in this category yet.'
                    : 'Aucune activité enregistrée pour le moment.'}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
