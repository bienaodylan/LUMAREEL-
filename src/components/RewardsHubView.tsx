import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';
import { ClubExplorer } from './ClubExplorer';
import { BackstageView } from './BackstageView';
import { ConcertMemoriesView } from './ConcertMemoriesView';
import { SuggestionsView } from './SuggestionsView';
import {
  COMMUNITY_MEDIA,
  ClaimedFlashOffer,
  POINTS_RULES,
  REFERRAL_CREDIT_FCFA,
  RedeemedReward,
  computeUserPointsSummary,
  generateReferralCode,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Gift,
  Share2,
  Ticket,
  Zap,
} from 'lucide-react';

export type RewardsTab = 'gifts' | 'points' | 'exchange' | 'referral';

interface RewardCatalogItem {
  id: string;
  category: RedeemedReward['category'];
  pointsCost: number;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  tagFr: string;
  tagEn: string;
}

interface FlashOffer {
  id: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  discountLabelFr: string;
  discountLabelEn: string;
  originalPrice: number;
  flashPrice: number;
  remaining: number;
  total: number;
  endsInSeconds: number;
  image: string;
  codePrefix: string;
}

const FLASH_OFFERS: FlashOffer[] = [];
const SURPRISE_POOL: Array<{
  points: number;
  titleFr: string;
  titleEn: string;
  detailFr: string;
  detailEn: string;
}> = [];
const REWARDS_CATALOG: RewardCatalogItem[] = [];

function formatTimer(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RewardsHubView: React.FC<{ initialTab?: RewardsTab; unified?: boolean }> = ({ initialTab = 'gifts', unified = false }) => {
  const {
    currentUser,
    customerOrders,
    events,
    setCheckoutEvent,
    setCurrentPage,
    setIsAuthModalOpen,
    showToast,
    language,
  } = useApp();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<RewardsTab>(initialTab);
  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [revealedSurprise, setRevealedSurprise] = useState<ClaimedFlashOffer | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Formulaire de complétion de profil (50 pts)
  const [profileCity, setProfileCity] = useState(pointsState.profileDetails?.city || 'Abidjan');
  const [profilePhone, setProfilePhone] = useState(pointsState.profileDetails?.phone || '');
  const [profileGenre, setProfileGenre] = useState(pointsState.profileDetails?.favoriteGenre || 'Afrobeats / Live');

  // Formulaire code parrain d'un ami
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [inviteFriendName, setInviteFriendName] = useState('');

  const myReferralCode = useMemo(() => generateReferralCode(currentUser), [currentUser]);
  const summary = useMemo(
    () =>
      computeUserPointsSummary(currentUser, customerOrders, {
        ...pointsState,
        profileCompleted: false,
        completedChallenges: [],
        redeemedRewards: [],
        referrals: [],
        bonusSurprisePoints: 0,
        welcomeReferralCreditFcfa: 0,
      }),
    [currentUser, customerOrders, pointsState]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyClaimedToday = pointsState.lastSurpriseClaimDate === todayKey;
  const nextConcert = events.find((e) => e.status === 'published') || events[0] || null;

  const persist = (next: typeof pointsState) => {
    setPointsState(next);
    saveUserPointsState(currentUser, next);
  };

  const handleClaimFlash = (offer: FlashOffer) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to reserve a flash offer.' : 'Connectez-vous pour réserver une vente flash.',
        'info'
      );
      return;
    }
    const existing = pointsState.claimedFlashOffers.find((c) => c.offerId === offer.id);
    if (existing) {
      showToast(
        isEn ? `Offer already reserved (${existing.code}).` : `Offre déjà réservée (code : ${existing.code}).`,
        'info'
      );
      return;
    }
    const code = `${offer.codePrefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const claimed: ClaimedFlashOffer = {
      id: `fl_${Date.now()}`,
      offerId: offer.id,
      title: isEn ? offer.titleEn : offer.titleFr,
      code,
      claimedAt: new Date().toISOString(),
      type: 'flash_sale',
      detail: `${offer.flashPrice.toLocaleString('fr-FR')} F CFA`,
    };
    persist({
      ...pointsState,
      claimedFlashOffers: [claimed, ...pointsState.claimedFlashOffers],
    });
    showToast(
      isEn ? `Flash deal reserved! Code: ${code}` : `Vente flash réservée ! Code : ${code}`,
      'success'
    );
  };

  const handleUnlockSurprise = () => {
    if (SURPRISE_POOL.length === 0) {
      showToast(isEn ? 'No active surprise is available right now.' : 'Aucune surprise active pour le moment.', 'info');
      return;
    }
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn
          ? 'Sign in to unlock your surprise gift.'
          : 'Connectez-vous pour débloquer votre cadeau surprise.',
        'info'
      );
      return;
    }
    if (alreadyClaimedToday) {
      showToast(
        isEn
          ? 'You already unlocked today’s surprise gift. Come back tomorrow!'
          : 'Vous avez déjà ouvert votre cadeau surprise aujourd’hui. Revenez demain !',
        'info'
      );
      return;
    }
    const pick = SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)];
    const code = `LMR-SURP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const entry: ClaimedFlashOffer = {
      id: `surp_${Date.now()}`,
      offerId: `surprise_${todayKey}`,
      title: isEn ? pick.titleEn : pick.titleFr,
      code,
      claimedAt: new Date().toISOString(),
      type: 'surprise',
      detail: isEn ? pick.detailEn : pick.detailFr,
    };
    persist({
      ...pointsState,
      bonusSurprisePoints: pointsState.bonusSurprisePoints + pick.points,
      lastSurpriseClaimDate: todayKey,
      claimedFlashOffers: [entry, ...pointsState.claimedFlashOffers],
    });
    setRevealedSurprise(entry);
    showToast(
      isEn ? `Gift unlocked: ${pick.titleEn}` : `Surprise débloquée : ${pick.titleFr}`,
      'success'
    );
  };

  const handleSaveProfileBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to earn your profile points.' : 'Connectez-vous pour enregistrer vos points de profil.',
        'info'
      );
      return;
    }
    const alreadyDone = pointsState.completedChallenges.includes('challenge_profile_full');
    const next = {
      ...pointsState,
      profileCompleted: false,
      profileDetails: {
        city: profileCity.trim(),
        phone: profilePhone.trim(),
        favoriteGenre: profileGenre.trim(),
      },
      completedChallenges: pointsState.completedChallenges,
    };
    persist(next);
    showToast(
      isEn
        ? 'Profile details saved. Loyalty points are credited only after server validation is enabled.'
        : 'Profil enregistré. Les points seront crédités après activation de la validation serveur.',
      'success'
    );
  };

  const handleRedeem = (item: RewardCatalogItem) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to redeem your points.' : 'Connectez-vous pour échanger vos points.',
        'info'
      );
      return;
    }
    if (summary.availablePoints < item.pointsCost) {
      const missing = item.pointsCost - summary.availablePoints;
      showToast(
        isEn
          ? `You need ${missing} more points to unlock this reward.`
          : `Il vous manque ${missing} points pour débloquer cette récompense.`,
        'error'
      );
      return;
    }
    const code = `LMR-${item.category.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const newReward: RedeemedReward = {
      id: `red_${Date.now()}`,
      rewardId: item.id,
      title: isEn ? item.titleEn : item.titleFr,
      category: item.category,
      pointsCost: item.pointsCost,
      voucherCode: code,
      redeemedAt: new Date().toISOString(),
      status: 'active',
    };
    const next = {
      ...pointsState,
      redeemedRewards: [newReward, ...pointsState.redeemedRewards],
      welcomeReferralCreditFcfa:
        item.id === 'rew_credit_2500'
          ? pointsState.welcomeReferralCreditFcfa + 2500
          : pointsState.welcomeReferralCreditFcfa,
    };
    persist(next);
    showToast(
      isEn ? `Reward unlocked! Voucher code: ${code}` : `Récompense obtenue ! Code bon : ${code}`,
      'success'
    );
  };

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(myReferralCode);
      setCopiedCode(true);
      showToast(
        isEn ? `Referral code ${myReferralCode} copied.` : `Code parrainage ${myReferralCode} copié.`,
        'success'
      );
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      showToast(myReferralCode, 'info');
    }
  };

  const handleShareReferral = async () => {
    const shareText = isEn
      ? `Join LUMARÉEL with my code ${myReferralCode} and get 500 FCFA ticketing credit on your first concert ticket.`
      : `Rejoins LUMARÉEL avec mon code ${myReferralCode} et reçois 500 F CFA de crédit billetterie dès ton premier achat !`;
    const shareUrl =
      typeof window !== 'undefined' ? `${window.location.origin}/?ref=${encodeURIComponent(myReferralCode)}` : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'LUMARÉEL — Parrainage 500 F CFA',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback copy below
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast(
        isEn ? 'Referral invite copied to share with your friends.' : 'Lien d’invitation copié, prêt à être partagé.',
        'success'
      );
    } catch {
      showToast(shareText, 'info');
    }
  };

  const handleApplyFriendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Create an account to claim your 500 FCFA referral credit.' : 'Créez un compte pour activer vos 500 F CFA de crédit.',
        'info'
      );
      return;
    }
    const clean = friendCodeInput.trim().toUpperCase();
    if (!clean || clean.length < 5) {
      showToast(
        isEn ? 'Enter a valid referral code (e.g. LMR-KOFFI124).' : 'Saisissez un code de parrainage valide (ex : LMR-KOFFI124).',
        'error'
      );
      return;
    }
    if (clean === myReferralCode) {
      showToast(
        isEn ? 'You cannot use your own referral code.' : 'Vous ne pouvez pas utiliser votre propre code de parrainage.',
        'error'
      );
      return;
    }
    if (pointsState.appliedReferralCode) {
      showToast(
        isEn ? 'A referral code has already been applied to your account.' : 'Un code de parrainage est déjà actif sur votre compte.',
        'info'
      );
      return;
    }
    const next = {
      ...pointsState,
      appliedReferralCode: clean,
      welcomeReferralCreditFcfa: pointsState.welcomeReferralCreditFcfa + REFERRAL_CREDIT_FCFA,
    };
    persist(next);
    setFriendCodeInput('');
    showToast(
      isEn
        ? 'Referral code activated! 500 FCFA ticketing credit added to your account.'
        : 'Code parrain validé ! 500 F CFA de crédit billetterie ajoutés à votre compte.',
      'success'
    );
  };

  const handleRegisterFriendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    const cleanFriend = inviteFriendName.trim();
    if (!cleanFriend) return;

    const newEntry = {
      id: `ref_${Date.now()}`,
      friendName: cleanFriend,
      status: 'signed_up' as const,
      creditFcfa: REFERRAL_CREDIT_FCFA,
      pointsAwarded: POINTS_RULES.REFERRAL_PURCHASE,
      createdAt: new Date().toISOString(),
    };
    persist({
      ...pointsState,
      referrals: [newEntry, ...pointsState.referrals],
    });
    setInviteFriendName('');
    showToast(
      isEn
        ? `Invitation tracked for ${cleanFriend}. Rewards unlock once their first ticket is purchased.`
        : `Invitation enregistrée pour ${cleanFriend}. Les 500 F CFA + 200 pts se débloquent dès son premier achat.`,
      'success'
    );
  };

  const pointsScaleRows = [
    {
      activityFr: 'Télécharger l’application & créer un compte / Compléter son profil',
      activityEn: 'Download app, create account & complete profile',
      points: POINTS_RULES.COMPLETE_PROFILE,
    },
    {
      activityFr: 'Parrainer un ami qui achète réellement un billet',
      activityEn: 'Refer a friend who completes a real ticket purchase',
      points: POINTS_RULES.REFERRAL_PURCHASE,
    },
    {
      activityFr: 'Acheter un billet standard',
      activityEn: 'Purchase a standard concert ticket',
      points: POINTS_RULES.STANDARD_TICKET,
    },
    {
      activityFr: 'Acheter un billet VIP',
      activityEn: 'Purchase a VIP concert ticket',
      points: POINTS_RULES.VIP_TICKET,
    },
    {
      activityFr: 'Assister à un concert (présence vérifiée par scan QR)',
      activityEn: 'Attend a concert (QR-verified gate scan)',
      points: POINTS_RULES.CONCERT_ATTENDANCE_QR,
    },
    {
      activityFr: 'Souscrire à un abonnement LUMARÉEL Black Card',
      activityEn: 'Subscribe to LUMARÉEL Black Card',
      points: POINTS_RULES.BLACK_CARD_SUBSCRIPTION,
    },
  ];

  const appChallenges = [
    {
      id: 'challenge_suggestion',
      titleFr: 'Proposer un artiste ou une idée dans Ta Voix',
      titleEn: 'Suggest an artist or idea in Your Voice',
      points: POINTS_RULES.APP_CHALLENGE_SUGGESTION,
      actionLabelFr: 'Ouvrir Ta Voix',
      actionLabelEn: 'Open Your Voice',
      targetPage: 'suggestions' as const,
    },
    {
      id: 'challenge_memory',
      titleFr: 'Partager une photo ou vidéo dans Mes Moments',
      titleEn: 'Share a photo or video in My Moments',
      points: POINTS_RULES.APP_CHALLENGE_MEMORY,
      actionLabelFr: 'Ouvrir Mes Moments',
      actionLabelEn: 'Open My Moments',
      targetPage: 'memories' as const,
    },
    {
      id: 'challenge_backstage',
      titleFr: 'Regarder un contenu exclusif Backstage',
      titleEn: 'Watch an exclusive Backstage drop',
      points: POINTS_RULES.APP_CHALLENGE_BACKSTAGE,
      actionLabelFr: 'Ouvrir Backstage',
      actionLabelEn: 'Open Backstage',
      targetPage: 'backstage' as const,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-8 text-white font-agrandir-regular">
      {unified ? (
        <ClubExplorer
          isEn={isEn}
          points={summary.availablePoints}
          creditFcfa={summary.ticketingCreditFcfa}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenPage={(page) => {
            const target = page === 'backstage'
              ? 'club-section-backstage'
              : page === 'memories'
              ? 'club-section-memories'
              : 'club-section-voice';
            document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        />
      ) : (
        <header className="mb-8 border-b border-white/15 pb-6">
          <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">LUMARÉEL CLUB</p>
          <h1 className="mt-2 text-3xl font-agrandir-extrabold tracking-tight sm:text-5xl">GIFT</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            {isEn ? 'Member rewards, limited opportunities and benefits.' : 'Récompenses membres, opportunités limitées et avantages.'}
          </p>
        </header>
      )}



      {unified && (
        <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
          <section id="club-section-backstage" className="scroll-mt-8 border-t border-white/15 pt-8">
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">UNIVERS 01</p>
              <h2 className="mt-2 text-2xl font-agrandir-extrabold sm:text-3xl">BACKSTAGE</h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">{isEn ? 'Exclusive content, preparations and moments from behind the scenes.' : 'Contenus exclusifs, préparatifs et instants dans les coulisses.'}</p>
            </div>
            <BackstageView embedded />
          </section>

          <section id="club-section-memories" className="scroll-mt-8 border-t border-white/15 pt-8">
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">UNIVERS 02</p>
              <h2 className="mt-2 text-2xl font-agrandir-extrabold sm:text-3xl">{isEn ? 'MY MOMENTS' : 'MES MOMENTS'}</h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">{isEn ? 'Your personal collection of concert memories and experiences.' : 'Votre collection personnelle de souvenirs et d’expériences vécues.'}</p>
            </div>
            <ConcertMemoriesView embedded />
          </section>

          <section id="club-section-voice" className="scroll-mt-8 border-t border-white/15 pt-8">
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">UNIVERS 03</p>
              <h2 className="mt-2 text-2xl font-agrandir-extrabold sm:text-3xl">TA VOIX</h2>
              <p className="mt-2 max-w-2xl text-sm text-neutral-400">{isEn ? 'Suggest the artists you would like to see on the LUMARÉEL stage.' : 'Proposez les artistes que vous aimeriez voir sur la scène LUMARÉEL.'}</p>
            </div>
            <SuggestionsView embedded />
          </section>
        </div>
      )}

      <AnimatePresence mode="wait">
      <motion.div
        id="club-content"
        key={activeTab}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="scroll-mt-24"
      >
      {/* ===================================================================== */}
      {/* ONGLET 1 : GIFTS SURPRISES & VENTES FLASH                             */}
      {/* ===================================================================== */}
      {activeTab === 'gifts' && (
        <div className="space-y-10">
          {/* Bloc Cadeau Surprise du jour */}
          <section className="rounded-3xl bg-[#0e0e0e] border border-[#FFFFFF]/30 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-[#FFFFFF] font-agrandir-bold uppercase tracking-wider">
                <Gift className="w-4 h-4" />
                <span>{isEn ? 'Member Surprise Gift' : 'Gift Surprise Membre'}</span>
              </div>
              <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight">
                {alreadyClaimedToday
                  ? isEn
                    ? 'Today’s surprise gift has been unlocked.'
                    : 'Votre surprise du jour est débloquée.'
                  : isEn
                  ? 'Open your surprise gift right now.'
                  : 'Débloquez votre cadeau surprise du jour.'}
              </h2>
              <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
                {revealedSurprise
                  ? `${revealedSurprise.title} — ${revealedSurprise.detail} (${revealedSurprise.code})`
                  : isEn
                  ? 'Bonus loyalty points, instant ticketing discounts, or partner drink vouchers — revealed in one tap.'
                  : 'Points fidélité bonus, réductions billetterie immédiates ou invitations boisson partenaires révélés en un geste.'}
              </p>
            </div>

            <div className="lg:col-span-4 flex lg:justify-end">
              <button
                type="button"
                onClick={handleUnlockSurprise}
                disabled={alreadyClaimedToday || SURPRISE_POOL.length === 0}
                className={`w-full lg:w-auto min-h-[48px] px-7 rounded-2xl font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  alreadyClaimedToday
                    ? 'bg-white/10 text-neutral-400 cursor-not-allowed'
                    : 'bg-[#FFFFFF] hover:bg-[#e6c252] text-black cursor-pointer'
                }`}
              >
                {alreadyClaimedToday ? <CheckCircle2 className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                <span>
                  {alreadyClaimedToday
                    ? isEn
                      ? 'Unlocked today'
                      : 'Déjà ouverte aujourd’hui'
                    : SURPRISE_POOL.length === 0
                    ? isEn ? 'No active gift' : 'Aucun gift actif'
                    : isEn ? 'Reveal my gift' : 'Ouvrir ma surprise'}
                </span>
              </button>
            </div>
          </section>

          {/* Ventes Flash en cours */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-agrandir-extrabold text-xl text-white">
                {isEn ? 'Active flash sales' : 'Ventes flash en cours'}
              </h2>
              <span className="text-xs text-neutral-400">
                {isEn ? 'Limited stock' : 'Stocks limités'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {FLASH_OFFERS.length === 0 ? (
                <div className="border border-dashed border-white/15 px-5 py-10 text-center text-sm text-neutral-400">
                  {isEn ? 'No flash sale is currently published.' : 'Aucune vente flash n’est actuellement publiée.'}
                </div>
              ) : FLASH_OFFERS.map((offer) => {
                const claimed = pointsState.claimedFlashOffers.find((c) => c.offerId === offer.id);
                const secondsLeft = Math.max(0, offer.endsInSeconds - elapsed);
                return (
                  <article
                    key={offer.id}
                    className="rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-[4/3] relative bg-black overflow-hidden">
                        <img
                          src={offer.image}
                          alt={isEn ? offer.titleEn : offer.titleFr}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
                          <span className="font-agrandir-bold text-[#FFFFFF]">
                            {isEn ? offer.discountLabelEn : offer.discountLabelFr}
                          </span>
                          <span className="font-mono text-white tabular-nums flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[#FFFFFF]" />
                            {formatTimer(secondsLeft)}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <h3 className="font-agrandir-extrabold text-base text-white leading-snug">
                          {isEn ? offer.titleEn : offer.titleFr}
                        </h3>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {isEn ? offer.descEn : offer.descFr}
                        </p>
                        <div className="flex items-baseline gap-2.5 pt-1">
                          <span className="text-xl font-agrandir-extrabold text-white tabular-nums">
                            {offer.flashPrice.toLocaleString('fr-FR')} F CFA
                          </span>
                          <span className="text-xs text-neutral-500 line-through tabular-nums">
                            {offer.originalPrice.toLocaleString('fr-FR')} F CFA
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 tabular-nums">
                          {isEn
                            ? `${offer.remaining} of ${offer.total} remaining`
                            : `${offer.remaining} restants sur ${offer.total}`}
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 space-y-2">
                      <button
                        type="button"
                        onClick={() => handleClaimFlash(offer)}
                        className={`w-full min-h-[44px] rounded-xl text-xs font-agrandir-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                          claimed
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white hover:bg-neutral-200 text-black'
                        }`}
                      >
                        {claimed ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                        <span>
                          {claimed
                            ? `${isEn ? 'Reserved' : 'Réservé'} · ${claimed.code}`
                            : isEn
                            ? 'Claim flash deal'
                            : 'Profiter de la vente flash'}
                        </span>
                      </button>
                      {claimed && nextConcert && (
                        <button
                          type="button"
                          onClick={() => setCheckoutEvent(nextConcert)}
                          className="w-full min-h-[40px] rounded-xl border border-white/15 hover:border-white/30 text-xs text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Book concert now' : 'Utiliser sur un concert'}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Mes codes flash & surprises enregistrés */}
          <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7">
            <h2 className="font-agrandir-extrabold text-lg text-white mb-4">
              {isEn ? 'Your reserved gifts & flash deals' : 'Vos gifts et ventes flash réservés'}
            </h2>
            {pointsState.claimedFlashOffers.length === 0 ? (
              <p className="text-sm text-neutral-400">
                {isEn
                  ? 'Nothing claimed yet. Unlock your daily surprise gift or reserve a flash offer above.'
                  : 'Aucune offre réservée pour le moment. Ouvrez votre surprise du jour ou sélectionnez une vente flash ci-dessus.'}
              </p>
            ) : (
              <div className="divide-y divide-white/8">
                {pointsState.claimedFlashOffers.map((item) => (
                  <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-agrandir-bold text-white">{item.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{item.detail}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1.5 rounded-lg bg-black border border-[#FFFFFF]/30 font-mono text-xs text-[#FFFFFF]">
                        {item.code}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard?.writeText(item.code).catch(() => {});
                          showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                        }}
                        className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                        aria-label={isEn ? 'Copy code' : 'Copier le code'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 2 : MES POINTS, BARÈME & DÉFIS                                 */}
      {/* ===================================================================== */}
      {activeTab === 'points' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Colonne gauche : Barème officiel & Défis */}
          <div className="lg:col-span-7 space-y-8">
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
                  {isEn ? 'How you earn points' : 'Barème officiel des points'}
                </h2>
                <span className="text-xs text-neutral-400 font-mono">
                  {isEn ? 'Automatic tracking' : 'Crédit automatique'}
                </span>
              </div>

              <div className="divide-y divide-white/8">
                {pointsScaleRows.map((row, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                    <span className="text-sm text-neutral-200 leading-snug">
                      {isEn ? row.activityEn : row.activityFr}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#FFFFFF] tabular-nums whitespace-nowrap shrink-0">
                      +{row.points} pts
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Défis de l'application */}
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
                  {isEn ? 'In-app challenges' : 'Défis de l’application'}
                </h2>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {pointsState.completedChallenges.length} / {appChallenges.length + 1}{' '}
                  {isEn ? 'completed' : 'validés'}
                </span>
              </div>

              <div className="divide-y divide-white/8">
                {appChallenges.map((ch) => {
                  const done = pointsState.completedChallenges.includes(ch.id);
                  return (
                    <div key={ch.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-agrandir-bold text-white">
                          {isEn ? ch.titleEn : ch.titleFr}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5 tabular-nums">
                          +{ch.points} pts ·{' '}
                          {done
                            ? isEn
                              ? 'Completed'
                              : 'Validé'
                            : isEn
                            ? 'Available now'
                            : 'Disponible'}
                        </div>
                      </div>
                      {done ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-agrandir-bold text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-4 h-4" />
                          {isEn ? 'Earned' : 'Obtenu'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(ch.targetPage)}
                          className="min-h-[40px] px-4 py-2 rounded-xl bg-white/10 hover:bg-white hover:text-black text-white text-xs font-agrandir-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <span>{isEn ? ch.actionLabelEn : ch.actionLabelFr}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Colonne droite : Compléter son profil + Historique des points */}
          <div className="lg:col-span-5 space-y-8">
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="font-agrandir-extrabold text-base text-white">
                  {isEn ? 'Complete your profile' : 'Compléter votre profil'}
                </h3>
                <span className="font-mono text-xs font-bold text-[#FFFFFF] tabular-nums">+50 pts</span>
              </div>
              <form onSubmit={handleSaveProfileBonus} className="space-y-3.5">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isEn ? 'City' : 'Ville'}
                  </label>
                  <input
                    type="text"
                    value={profileCity}
                    onChange={(e) => setProfileCity(e.target.value)}
                    placeholder="Abidjan"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#FFFFFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isEn ? 'Mobile number' : 'Téléphone'}
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#FFFFFF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">
                    {isEn ? 'Favorite live vibe' : 'Ambiance live préférée'}
                  </label>
                  <select
                    value={profileGenre}
                    onChange={(e) => setProfileGenre(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#FFFFFF] focus:outline-none"
                  >
                    <option value="Afrobeats / Live">Afrobeats / Live</option>
                    <option value="Rap / Hip-Hop">Rap / Hip-Hop</option>
                    <option value="Acoustique & Soul">Acoustique & Soul</option>
                    <option value="Électro & Afro-House">Électro & Afro-House</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {pointsState.completedChallenges.includes('challenge_profile_full')
                    ? isEn
                      ? 'Update profile'
                      : 'Mettre à jour le profil'
                    : isEn
                    ? 'Save & claim +50 pts'
                    : 'Valider et recevoir +50 pts'}
                </button>
              </form>
            </section>

            {/* Journal de points réels */}
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6">
              <h3 className="font-agrandir-extrabold text-base text-white mb-4">
                {isEn ? 'Your activity ledger' : 'Historique de vos points'}
              </h3>
              {summary.breakdown.length === 0 ? (
                <div className="py-6 text-center space-y-3">
                  <p className="text-xs text-neutral-400">
                    {isEn
                      ? 'Sign in or book your first concert to start collecting LUMARÉEL points.'
                      : 'Connectez-vous ou réservez votre premier concert pour commencer à cumuler des points.'}
                  </p>
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-white text-black text-xs font-agrandir-bold cursor-pointer"
                    >
                      {isEn ? 'Sign in / Create account' : 'Se connecter / Créer un compte'}
                    </button>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-white/8">
                  {summary.breakdown.map((entry) => (
                    <li key={entry.id} className="py-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-neutral-300 leading-snug">
                        {isEn ? entry.labelEn : entry.labelFr}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#FFFFFF] tabular-nums shrink-0">
                        +{entry.points}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {!summary.hasActiveBlackCard && (
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-agrandir-bold text-white">LUMARÉEL Black Card</div>
                    <div className="text-[11px] text-neutral-400">
                      {isEn ? '+300 bonus points upon activation' : '+300 points offerts à la souscription'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('member_card')}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[#FFFFFF]/40 text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-black text-xs font-agrandir-bold transition-colors cursor-pointer shrink-0"
                  >
                    {isEn ? 'View card' : 'Découvrir'}
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 3 : CATALOGUE D'ÉCHANGE DE POINTS                              */}
      {/* ===================================================================== */}
      {activeTab === 'exchange' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {REWARDS_CATALOG.length === 0 ? (
              <div className="col-span-full border border-dashed border-white/15 px-5 py-10 text-center text-sm text-neutral-400">
                {isEn ? 'No reward is available for redemption yet.' : 'Aucune récompense n’est disponible à l’échange pour le moment.'}
              </div>
            ) : REWARDS_CATALOG.map((item) => {
              const canAfford = summary.availablePoints >= item.pointsCost;
              return (
                <article
                  key={item.id}
                  className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-400">
                      <span>{isEn ? item.tagEn : item.tagFr}</span>
                      <span className="font-mono font-bold text-[#FFFFFF] tabular-nums">
                        {item.pointsCost.toLocaleString('fr-FR')} pts
                      </span>
                    </div>
                    <h3 className="font-agrandir-extrabold text-lg text-white leading-snug">
                      {isEn ? item.titleEn : item.titleFr}
                    </h3>
                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {isEn ? item.descEn : item.descFr}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRedeem(item)}
                    className={`w-full min-h-[44px] rounded-xl text-xs font-agrandir-extrabold uppercase tracking-wider transition-colors cursor-pointer ${
                      canAfford
                        ? 'bg-white hover:bg-neutral-200 text-black'
                        : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10'
                    }`}
                  >
                    {canAfford
                      ? isEn
                        ? 'Redeem now'
                        : 'Échanger maintenant'
                      : isEn
                      ? `Need ${item.pointsCost - summary.availablePoints} pts`
                      : `Encore ${item.pointsCost - summary.availablePoints} pts`}
                  </button>
                </article>
              );
            })}
          </div>

          {/* Récompenses déjà échangées */}
          <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7">
            <h2 className="font-agrandir-extrabold text-lg text-white mb-4">
              {isEn ? 'Your unlocked vouchers' : 'Vos récompenses obtenues'}
            </h2>
            {pointsState.redeemedRewards.length === 0 ? (
              <p className="text-sm text-neutral-400">
                {isEn
                  ? 'No rewards redeemed yet. Your exchanged tickets, backstage passes, and partner codes will appear here.'
                  : 'Aucune récompense échangée pour le moment. Vos billets gratuits, pass coulisses et codes partenaires apparaîtront ici.'}
              </p>
            ) : (
              <div className="divide-y divide-white/8">
                {pointsState.redeemedRewards.map((rw) => (
                  <div key={rw.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-agrandir-bold text-sm text-white">{rw.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        -{rw.pointsCost} pts · {new Date(rw.redeemedAt).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="px-3 py-1.5 rounded-lg bg-black border border-[#FFFFFF]/35 font-mono text-xs text-[#FFFFFF]">
                        {rw.voucherCode}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard?.writeText(rw.voucherCode).catch(() => {});
                          showToast(isEn ? 'Voucher code copied.' : 'Code récompense copié.', 'success');
                        }}
                        className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                        aria-label={isEn ? 'Copy code' : 'Copier le code'}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 4 : SYSTÈME DE PARRAINAGE (500 F CFA CHACUN + 200 PTS)          */}
      {/* ===================================================================== */}
      {activeTab === 'referral' && (
        <section className="border border-white/15 bg-[#0b0b0b] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">LUMARÉEL CLUB · GIFT</p>
          <h2 className="mt-3 text-2xl font-agrandir-extrabold sm:text-3xl">
            {isEn ? 'Referral programme is being prepared.' : 'Le programme de parrainage est en préparation.'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            {isEn
              ? 'Referral codes and ticketing credits will appear here once server-side validation and fraud protection are active. No credit is being issued from this screen.'
              : 'Les codes de parrainage et crédits billetterie seront activés lorsque la validation serveur et la protection contre les abus seront opérationnelles. Aucun crédit n’est attribué depuis cet écran pour le moment.'}
          </p>
        </section>
      )}
      </motion.div>
      </AnimatePresence>
    </div>
  );
};
