import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  POINTS_RULES,
  REFERRAL_CREDIT_FCFA,
  RedeemedReward,
  computeUserPointsSummary,
  generateReferralCode,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import {
  BottomSheet,
  ScrollReveal,
  Tabs,
} from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import {
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Upload,
} from 'lucide-react';

type RewardsViewMode = 'points' | 'store' | 'referral';
type StoreCategoryTab = 'billets' | 'experiences' | 'surprises' | 'avantages';

interface StoreRewardItem {
  id: string;
  tab: StoreCategoryTab;
  category: RedeemedReward['category'];
  pointsCost: number;
  badgeFr: string;
  badgeEn: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  conditionsFr: string;
  conditionsEn: string;
  featured?: boolean;
  imageUrl?: string;
}

/**
 * Écrans 08 (Mes points), 09 (Parrainage) et 10 (Rewards Store) —
 * Reproduction fidèle aux maquettes officielles LUMARÉEL (0px cartes, 4px boutons, #D4AF6A).
 */
export const RewardsHubView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    events,
    setCurrentPage,
    rewardsInitialMode,
    setRewardsInitialMode,
    setIsAuthModalOpen,
    showToast,
    language,
  } = useApp();
  const isEn = language === 'en';

  const [viewMode, setViewMode] = useState<RewardsViewMode>(rewardsInitialMode || 'points');
  const [storeTab, setStoreTab] = useState<StoreCategoryTab>('billets');
  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));

  useEffect(() => {
    if (rewardsInitialMode) {
      setViewMode(rewardsInitialMode);
    }
  }, [rewardsInitialMode]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modales BottomSheet
  const [selectedReward, setSelectedReward] = useState<StoreRewardItem | null>(null);
  const [confirmedVoucher, setConfirmedVoucher] = useState<RedeemedReward | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);

  // Formulaire discret de code parrain d'un ami
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [showFriendCodeForm, setShowFriendCodeForm] = useState(false);

  const myReferralCode = useMemo(() => generateReferralCode(currentUser), [currentUser]);
  const summary = useMemo(
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
    [currentUser, customerOrders, pointsState]
  );

  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );
  const firstEvent = publishedEvents[0];
  const secondEvent = publishedEvents[1] || firstEvent;
  const thirdEvent = publishedEvents[2] || secondEvent || firstEvent;

  const storeCatalog = useMemo<StoreRewardItem[]>(
    () => [
      {
        id: 'rew_carre_or',
        tab: 'billets',
        category: 'free_ticket',
        pointsCost: 800,
        badgeFr: 'À LA UNE',
        badgeEn: 'FEATURED',
        titleFr: `Billet Carré Or — ${firstEvent?.artist || 'DOPELYM'}`,
        titleEn: `Golden Circle Ticket — ${firstEvent?.artist || 'DOPELYM'}`,
        descFr: 'Catégorie supérieure, entrée dédiée.',
        descEn: 'Upper tier seating, dedicated entrance.',
        conditionsFr:
          'Valable pour 1 personne sur la date concernée. Non remboursable et non échangeable contre des espèces.',
        conditionsEn:
          'Valid for 1 guest on the selected show date. Non-refundable and no cash value.',
        featured: true,
        imageUrl:
          firstEvent?.officialPoster || firstEvent?.bannerImage || COMMUNITY_MEDIA.vipMezzanineImg,
      },
      {
        id: 'rew_standard_1',
        tab: 'billets',
        category: 'free_ticket',
        pointsCost: 600,
        badgeFr: 'DISPONIBLE',
        badgeEn: 'AVAILABLE',
        titleFr: `Billet Standard — ${secondEvent?.artist || 'TRK'}`,
        titleEn: `Standard Ticket — ${secondEvent?.artist || 'TRK'}`,
        descFr: 'Votre place pour la prochaine date.',
        descEn: 'Your seat for the upcoming show.',
        conditionsFr:
          'Émission immédiate de votre bon nominatif. À présenter ou appliquer avant la date du concert.',
        conditionsEn:
          'Instant personal voucher issued. Present or apply before the concert date.',
        imageUrl:
          secondEvent?.officialPoster ||
          secondEvent?.bannerImage ||
          COMMUNITY_MEDIA.concertMemoriesCrowdImg,
      },
      {
        id: 'rew_vip_2',
        tab: 'billets',
        category: 'free_ticket',
        pointsCost: 950,
        badgeFr: 'PLUS QUE 5',
        badgeEn: 'ONLY 5 LEFT',
        titleFr: `Billet VIP — ${thirdEvent?.artist || 'JEUNE LION'}`,
        titleEn: `VIP Ticket — ${thirdEvent?.artist || 'JEUNE LION'}`,
        descFr: 'Selon disponibilité VIP.',
        descEn: 'Subject to VIP allocation.',
        conditionsFr: 'Sous réserve du quota VIP restant. Accès prioritaire inclus.',
        conditionsEn: 'Subject to remaining VIP quota. Priority entrance included.',
        imageUrl:
          thirdEvent?.officialPoster || thirdEvent?.bannerImage || COMMUNITY_MEDIA.crowdArchiveImg,
      },
      {
        id: 'rew_private_night',
        tab: 'experiences',
        category: 'private_invite',
        pointsCost: 1200,
        badgeFr: 'BIENTÔT',
        badgeEn: 'SOON',
        titleFr: 'Soirée réservée membres',
        titleEn: 'Members-only private night',
        descFr: 'Événement fermé au public.',
        descEn: 'Private closed-door gathering.',
        conditionsFr:
          'Invitation nominative pour la prochaine session privée LUMARÉEL à Abidjan.',
        conditionsEn: 'Personal invite for the next private LUMARÉEL session in Abidjan.',
        imageUrl: COMMUNITY_MEDIA.vipMezzanineImg,
      },
      {
        id: 'rew_backstage_exp',
        tab: 'experiences',
        category: 'backstage_exp',
        pointsCost: 900,
        badgeFr: 'DISPONIBLE',
        badgeEn: 'AVAILABLE',
        titleFr: 'Accès Lounge & balances',
        titleEn: 'Lounge & soundcheck access',
        descFr: 'Les minutes avant la scène avec l’équipe.',
        descEn: 'Pre-show moments with the crew.',
        conditionsFr:
          'Accès encadré avant l’ouverture des portes. Billet du concert requis.',
        conditionsEn: 'Hosted pre-doors access. Valid concert ticket required.',
        imageUrl: COMMUNITY_MEDIA.backstageSoundcheckImg,
      },
      {
        id: 'rew_mystery_gift',
        tab: 'surprises',
        category: 'partner_discount',
        pointsCost: 350,
        badgeFr: 'DISPONIBLE',
        badgeEn: 'AVAILABLE',
        titleFr: 'Cadeau mystère membre',
        titleEn: 'Member mystery gift',
        descFr: 'Surprise exclusive LUMARÉEL.',
        descEn: 'Exclusive LUMARÉEL surprise.',
        conditionsFr: 'À retirer sur présentation du bon lors de votre prochain événement.',
        conditionsEn: 'Redeemable on site at your next LUMARÉEL event.',
        imageUrl: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
      },
      {
        id: 'rew_credit_2500',
        tab: 'avantages',
        category: 'credit',
        pointsCost: 400,
        badgeFr: 'DISPONIBLE',
        badgeEn: 'AVAILABLE',
        titleFr: 'Crédit billetterie 2 500 FCFA',
        titleEn: '2,500 FCFA ticketing credit',
        descFr: 'Déductible sur votre prochaine place.',
        descEn: 'Applied directly to your next ticket.',
        conditionsFr: 'Crédit immédiatement ajouté à votre compte billetterie LUMARÉEL.',
        conditionsEn: 'Credit immediately added to your LUMARÉEL ticketing account.',
        imageUrl: COMMUNITY_MEDIA.crowdArchiveImg,
      },
      {
        id: 'rew_partner_discount',
        tab: 'avantages',
        category: 'partner_discount',
        pointsCost: 350,
        badgeFr: 'DISPONIBLE',
        badgeEn: 'AVAILABLE',
        titleFr: 'Réduction partenaires -20 %',
        titleEn: 'Partner discount -20%',
        descFr: 'Valable chez nos lieux partenaires à Abidjan.',
        descEn: 'Valid across our Abidjan partner venues.',
        conditionsFr: 'Valable 60 jours chez les établissements partenaires LUMARÉEL.',
        conditionsEn: 'Valid 60 days across official LUMARÉEL partner venues.',
        imageUrl: COMMUNITY_MEDIA.vipMezzanineImg,
      },
    ],
    [firstEvent, secondEvent, thirdEvent]
  );

  const persist = (next: typeof pointsState) => {
    setPointsState(next);
    saveUserPointsState(currentUser, next);
  };

  const openRedeemSheet = (item: StoreRewardItem) => {
    setConfirmedVoucher(null);
    setSelectedReward(item);
  };

  const handleConfirmRedeem = () => {
    if (!selectedReward) return;
    if (!currentUser) {
      setSelectedReward(null);
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to redeem your points.' : 'Connectez-vous pour échanger vos points.',
        'info'
      );
      return;
    }
    if (summary.availablePoints < selectedReward.pointsCost) {
      const missing = selectedReward.pointsCost - summary.availablePoints;
      showToast(
        isEn
          ? `You need ${missing} more points to unlock this reward.`
          : `Il vous manque ${missing} points pour débloquer cette récompense.`,
        'error'
      );
      return;
    }

    const code = `LMR-${selectedReward.category.slice(0, 3).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
    const newReward: RedeemedReward = {
      id: `red_${Date.now()}`,
      rewardId: selectedReward.id,
      title: isEn ? selectedReward.titleEn : selectedReward.titleFr,
      category: selectedReward.category,
      pointsCost: selectedReward.pointsCost,
      voucherCode: code,
      redeemedAt: new Date().toISOString(),
      status: 'active',
    };
    const next = {
      ...pointsState,
      redeemedRewards: [newReward, ...pointsState.redeemedRewards],
      welcomeReferralCreditFcfa:
        selectedReward.id === 'rew_credit_2500'
          ? pointsState.welcomeReferralCreditFcfa + 2500
          : pointsState.welcomeReferralCreditFcfa,
    };
    persist(next);
    setConfirmedVoucher(newReward);
    showToast(
      isEn
        ? `Reward unlocked! Voucher code: ${code}`
        : `Récompense obtenue ! Code : ${code}`,
      'success'
    );
  };

  const handleCopyReferralCode = async () => {
    try {
      await navigator.clipboard.writeText(myReferralCode);
      setCopiedCode(true);
      showToast(
        isEn ? `Referral code ${myReferralCode} copied.` : `Code ${myReferralCode} copié.`,
        'success'
      );
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      showToast(myReferralCode, 'info');
    }
  };

  const handleShareReferral = async () => {
    const shareText = isEn
      ? `Join LUMARÉEL with my code ${myReferralCode} and earn rewards on your first ticket.`
      : `Rejoins LUMARÉEL avec mon code ${myReferralCode} et profite de nos avantages dès ton premier achat !`;
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/?ref=${encodeURIComponent(myReferralCode)}`
        : `https://lumareel.co/i/${myReferralCode.toLowerCase()}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'LUMARÉEL — Parrainage',
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast(
        isEn ? 'Referral link copied.' : 'Lien de parrainage copié.',
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
      return;
    }
    const clean = friendCodeInput.trim().toUpperCase();
    if (!clean || clean.length < 5) {
      showToast(
        isEn ? 'Enter a valid referral code.' : 'Saisissez un code de parrainage valide.',
        'error'
      );
      return;
    }
    if (clean === myReferralCode) {
      showToast(
        isEn ? 'Self-referral is not allowed.' : "L'auto-parrainage n'est pas autorisé.",
        'error'
      );
      return;
    }
    if (pointsState.appliedReferralCode) {
      showToast(
        isEn ? 'A referral code is already active.' : 'Un code parrain est déjà actif.',
        'info'
      );
      return;
    }
    persist({
      ...pointsState,
      appliedReferralCode: clean,
      welcomeReferralCreditFcfa: pointsState.welcomeReferralCreditFcfa + REFERRAL_CREDIT_FCFA,
    });
    setFriendCodeInput('');
    setShowFriendCodeForm(false);
    showToast(
      isEn ? 'Referral code applied! +500 FCFA credit.' : 'Code parrain validé ! +500 FCFA de crédit.',
      'success'
    );
  };

  const nextRewardTarget = 900;
  const progressPct = Math.min(100, Math.round((summary.availablePoints / nextRewardTarget) * 100));

  const recentOperations = useMemo(() => {
    const ops: Array<{
      id: string;
      title: string;
      subtitle: string;
      delta: string;
      isCredit: boolean;
    }> = [];

    pointsState.redeemedRewards.forEach((rw) => {
      ops.push({
        id: rw.id,
        title: rw.title,
        subtitle: `Échange · ${new Date(rw.redeemedAt).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
        })}`,
        delta: `−${rw.pointsCost}`,
        isCredit: false,
      });
    });

    summary.breakdown.forEach((b) => {
      ops.push({
        id: b.id,
        title: isEn ? b.labelEn : b.labelFr,
        subtitle: isEn ? 'Verified activity' : 'Activité validée',
        delta: `+${b.points}`,
        isCredit: true,
      });
    });

    return ops;
  }, [pointsState.redeemedRewards, summary.breakdown, isEn]);

  // =========================================================================
  // ÉCRAN 10 : REWARDS STORE (FIDÈLE 1:1 À LA MAQUETTE 10 — 0px CARTES)
  // =========================================================================
  if (viewMode === 'store') {
    const featuredItem = storeCatalog[0];
    const gridItems = storeCatalog.filter((item) =>
      storeTab === 'billets' ? !item.featured : item.tab === storeTab
    );

    const remainingAfterRedeem = selectedReward
      ? summary.availablePoints - selectedReward.pointsCost
      : 0;

    return (
      <div
        className="min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* Barre supérieure : < Mes points | [SOLDE] pts (pilule dorée) */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
            onClick={() => setViewMode('points')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
            <span>{isEn ? 'My points' : 'Mes points'}</span>
          </button>

          <span className="px-3.5 py-1.5 rounded-full border border-[#D4AF6A]/70 text-[#D4AF6A] text-xs font-agrandir-extrabold tabular-nums">
            {summary.availablePoints.toLocaleString('fr-FR')} pts
          </span>
        </div>

        {/* En-tête */}
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="font-agrandir-extrabold text-[2.25rem] sm:text-5xl text-white tracking-tight leading-none">
              Rewards Store
            </h1>
            <p className="mt-2 text-sm text-[#9A9A9A]">
              {isEn
                ? 'Turn your points into real experiences.'
                : 'Transformez vos points en expériences réelles.'}
            </p>
          </div>
          <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-[#0E0E0E] border border-white/[0.12] items-center justify-center shrink-0">
            <Icons.Catalog size="md" accent="mono" />
          </div>
        </header>

        {/* 4 onglets soulignés : Billets | Expériences | Surprises | Avantages */}
        <Tabs<StoreCategoryTab>
          activeId={storeTab}
          onChange={setStoreTab}
          className="mb-6"
          items={[
            { id: 'billets', label: isEn ? 'Tickets' : 'Billets' },
            { id: 'experiences', label: isEn ? 'Experiences' : 'Expériences' },
            { id: 'surprises', label: 'Surprises' },
            { id: 'avantages', label: isEn ? 'Perks' : 'Avantages' },
          ]}
        />

        <div className="space-y-6">
          {/* Carte vedette À LA UNE — arrondi 22px */}
          {storeTab === 'billets' && featuredItem && (
            <article className="relative rounded-[22px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] min-h-[340px] sm:min-h-[380px] flex flex-col justify-between p-5 sm:p-7">
              {featuredItem.imageUrl && (
                <img
                  src={featuredItem.imageUrl}
                  alt={isEn ? featuredItem.titleEn : featuredItem.titleFr}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-55"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/30" />

              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full bg-black/70 border border-white/[0.12] text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  {isEn ? featuredItem.badgeEn : featuredItem.badgeFr}
                </span>
                <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                  LUMARÉEL
                </span>
              </div>

              <div className="relative z-10 space-y-4">
                <div>
                  <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight max-w-md">
                    {isEn ? featuredItem.titleEn : featuredItem.titleFr}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-[#C8C8C8]">
                    {isEn ? featuredItem.descEn : featuredItem.descFr}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="font-agrandir-extrabold text-base sm:text-lg text-[#D4AF6A] tabular-nums">
                    {featuredItem.pointsCost.toLocaleString('fr-FR')} pts
                  </span>
                  <button
                    type="button"
                    onClick={() => openRedeemSheet(featuredItem)}
                    className="min-h-[42px] px-6 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer lum-press"
                  >
                    {isEn ? 'Redeem' : 'Échanger'}
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Grille 2 colonnes (3–4 desktop) de récompenses — arrondi 18px */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {gridItems.map((item) => (
              <article key={item.id} className="group flex flex-col justify-between space-y-2.5">
                <div>
                  <button
                    type="button"
                    onClick={() => openRedeemSheet(item)}
                    className="relative aspect-[4/5] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 block text-left cursor-pointer lum-press transition-colors"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={isEn ? item.titleEn : item.titleFr}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover opacity-75 group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/35" />
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/80 text-[9px] font-agrandir-extrabold uppercase tracking-[0.14em] text-[#D4AF6A]">
                      {isEn ? item.badgeEn : item.badgeFr}
                    </span>
                  </button>

                  <h3 className="mt-2.5 font-agrandir-extrabold text-sm sm:text-base text-white leading-snug">
                    {isEn ? item.titleEn : item.titleFr}
                  </h3>
                  <p className="mt-1 text-xs text-[#9A9A9A] leading-snug line-clamp-2">
                    {isEn ? item.descEn : item.descFr}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => openRedeemSheet(item)}
                  className="text-left font-agrandir-extrabold text-xs sm:text-sm text-[#D4AF6A] hover:text-[#DFBE7D] tabular-nums cursor-pointer"
                >
                  {item.pointsCost.toLocaleString('fr-FR')} pts
                </button>
              </article>
            ))}
          </div>

          {/* Note de catalogue */}
          <p className="pt-3 text-xs text-[#9A9A9A] leading-relaxed max-w-xl">
            {isEn
              ? 'Catalog updated based on events and availability. Artist experiences are only offered when scheduled.'
              : "Catalogue mis à jour selon les événements et les disponibilités. Les expériences avec artistes ne sont proposées que lorsqu'elles sont organisées."}
          </p>

          {/* Récompenses déjà échangées */}
          {pointsState.redeemedRewards.length > 0 && (
            <section className="pt-5 border-t border-white/[0.12] space-y-3">
              <h2 className="font-agrandir-extrabold text-base text-white">
                {isEn ? 'Unlocked rewards' : 'Vos bons débloqués'}
              </h2>
              <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                {pointsState.redeemedRewards.map((rw) => (
                  <div key={rw.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-agrandir-extrabold text-sm text-white truncate">
                        {rw.title}
                      </p>
                      <p className="text-xs text-[#9A9A9A]">−{rw.pointsCost} pts</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard?.writeText(rw.voucherCode).catch(() => {});
                        showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#0E0E0E] border border-white/[0.16] font-mono text-xs text-[#D4AF6A] flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>{rw.voucherCode}</span>
                      <Copy className="w-3 h-3" strokeWidth={1.6} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* BOTTOM SHEET ÉCHANGE + CONFIRMATION AVEC CODE */}
        <BottomSheet
          open={Boolean(selectedReward)}
          onClose={() => {
            setSelectedReward(null);
            setConfirmedVoucher(null);
          }}
          kicker="REWARDS STORE"
          title={
            confirmedVoucher
              ? isEn
                ? 'Reward confirmed'
                : 'Échange confirmé'
              : selectedReward
              ? isEn
                ? selectedReward.titleEn
                : selectedReward.titleFr
              : ''
          }
        >
          {confirmedVoucher ? (
            <div className="space-y-5">
              <div className="p-4 rounded-[16px] bg-[#0F2A1A] border border-[#7FE0A6]/30 flex items-center gap-3 text-[#7FE0A6]">
                <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={1.6} />
                <p className="text-xs sm:text-sm font-agrandir-semibold">
                  {isEn
                    ? 'Your voucher is active and saved in your account.'
                    : 'Votre bon est actif et enregistré dans votre compte.'}
                </p>
              </div>

              <div className="p-5 rounded-[18px] bg-black border border-white/[0.14] text-center space-y-2">
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                  {isEn ? 'VOUCHER CODE' : 'CODE DU BON'}
                </p>
                <p className="font-mono text-xl sm:text-2xl font-bold tracking-[0.14em] text-[#D4AF6A]">
                  {confirmedVoucher.voucherCode}
                </p>
                <p className="text-xs text-[#9A9A9A]">{confirmedVoucher.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(confirmedVoucher.voucherCode).catch(() => {});
                    showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                  }}
                  className="min-h-[46px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer lum-press"
                >
                  <Copy className="w-4 h-4" strokeWidth={1.6} />
                  <span>{isEn ? 'Copy code' : 'Copier le code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReward(null);
                    setConfirmedVoucher(null);
                  }}
                  className="min-h-[46px] rounded-full border border-white/25 hover:border-white text-white font-agrandir-extrabold text-xs cursor-pointer"
                >
                  {isEn ? 'Done' : 'Fermer'}
                </button>
              </div>
            </div>
          ) : (
            selectedReward && (
              <div className="space-y-5">
                <p className="text-sm text-[#C8C8C8] leading-relaxed">
                  {isEn ? selectedReward.descEn : selectedReward.descFr}
                </p>

                <div className="border-y border-white/[0.12] divide-y divide-white/[0.12] text-sm">
                  <div className="py-3 flex items-center justify-between gap-3">
                    <span className="text-[#9A9A9A]">{isEn ? 'Reward cost' : 'Coût de la récompense'}</span>
                    <span className="font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                      {selectedReward.pointsCost.toLocaleString('fr-FR')} pts
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-3">
                    <span className="text-[#9A9A9A]">{isEn ? 'Current balance' : 'Solde actuel'}</span>
                    <span className="font-agrandir-extrabold text-white tabular-nums">
                      {summary.availablePoints.toLocaleString('fr-FR')} pts
                    </span>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-3">
                    <span className="text-[#9A9A9A]">{isEn ? 'Balance after exchange' : 'Solde après échange'}</span>
                    <span
                      className={`font-agrandir-extrabold tabular-nums ${
                        remainingAfterRedeem >= 0 ? 'text-[#7FE0A6]' : 'text-[#F29AA4]'
                      }`}
                    >
                      {remainingAfterRedeem >= 0
                        ? `${remainingAfterRedeem.toLocaleString('fr-FR')} pts`
                        : isEn
                        ? `${Math.abs(remainingAfterRedeem)} pts missing`
                        : `Manque ${Math.abs(remainingAfterRedeem)} pts`}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#9A9A9A] leading-relaxed">
                  {isEn ? selectedReward.conditionsEn : selectedReward.conditionsFr}
                </p>

                <button
                  type="button"
                  disabled={Boolean(currentUser) && remainingAfterRedeem < 0}
                  onClick={handleConfirmRedeem}
                  className="w-full min-h-[48px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed lum-press"
                >
                  {!currentUser
                    ? isEn
                      ? 'Sign in to redeem'
                      : 'Se connecter pour échanger'
                    : remainingAfterRedeem < 0
                    ? isEn
                      ? 'Insufficient points'
                      : 'Solde insuffisant'
                    : isEn
                    ? 'Confirm exchange'
                    : "Confirmer l'échange"}
                </button>
              </div>
            )
          )}
        </BottomSheet>
      </div>
    );
  }

  // =========================================================================
  // ÉCRAN 09 : PARRAINAGE (FIDÈLE 1:1 À LA MAQUETTE 09 — 0px CARTES)
  // =========================================================================
  if (viewMode === 'referral') {
    const invitationsCount = pointsState.referrals.length;
    const signedUpCount = pointsState.referrals.filter(
      (r) => r.status === 'signed_up' || r.status === 'purchased'
    ).length;
    const validatedCount = pointsState.referrals.filter((r) => r.status === 'purchased').length;

    return (
      <div
        className="min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={() => setViewMode('points')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer mb-5"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>{isEn ? 'My points' : 'Mes points'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Colonne gauche : Hero + Carte code (0px) + Compteurs */}
          <div className="lg:col-span-6 space-y-6">
            <header className="space-y-3">
              <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                {isEn ? 'REFERRAL' : 'PARRAINAGE'}
              </p>
              <h1 className="font-agrandir-extrabold text-[2.45rem] sm:text-5xl text-white leading-[0.98] tracking-tight">
                {isEn ? (
                  <>
                    Invite.
                    <br />
                    Live it
                    <br />
                    together.
                  </>
                ) : (
                  <>
                    Invitez.
                    <br />
                    Vivez-le
                    <br />
                    ensemble.
                  </>
                )}
              </h1>
              <p className="text-sm text-[#C8C8C8] leading-relaxed max-w-md">
                {isEn ? (
                  <>
                    When a friend joins LUMARÉEL and makes their first eligible purchase, you earn{' '}
                    <strong className="text-white font-agrandir-extrabold">
                      {POINTS_RULES.REFERRAL_PURCHASE} points
                    </strong>
                    .
                  </>
                ) : (
                  <>
                    Quand un proche rejoint LUMARÉEL et fait son premier achat éligible, vous gagnez{' '}
                    <strong className="text-white font-agrandir-extrabold">
                      {POINTS_RULES.REFERRAL_PURCHASE} points
                    </strong>
                    .
                  </>
                )}
              </p>
            </header>

            {/* Carte VOTRE CODE — arrondi 20px */}
            <section className="rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                  {isEn ? 'YOUR CODE' : 'VOTRE CODE'}
                </p>
                <Icons.Referral size="xs" accent="mono" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-[0.16em] text-white truncate">
                  {myReferralCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReferralCode}
                  className="min-h-[38px] px-4 rounded-full border border-white/25 hover:border-white text-xs font-agrandir-extrabold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedCode ? (
                    <Check className="w-3.5 h-3.5 text-[#7FE0A6]" strokeWidth={1.8} />
                  ) : (
                    <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                  )}
                  <span>{copiedCode ? (isEn ? 'Copied' : 'Copié') : isEn ? 'Copy' : 'Copier'}</span>
                </button>
              </div>

              <p className="text-xs text-[#9A9A9A] font-mono truncate">
                lumareel.co/i/{myReferralCode.toLowerCase()}
              </p>

              <button
                type="button"
                onClick={handleShareReferral}
                className="w-full min-h-[48px] rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer lum-press"
              >
                <Upload className="w-4 h-4" strokeWidth={1.6} />
                <span>{isEn ? 'Share my link' : 'Partager mon lien'}</span>
              </button>
            </section>

            {/* 3 compteurs : Invitations | Inscrits | Validés */}
            <div className="grid grid-cols-3 border-y border-white/[0.12] divide-x divide-white/[0.12] py-4">
              <div className="pr-3">
                <div className="font-agrandir-extrabold text-2xl text-white tabular-nums">
                  {invitationsCount}
                </div>
                <div className="text-xs text-[#9A9A9A] mt-0.5">
                  {isEn ? 'Invites' : 'Invitations'}
                </div>
              </div>
              <div className="px-4">
                <div className="font-agrandir-extrabold text-2xl text-white tabular-nums">
                  {signedUpCount}
                </div>
                <div className="text-xs text-[#9A9A9A] mt-0.5">
                  {isEn ? 'Signed up' : 'Inscrits'}
                </div>
              </div>
              <div className="pl-4">
                <div className="font-agrandir-extrabold text-2xl text-[#D4AF6A] tabular-nums">
                  {validatedCount}
                </div>
                <div className="text-xs text-[#9A9A9A] mt-0.5">
                  {isEn ? 'Validated' : 'Validés'}
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite : Comment ça marche (catalogue 3 icônes) + Mes invitations */}
          <div className="lg:col-span-6 space-y-8">
            <section className="space-y-4">
              <h2 className="font-agrandir-extrabold text-xl text-white">
                {isEn ? 'How it works' : 'Comment ça marche'}
              </h2>

              <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
                {[
                  {
                    n: '01',
                    Icon: Icons.StepShare,
                    title: isEn ? 'Share' : 'Partagez',
                    desc: isEn ? 'Your code' : 'Votre code',
                  },
                  {
                    n: '02',
                    Icon: Icons.StepJoin,
                    title: isEn ? 'Sign up' : 'Inscription',
                    desc: isEn ? 'Your friend' : 'Votre proche',
                  },
                  {
                    n: '03',
                    Icon: Icons.StepReward,
                    title: isEn ? 'Earn' : 'Crédités',
                    desc: `+${POINTS_RULES.REFERRAL_PURCHASE} pts`,
                  },
                ].map((step) => {
                  const Icon = step.Icon;
                  return (
                    <div
                      key={step.n}
                      className="p-3.5 sm:p-4 rounded-[18px] bg-[#0E0E0E] border border-white/[0.12] flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between">
                        <Icon size="md" accent="mono" className="w-8 h-8 sm:w-9 sm:h-9" />
                        <span className="text-[10px] font-mono text-[#9A9A9A]">{step.n}</span>
                      </div>
                      <div>
                        <p className="font-agrandir-extrabold text-xs sm:text-sm text-white leading-tight">
                          {step.title}
                        </p>
                        <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Mes invitations */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-agrandir-extrabold text-xl text-white">
                  {isEn ? 'My invitations' : 'Mes invitations'}
                </h2>
                {!pointsState.appliedReferralCode && (
                  <button
                    type="button"
                    onClick={() => setShowFriendCodeForm((p) => !p)}
                    className="text-xs text-[#D4AF6A] hover:underline cursor-pointer"
                  >
                    {isEn ? 'Have a code?' : "J'ai un code"}
                  </button>
                )}
              </div>

              {showFriendCodeForm && !pointsState.appliedReferralCode && (
                <form onSubmit={handleApplyFriendCode} className="flex gap-2 pb-2">
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={(e) => setFriendCodeInput(e.target.value.toUpperCase())}
                    placeholder="LMR-XXXXX"
                    className="flex-1 min-h-[44px] px-4 rounded-xl bg-[#0E0E0E] border border-white/[0.16] font-mono text-xs uppercase text-white outline-none focus:border-[#D4AF6A]"
                  />
                  <button
                    type="submit"
                    className="px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs cursor-pointer"
                  >
                    {isEn ? 'Apply' : 'Valider'}
                  </button>
                </form>
              )}

              {pointsState.appliedReferralCode && (
                <div className="p-3.5 rounded-[16px] bg-[#0E0E0E] border border-[#7FE0A6]/35 flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 text-[#7FE0A6] font-agrandir-semibold">
                    <CheckCircle2 className="w-4 h-4" strokeWidth={1.6} />
                    <span>Code parrain {pointsState.appliedReferralCode} actif</span>
                  </span>
                  <span className="font-mono text-white">+500 FCFA</span>
                </div>
              )}

              {pointsState.referrals.length === 0 ? (
                <p className="py-4 text-xs text-[#9A9A9A] border-t border-white/[0.12]">
                  {isEn
                    ? 'Your invited friends and validation statuses will appear here.'
                    : 'Vos proches invités et leur statut de validation apparaîtront ici.'}
                </p>
              ) : (
                <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                  {pointsState.referrals.map((ref) => {
                    const initial = (ref.friendName || 'M').trim().charAt(0).toUpperCase();
                    const isValidated = ref.status === 'purchased';
                    return (
                      <div key={ref.id} className="py-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-9 h-9 rounded-full bg-[#141414] border border-white/[0.12] flex items-center justify-center font-agrandir-extrabold text-xs text-white shrink-0">
                            {initial}
                          </span>
                          <div className="min-w-0">
                            <p className="font-agrandir-extrabold text-sm text-white truncate">
                              {ref.friendName}
                            </p>
                            <p className="text-xs text-[#9A9A9A] truncate">
                              {isValidated
                                ? `Premier achat · ${new Date(ref.createdAt).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                  })}`
                                : "Inscrit · en attente d'un achat"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-agrandir-extrabold shrink-0 ${
                            isValidated ? 'text-[#7FE0A6]' : 'text-[#D4AF6A]'
                          }`}
                        >
                          {isValidated ? `Validé · +${ref.pointsAwarded}` : 'Inscrit'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="pt-2 text-[11px] text-[#9A9A9A] leading-relaxed">
                {isEn
                  ? 'One account per person. Self-referrals and duplicate accounts are excluded and may void points.'
                  : "Un compte par personne. L'auto-parrainage et les faux comptes sont exclus et peuvent entraîner l'annulation des points."}{' '}
                <button
                  type="button"
                  onClick={() => setIsRulesOpen(true)}
                  className="underline text-[#C8C8C8] hover:text-white cursor-pointer"
                >
                  {isEn ? 'Rules' : 'Règlement'}
                </button>
              </p>
            </section>
          </div>
        </div>

        <BottomSheet
          open={isRulesOpen}
          onClose={() => setIsRulesOpen(false)}
          kicker={isEn ? 'REFERRAL PROGRAM' : 'PROGRAMME PARRAINAGE'}
          title={isEn ? 'Rules & eligibility' : 'Règlement du parrainage'}
        >
          <div className="space-y-3 text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
            <p>
              {isEn
                ? `Every member receives a personal referral code. When an invited friend creates an account and completes their first paid ticket order, ${POINTS_RULES.REFERRAL_PURCHASE} points are credited automatically.`
                : `Chaque membre dispose d'un code personnel. Lorsqu'un proche crée son compte et finalise son premier achat de billet payant, ${POINTS_RULES.REFERRAL_PURCHASE} points sont crédités automatiquement.`}
            </p>
            <p>
              {isEn
                ? 'One account per individual. Self-referrals, duplicate accounts, or cancelled orders are excluded.'
                : "Un seul compte par personne. L'auto-parrainage, les comptes multiples et les commandes annulées sont exclus du programme."}
            </p>
          </div>
        </BottomSheet>
      </div>
    );
  }

  // =========================================================================
  // ÉCRAN 08 : MES POINTS (FIDÈLE 1:1 À LA MAQUETTE 08 — 0px CARTES)
  // =========================================================================
  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Lien retour < Explorer */}
      <button
        type="button"
        onClick={() => setCurrentPage('explore')}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer mb-4"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
        <span>{isEn ? 'Explore' : 'Explorer'}</span>
      </button>

      {/* En-tête : LUMARÉEL REWARDS / Mes points */}
      <header className="mb-6">
        <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
          LUMARÉEL REWARDS
        </p>
        <h1 className="mt-1 font-agrandir-extrabold text-[2.25rem] sm:text-5xl text-white tracking-tight leading-none">
          {isEn ? 'My points' : 'Mes points'}
        </h1>
      </header>

      <div className="space-y-10 max-w-4xl">
        {/* 1. CARTE SOLDE DISPONIBLE — arrondi 22px */}
        <section className="space-y-3">
          <div className="rounded-[22px] bg-gradient-to-br from-[#161513] via-[#0F0F0F] to-[#0A0A0A] border border-white/[0.14] p-5 sm:p-6 space-y-5">
            <div>
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
                {isEn ? 'AVAILABLE BALANCE' : 'SOLDE DISPONIBLE'}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-agrandir-extrabold text-4xl sm:text-5xl text-[#D4AF6A] tabular-nums leading-none">
                  {summary.availablePoints.toLocaleString('fr-FR')}
                </span>
                <span className="font-agrandir-extrabold text-lg sm:text-xl text-white">pts</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.12] grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
                  {isEn ? 'EARNED' : 'CUMULÉS'}
                </p>
                <p className="mt-0.5 font-agrandir-extrabold text-base text-white tabular-nums">
                  {summary.totalEarned.toLocaleString('fr-FR')} pts
                </p>
              </div>
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
                  {isEn ? 'SPENT' : 'DÉPENSÉS'}
                </p>
                <p className="mt-0.5 font-agrandir-extrabold text-base text-white tabular-nums">
                  {summary.totalSpent.toLocaleString('fr-FR')} pts
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-[#C8C8C8]">
                  {isEn ? 'Next reward:' : 'Prochaine récompense :'}{' '}
                  <strong className="font-agrandir-extrabold text-white">
                    {isEn ? 'VIP Lounge Access' : 'Accès Lounge VIP'}
                  </strong>
                </span>
                <span className="text-[#9A9A9A] tabular-nums shrink-0">
                  {nextRewardTarget} pts
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.1] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#D4AF6A] transition-all duration-500"
                  style={{ width: `${Math.max(8, progressPct)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-[#9A9A9A] leading-relaxed">
            {isEn
              ? 'Points are a LUMARÉEL loyalty currency. They have no cash value and cannot be withdrawn.'
              : "Les points sont une monnaie de fidélité LUMARÉEL. Ils ne représentent pas de l'argent et ne peuvent pas être retirés."}
          </p>
        </section>

        {/* 2. À VOTRE PORTÉE -> Rewards Store — arrondi moyen 10px */}
        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                {isEn ? 'Within reach' : 'À votre portée'}
              </h2>
              <button
                type="button"
                onClick={() => setViewMode('store')}
                className="text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
              >
                Rewards Store
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
              <button
                type="button"
                onClick={() => {
                  setStoreTab('billets');
                  setViewMode('store');
                }}
                className="group text-left cursor-pointer block lum-press"
              >
                <div className="relative aspect-[4/5] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                  <img
                    src={
                      firstEvent?.officialPoster ||
                      firstEvent?.bannerImage ||
                      COMMUNITY_MEDIA.vipMezzanineImg
                    }
                    alt="Billet Carré Or"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-75 group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-x-3.5 bottom-3.5">
                    <span className="font-agrandir-extrabold text-lg sm:text-xl uppercase text-white leading-[1.02] block">
                      BILLET
                      <br />
                      CARRÉ OR
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#C8C8C8] truncate">
                  {firstEvent?.artist || 'DOPELYM'}
                </p>
                <p className="text-xs font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                  800 pts
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStoreTab('surprises');
                  setViewMode('store');
                }}
                className="group text-left cursor-pointer block lum-press"
              >
                <div className="relative aspect-[4/5] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                  <img
                    src={COMMUNITY_MEDIA.concertMemoriesCrowdImg}
                    alt="Cadeau Mystère"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-65 group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-x-3.5 bottom-3.5">
                    <span className="font-agrandir-extrabold text-lg sm:text-xl uppercase text-white leading-[1.02] block">
                      CADEAU
                      <br />
                      MYSTÈRE
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#C8C8C8] truncate">
                  {isEn ? 'Member surprise' : 'Surprise membre'}
                </p>
                <p className="text-xs font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                  350 pts
                </p>
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* 3. CATALOGUE VISUEL — COLLECTION REWARDS (ICÔNES CENTRALISÉES B&W, ARRONDI 18px) */}
        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                {isEn ? 'Rewards Collection' : 'Collection Rewards'}
              </h2>
              <Icons.Catalog size="sm" accent="mono" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                {
                  id: 'store',
                  Icon: Icons.RewardsStore,
                  title: 'Rewards Store',
                  tag: isEn ? 'Redeem' : 'Échanger',
                  onClick: () => setViewMode('store'),
                },
                {
                  id: 'privileged',
                  Icon: Icons.PriorityAccess,
                  title: isEn ? 'Priority Access' : 'Accès privilégié',
                  tag: isEn ? 'Quotas' : 'Quotas VIP',
                  onClick: () => setCurrentPage('privileged_access'),
                },
                {
                  id: 'drops',
                  Icon: Icons.FlashDrops,
                  title: 'Flash Drops',
                  tag: isEn ? 'Limited' : 'Éphémère',
                  dot: true,
                  onClick: () => setCurrentPage('flash_drops'),
                },
                {
                  id: 'referral',
                  Icon: Icons.Referral,
                  title: isEn ? 'Referral' : 'Parrainage',
                  tag: '+200 pts',
                  onClick: () => {
                    setRewardsInitialMode('referral');
                    setViewMode('referral');
                  },
                },
                {
                  id: 'suggestions',
                  Icon: Icons.Suggestions,
                  title: isEn ? 'Suggestions' : 'Suggestions',
                  tag: isEn ? 'Vote' : 'Voter',
                  onClick: () => setCurrentPage('suggestions'),
                },
              ].map((tile) => {
                const Icon = tile.Icon;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={tile.onClick}
                    className="group p-4 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[136px] transition-colors cursor-pointer lum-press"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Icon size="md" accent="mono" className="w-10 h-10" />
                      {tile.dot && (
                        <span className="w-2 h-2 rounded-full bg-[#D4AF6A] mt-1 shrink-0" />
                      )}
                    </div>
                    <div className="pt-3">
                      <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                        {tile.title}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">{tile.tag}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* 4. GAGNER DES POINTS — GRILLE D'ICÔNES COMPACTE */}
        <ScrollReveal>
          <section className="space-y-4">
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
              {isEn ? 'Earn points' : 'Gagner des points'}
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  Icon: Icons.EarnTicket,
                  label: isEn ? 'Ticket order' : 'Achat billet',
                  pts: POINTS_RULES.STANDARD_TICKET,
                },
                {
                  Icon: Icons.EarnReferral,
                  label: isEn ? 'Referral' : 'Parrainage',
                  pts: POINTS_RULES.REFERRAL_PURCHASE,
                },
                {
                  Icon: Icons.EarnAttendance,
                  label: isEn ? 'Attendance' : 'Présence live',
                  pts: POINTS_RULES.CONCERT_ATTENDANCE_QR,
                },
                {
                  Icon: Icons.EarnIdea,
                  label: isEn ? 'Suggestion' : 'Idée retenue',
                  pts: POINTS_RULES.APP_CHALLENGE_SUGGESTION,
                },
              ].map((item) => {
                const Icon = item.Icon;
                return (
                  <div
                    key={item.label}
                    className="p-4 rounded-[18px] bg-[#0E0E0E] border border-white/[0.12] flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Icon size="sm" accent="mono" className="w-8 h-8" />
                      <span className="font-agrandir-extrabold text-xs text-[#D4AF6A] tabular-nums shrink-0">
                        +{item.pts}
                      </span>
                    </div>
                    <p className="font-agrandir-extrabold text-xs sm:text-sm text-white leading-tight">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        </ScrollReveal>

        {/* 5. DERNIÈRES OPÉRATIONS */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                {isEn ? 'Recent activity' : 'Dernières opérations'}
              </h2>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="text-xs text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
              >
                {isEn ? 'History' : 'Historique'}
              </button>
            </div>

            {recentOperations.length === 0 ? (
              <div className="py-5 border-t border-white/[0.12] text-xs text-[#9A9A9A]">
                {isEn
                  ? 'Your earned points and redeemed rewards will appear here.'
                  : 'Vos points cumulés et vos échanges apparaîtront ici.'}
              </div>
            ) : (
              <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
                {recentOperations.slice(0, 5).map((op) => (
                  <div
                    key={op.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-agrandir-extrabold text-sm text-white truncate">
                        {op.title}
                      </p>
                      <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                        {op.subtitle}
                      </p>
                    </div>
                    <span
                      className={`font-agrandir-extrabold text-sm tabular-nums shrink-0 ${
                        op.isCredit ? 'text-[#7FE0A6]' : 'text-[#C8C8C8]'
                      }`}
                    >
                      {op.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </ScrollReveal>
      </div>

      {/* BOTTOM SHEET HISTORIQUE COMPLET DES POINTS */}
      <BottomSheet
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        kicker="LUMARÉEL REWARDS"
        title={isEn ? 'Points history' : 'Historique des points'}
      >
        {recentOperations.length === 0 ? (
          <p className="text-xs text-[#9A9A9A] py-4">
            {isEn ? 'No activity recorded yet.' : 'Aucune opération enregistrée pour le moment.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
            {recentOperations.map((op) => (
              <div key={op.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white truncate">{op.title}</p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">{op.subtitle}</p>
                </div>
                <span
                  className={`font-agrandir-extrabold text-sm tabular-nums shrink-0 ${
                    op.isCredit ? 'text-[#7FE0A6]' : 'text-[#C8C8C8]'
                  }`}
                >
                  {op.delta}
                </span>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
