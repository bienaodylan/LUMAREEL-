import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AnimatePresence, motion } from 'framer-motion';
import { ClubExplorer } from './ClubExplorer';
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

const FLASH_OFFERS: FlashOffer[] = [
  {
    id: 'flash_duo_vip',
    titleFr: 'Pack Duo VIP — Vente Flash 24h',
    titleEn: 'VIP Duo Pack — 24h Flash Sale',
    descFr: 'Deux accès VIP avec entrée prioritaire et accès lounge pour le prochain concert LUMARÉEL.',
    descEn: 'Two VIP passes with priority gate access and lounge entry for the next LUMARÉEL show.',
    discountLabelFr: '-25 % Vente Flash',
    discountLabelEn: '25% Off Flash Drop',
    originalPrice: 60000,
    flashPrice: 45000,
    remaining: 9,
    total: 30,
    endsInSeconds: 5 * 3600 + 42 * 60,
    image: COMMUNITY_MEDIA.flashVipDropImg,
    codePrefix: 'FLASHVIP',
  },
  {
    id: 'flash_early_fosse',
    titleFr: 'Quota Fosse Éclair',
    titleEn: 'Lightning Floor Quota',
    descFr: 'Série limitée de billets standard à tarif préférentiel avant la clôture de la fenêtre flash.',
    descEn: 'Limited drop of standard floor tickets at a reduced rate before the flash window closes.',
    discountLabelFr: '-30 % Éclair',
    discountLabelEn: '30% Off Drop',
    originalPrice: 15000,
    flashPrice: 10500,
    remaining: 14,
    total: 50,
    endsInSeconds: 2 * 3600 + 18 * 60,
    image: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    codePrefix: 'FLASHSTD',
  },
  {
    id: 'flash_partner_table',
    titleFr: 'Avantage Partenaire — Lounge & Boisson Offerte',
    titleEn: 'Partner Perk — Lounge & Complimentary Drink',
    descFr: 'Bon flash valable chez nos lieux partenaires d’Abidjan avant ou après le concert.',
    descEn: 'Flash voucher redeemable at our Abidjan partner lounges before or after the concert.',
    discountLabelFr: 'Offre Partenaire',
    discountLabelEn: 'Partner Offer',
    originalPrice: 12000,
    flashPrice: 6000,
    remaining: 18,
    total: 40,
    endsInSeconds: 9 * 3600 + 10 * 60,
    image: COMMUNITY_MEDIA.vipMezzanineImg,
    codePrefix: 'FLASHLOUNGE',
  },
];

const SURPRISE_POOL = [
  {
    points: 75,
    titleFr: 'Bonus surprise +75 points fidélité',
    titleEn: 'Surprise bonus +75 loyalty points',
    detailFr: 'Crédités directement sur votre solde LUMARÉEL.',
    detailEn: 'Credited straight to your LUMARÉEL balance.',
  },
  {
    points: 100,
    titleFr: 'Bonus surprise +100 points + Boisson partenaire',
    titleEn: 'Surprise +100 points + Partner drink pass',
    detailFr: 'Code valable au bar partenaire lors de votre prochain concert.',
    detailEn: 'Code redeemable at the partner bar during your next show.',
  },
  {
    points: 50,
    titleFr: 'Code surprise -15 % billetterie + 50 points',
    titleEn: 'Surprise 15% ticket code + 50 points',
    detailFr: 'Utilisable sur votre prochaine commande standard ou VIP.',
    detailEn: 'Valid on your next standard or VIP order.',
  },
];

const REWARDS_CATALOG: RewardCatalogItem[] = [
  {
    id: 'rew_free_ticket',
    category: 'free_ticket',
    pointsCost: 600,
    titleFr: 'Billet de concert gratuit',
    titleEn: 'Free concert ticket',
    descFr: 'Valable sur une place Standard pour le prochain concert LUMARÉEL de votre choix.',
    descEn: 'Redeemable for a Standard seat on your next LUMARÉEL concert.',
    tagFr: 'Billetterie',
    tagEn: 'Ticketing',
  },
  {
    id: 'rew_backstage_exp',
    category: 'backstage_exp',
    pointsCost: 900,
    titleFr: 'Expérience en coulisses',
    titleEn: 'Backstage soundcheck experience',
    descFr: 'Accès privilégié aux balances avant l’ouverture des portes et visite guidée de la régie.',
    descEn: 'Private access to pre-show soundcheck and guided stage production tour.',
    tagFr: 'Coulisses',
    tagEn: 'Backstage',
  },
  {
    id: 'rew_private_invite',
    category: 'private_invite',
    pointsCost: 1200,
    titleFr: 'Invitation à un événement privé',
    titleEn: 'Private event invitation',
    descFr: 'Accès nominatif pour une session acoustique secrète ou un dîner privé LUMARÉEL.',
    descEn: 'Personal invitation to a secret acoustic session or private LUMARÉEL gathering.',
    tagFr: 'Événement privé',
    tagEn: 'Private event',
  },
  {
    id: 'rew_partner_discount',
    category: 'partner_discount',
    pointsCost: 350,
    titleFr: 'Réduction supplémentaire chez nos partenaires',
    titleEn: 'Extra partner discount',
    descFr: 'Bon de -20 % cumulable chez nos restaurants, lounges et maisons partenaires à Abidjan.',
    descEn: 'Stackable 20% voucher across our partner restaurants, lounges, and brands.',
    tagFr: 'Partenaires',
    tagEn: 'Partners',
  },
  {
    id: 'rew_credit_2500',
    category: 'credit',
    pointsCost: 400,
    titleFr: 'Crédit billetterie 2 500 FCFA',
    titleEn: '2,500 FCFA ticketing credit',
    descFr: 'Déductible directement sur votre prochaine réservation de billets ou d’upgrade.',
    descEn: 'Applied directly toward your next ticket booking or seat upgrade.',
    tagFr: 'Crédit',
    tagEn: 'Credit',
  },
];

function formatTimer(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RewardsHubView: React.FC<{ initialTab?: RewardsTab }> = ({ initialTab = 'gifts' }) => {
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
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
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
      profileCompleted: true,
      profileDetails: {
        city: profileCity.trim(),
        phone: profilePhone.trim(),
        favoriteGenre: profileGenre.trim(),
      },
      completedChallenges: alreadyDone
        ? pointsState.completedChallenges
        : [...pointsState.completedChallenges, 'challenge_profile_full'],
    };
    persist(next);
    showToast(
      alreadyDone
        ? isEn
          ? 'Member profile updated.'
          : 'Profil membre mis à jour.'
        : isEn
        ? '+50 points added for completing your profile.'
        : '+50 points crédités pour votre profil complet !',
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
      <ClubExplorer
        isEn={isEn}
        points={summary.availablePoints}
        creditFcfa={summary.ticketingCreditFcfa}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenPage={(page) => setCurrentPage(page)}
      />

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
                disabled={alreadyClaimedToday}
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
                    : isEn
                    ? 'Reveal my gift'
                    : 'Ouvrir ma surprise'}
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
              {FLASH_OFFERS.map((offer) => {
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
            {REWARDS_CATALOG.map((item) => {
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-6">
            {/* Carte code personnel */}
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-8 space-y-6">
              <div>
                <p className="text-xs tracking-[0.18em] text-[#FFFFFF] uppercase mb-2">
                  {isEn ? 'Your personal referral code' : 'Votre code de parrainage personnel'}
                </p>
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight text-balance">
                  {isEn
                    ? 'Give 500 FCFA, receive 500 FCFA & 200 points.'
                    : 'Offrez 500 F CFA, recevez 500 F CFA et 200 points.'}
                </h2>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-h-[52px] px-5 rounded-2xl bg-black border border-[#FFFFFF]/40 flex items-center justify-between">
                  <span className="font-mono text-lg sm:text-xl font-bold tracking-widest text-white">
                    {myReferralCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReferralCode}
                    className="min-h-[40px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-agrandir-bold text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? (isEn ? 'Copied' : 'Copié') : isEn ? 'Copy' : 'Copier'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleShareReferral}
                  className="min-h-[52px] px-6 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{isEn ? 'Invite a friend' : 'Inviter un ami'}</span>
                </button>
              </div>

              {/* Parcours en 3 étapes */}
              <ol className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4 border-t border-white/10">
                {[
                  {
                    step: '01',
                    titleFr: 'L’ami télécharge l’app',
                    titleEn: 'Friend gets the app',
                    descFr: 'Partagez votre lien ou votre code unique.',
                    descEn: 'Share your unique referral link or code.',
                  },
                  {
                    step: '02',
                    titleFr: 'Il crée son compte',
                    titleEn: 'Creates an account',
                    descFr: 'Il entre votre code dans son espace parrainage.',
                    descEn: 'They enter your code in their referral hub.',
                  },
                  {
                    step: '03',
                    titleFr: 'Premier achat validé',
                    titleEn: 'First purchase completed',
                    descFr: '500 F CFA chacun + 200 points pour vous.',
                    descEn: '500 FCFA each + 200 points for you.',
                  },
                ].map((s) => (
                  <li key={s.step} className="space-y-1.5">
                    <span className="font-mono text-xs text-[#FFFFFF] font-bold">{s.step}</span>
                    <div className="font-agrandir-bold text-sm text-white">
                      {isEn ? s.titleEn : s.titleFr}
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {isEn ? s.descEn : s.descFr}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* Suivi des amis invités */}
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-agrandir-extrabold text-base text-white">
                  {isEn ? 'Track your invited friends' : 'Suivi de vos filleuls'}
                </h3>
                <span className="text-xs text-neutral-400 tabular-nums">
                  {pointsState.referrals.length} {isEn ? 'invited' : 'invités'}
                </span>
              </div>

              <form onSubmit={handleRegisterFriendInvite} className="flex gap-2">
                <input
                  type="text"
                  value={inviteFriendName}
                  onChange={(e) => setInviteFriendName(e.target.value)}
                  placeholder={isEn ? 'Friend name to track...' : 'Prénom de l’ami invité...'}
                  className="flex-1 min-h-[44px] px-4 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#FFFFFF] focus:outline-none"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-white/10 hover:bg-white hover:text-black text-white text-xs font-agrandir-bold transition-colors cursor-pointer shrink-0"
                >
                  {isEn ? 'Add' : 'Suivre'}
                </button>
              </form>

              {pointsState.referrals.length === 0 ? (
                <p className="text-xs text-neutral-400 pt-2">
                  {isEn
                    ? 'No referrals tracked yet. Share your code above to earn 500 FCFA + 200 pts per friend.'
                    : 'Aucun filleul enregistré pour l’instant. Partagez votre code ci-dessus pour gagner 500 F CFA + 200 pts par ami.'}
                </p>
              ) : (
                <div className="divide-y divide-white/8">
                  {pointsState.referrals.map((ref) => (
                    <div key={ref.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-agrandir-bold text-white">{ref.friendName}</div>
                        <div className="text-xs text-neutral-400">
                          {ref.status === 'purchased'
                            ? isEn
                              ? 'First ticket purchased · +500 FCFA & +200 pts'
                              : '1er achat validé · +500 F CFA & +200 pts'
                            : isEn
                            ? 'Invited · Waiting for first ticket purchase'
                            : 'Invité · En attente du premier achat'}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-mono ${
                          ref.status === 'purchased' ? 'text-emerald-400' : 'text-neutral-400'
                        }`}
                      >
                        {ref.status === 'purchased' ? '+500 F CFA' : isEn ? 'Pending' : 'En cours'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Colonne droite : Saisir le code d'un parrain */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7 space-y-4">
              <h3 className="font-agrandir-extrabold text-lg text-white">
                {isEn ? 'Have a friend’s referral code?' : 'Vous avez le code d’un ami ?'}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                {isEn
                  ? 'Enter your friend’s code to unlock 500 FCFA of ticketing credit on your account.'
                  : 'Entrez le code de la personne qui vous a invité pour recevoir immédiatement 500 F CFA de crédit billetterie.'}
              </p>

              {pointsState.appliedReferralCode ? (
                <div className="p-4 rounded-2xl bg-black border border-emerald-500/30 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-agrandir-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEn ? 'Referral code active' : 'Code parrain activé'}</span>
                  </div>
                  <div className="text-sm font-mono text-white">{pointsState.appliedReferralCode}</div>
                  <div className="text-xs text-neutral-400">
                    {isEn ? '+500 FCFA ticketing credit applied' : '+500 F CFA de crédit billetterie crédités'}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplyFriendCode} className="space-y-3">
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                    placeholder="LMR-XXXXX"
                    className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/15 font-mono text-sm uppercase tracking-wider text-white focus:border-[#FFFFFF] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full min-h-[46px] rounded-xl bg-[#FFFFFF] hover:bg-[#e5c252] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {isEn ? 'Activate 500 FCFA credit' : 'Activer mes 500 F CFA'}
                  </button>
                </form>
              )}
            </section>

            {/* Rappel crédit disponible */}
            <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 text-[#FFFFFF]" />
                <div className="text-sm font-agrandir-bold text-white">
                  {isEn ? 'Your referral rewards' : 'Vos avantages parrainage'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <div className="text-xs text-neutral-400">{isEn ? 'Referrer' : 'Parrain'}</div>
                  <div className="text-base font-agrandir-extrabold text-white tabular-nums mt-0.5">500 F CFA</div>
                  <div className="text-[11px] text-[#FFFFFF] font-mono">+200 pts</div>
                </div>
                <div>
                  <div className="text-xs text-neutral-400">{isEn ? 'New member' : 'Nouvel invité'}</div>
                  <div className="text-base font-agrandir-extrabold text-white tabular-nums mt-0.5">500 F CFA</div>
                  <div className="text-[11px] text-neutral-400">{isEn ? 'Ticketing credit' : 'Crédit billetterie'}</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
      </motion.div>
      </AnimatePresence>
    </div>
  );
};
