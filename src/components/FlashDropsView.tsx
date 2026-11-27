import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  COMMUNITY_MEDIA,
  ClaimedFlashOffer,
  RedeemedReward,
  computeUserPointsSummary,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import { formatDateLong } from '../utils/dateUtils';
import { StatusBadge } from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import { Bell, BellRing, ChevronLeft, Copy, Ticket } from 'lucide-react';

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
    titleFr: 'Bonus surprise +100 points fidélité',
    titleEn: 'Surprise bonus +100 loyalty points',
    detailFr: 'Utilisables dans votre Rewards Store.',
    detailEn: 'Redeemable inside your Rewards Store.',
  },
  {
    points: 50,
    titleFr: 'Bonus surprise +50 points fidélité',
    titleEn: 'Surprise bonus +50 loyalty points',
    detailFr: 'Cumulables avec vos achats de billets.',
    detailEn: 'Stackable with your ticket bookings.',
  },
];

/**
 * Écran 12 — Surprise Drops & Flash Sales (fidèle 1:1 à la maquette 12 — 0px cartes, 4px boutons, #D4AF6A).
 */
export const FlashDropsView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    events,
    setCheckoutEvent,
    setSelectedEventSlug,
    setCurrentPage,
    setIsAuthModalOpen,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<'drops' | 'flash'>('drops');
  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [revealedSurprise, setRevealedSurprise] = useState<ClaimedFlashOffer | null>(null);
  const [alertSubscribedIds, setAlertSubscribedIds] = useState<string[]>([]);

  const summary = useMemo(
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
    [currentUser, customerOrders, pointsState]
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyClaimedToday = pointsState.lastSurpriseClaimDate === todayKey;
  const flashPassAlreadyClaimed = pointsState.redeemedRewards.some(
    (r) => r.title === 'Pass Flash — Balances & Lounge'
  );

  const liveEventDrops = useMemo(() => {
    const published = (events || []).filter((ev) => ev.status !== 'draft');
    return published
      .map((ev) => {
        const categories = ev.categories || [];
        const totalQuota = categories.reduce((sum, c) => sum + Number(c.quota || 0), 0);
        const totalSold = categories.reduce((sum, c) => sum + Number(c.sold || 0), 0);
        const totalRemaining = Math.max(0, totalQuota - totalSold);
        const lowestPrice = categories.reduce((min, c) => {
          const price = Number(c.price || 0);
          if (price <= 0) return min;
          return min === 0 ? price : Math.min(min, price);
        }, 0);
        const currency = categories[0]?.currency || 'FCFA';
        return {
          event: ev,
          totalQuota: totalQuota || 120,
          totalRemaining: totalQuota > 0 ? totalRemaining : 34,
          lowestPrice: lowestPrice || 15000,
          currency,
        };
      })
      .filter((item) => item.totalRemaining > 0);
  }, [events]);

  const primaryEvent = liveEventDrops[0]?.event;
  const secondaryEvent = liveEventDrops[1]?.event || primaryEvent;

  const handleBookEvent = (event: ConcertEvent) => {
    if (!currentUser) {
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to reserve your tickets.' : 'Connectez-vous pour réserver vos billets.',
        'info'
      );
      return;
    }
    setCheckoutEvent(event);
  };

  const handleRedeemPointsFlash = (title: string, cost: number) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to redeem points.' : 'Connectez-vous pour échanger vos points.',
        'info'
      );
      return;
    }
    if (summary.availablePoints < cost) {
      showToast(
        isEn
          ? `You need ${cost - summary.availablePoints} more points.`
          : `Il vous manque ${cost - summary.availablePoints} points.`,
        'error'
      );
      return;
    }
    const code = `LMR-FLS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newReward: RedeemedReward = {
      id: `fls_${Date.now()}`,
      rewardId: `flash_${Date.now()}`,
      title,
      category: 'backstage_exp',
      pointsCost: cost,
      voucherCode: code,
      redeemedAt: new Date().toISOString(),
      status: 'active',
    };
    const next = {
      ...pointsState,
      redeemedRewards: [newReward, ...pointsState.redeemedRewards],
    };
    setPointsState(next);
    saveUserPointsState(currentUser, next);
    showToast(
      isEn ? `Flash offer claimed! Code: ${code}` : `Offre Flash débloquée ! Code : ${code}`,
      'success'
    );
  };

  const handleUnlockSurprise = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn
          ? 'Sign in to reveal your member surprise.'
          : 'Connectez-vous pour révéler votre surprise.',
        'info'
      );
      return;
    }
    if (alreadyClaimedToday) {
      showToast(
        isEn
          ? 'Today’s surprise has already been revealed.'
          : "Votre surprise du jour a déjà été révélée.",
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
    const next = {
      ...pointsState,
      bonusSurprisePoints: pointsState.bonusSurprisePoints + pick.points,
      lastSurpriseClaimDate: todayKey,
      claimedFlashOffers: [entry, ...pointsState.claimedFlashOffers],
    };
    setPointsState(next);
    saveUserPointsState(currentUser, next);
    setRevealedSurprise(entry);
    showToast(
      isEn ? `Surprise unlocked: ${pick.titleEn}` : `Surprise débloquée : ${pick.titleFr}`,
      'success'
    );
  };

  const toggleAlert = (dropId: string) => {
    setAlertSubscribedIds((prev) => {
      const exists = prev.includes(dropId);
      const next = exists ? prev.filter((id) => id !== dropId) : [...prev, dropId];
      showToast(
        exists
          ? isEn
            ? 'Drop alert removed.'
            : 'Alerte retirée.'
          : isEn
          ? 'You will be notified as soon as this drop opens.'
          : "Vous serez prévenu dès l'ouverture de ce drop.",
        'info'
      );
      return next;
    });
  };

  const formattedToday = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Lien retour < Discover */}
      <button
        type="button"
        onClick={() => setCurrentPage('explore')}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer mb-4"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
        <span>Discover</span>
      </button>

      {/* Titre massif 2 lignes */}
      <header className="mb-6 flex items-end justify-between gap-4">
        <h1 className="font-agrandir-extrabold text-[2.45rem] sm:text-5xl text-white leading-[0.98] tracking-tight">
          {isEn ? (
            <>
              Time is
              <br />
              ticking.
            </>
          ) : (
            <>
              Le temps
              <br />
              est compté.
            </>
          )}
        </h1>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-[#0E0E0E] border border-white/[0.12] items-center justify-center shrink-0">
          <Icons.FlashDrops size="md" accent="mono" />
        </div>
      </header>

      {/* Sélecteur pilule plein-largeur : Surprise Drops | Flash Sales */}
      <div className="grid grid-cols-2 p-1 rounded-full bg-[#141414] border border-white/[0.12] mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('drops')}
          className={`min-h-[42px] rounded-full text-xs sm:text-sm transition-colors cursor-pointer ${
            activeTab === 'drops'
              ? 'bg-white text-black font-agrandir-extrabold'
              : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
          }`}
        >
          Surprise Drops
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('flash')}
          className={`min-h-[42px] rounded-full text-xs sm:text-sm transition-colors cursor-pointer ${
            activeTab === 'flash'
              ? 'bg-white text-black font-agrandir-extrabold'
              : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
          }`}
        >
          Flash Sales
        </button>
      </div>

      {activeTab === 'drops' ? (
        <div className="space-y-8">
          <p className="text-sm text-[#C8C8C8] leading-relaxed max-w-xl">
            {isEn
              ? 'Unexpected rewards dropped without warning for the community. Some are redeemed with points, others are gifted.'
              : "Des récompenses inattendues, publiées sans prévenir pour la communauté. Certaines s'échangent contre des points, d'autres sont offertes."}
          </p>

          {/* Carte Mystery Drop avec bordure dorée — arrondi 22px + animation de révélation */}
          <section className="rounded-[22px] bg-gradient-to-b from-[#17120A] via-[#0E0D0A] to-[#0A0A0A] border border-[#D4AF6A]/45 p-5 sm:p-7 space-y-6 max-w-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  DROP #04
                </span>
                <StatusBadge
                  variant={alreadyClaimedToday ? 'neutral' : 'valid'}
                  label={
                    alreadyClaimedToday
                      ? isEn
                        ? 'CLAIMED'
                        : 'EXPIRÉ'
                      : isEn
                      ? 'ACTIVE'
                      : 'ACTIF'
                  }
                />
              </div>
              <span className="text-xs font-agrandir-extrabold text-white">
                {isEn ? 'Gifted · active members' : 'Offert · membres actifs'}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={revealedSurprise ? revealedSurprise.id : alreadyClaimedToday ? 'claimed' : 'ready'}
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -6 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="py-3 text-center space-y-3"
              >
                <Icons.SurpriseGift size="xl" accent="mono" className="w-14 h-14 mx-auto" />
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight">
                  {revealedSurprise ? (
                    revealedSurprise.title
                  ) : alreadyClaimedToday ? (
                    isEn ? 'Surprise revealed!' : 'Surprise révélée !'
                  ) : isEn ? (
                    <>
                      Something is
                      <br />
                      waiting for you.
                    </>
                  ) : (
                    <>
                      Quelque chose
                      <br />
                      vous attend.
                    </>
                  )}
                </h2>
                <p className="text-xs text-[#9A9A9A]">
                  {revealedSurprise
                    ? `${revealedSurprise.detail} · ${revealedSurprise.code}`
                    : isEn
                    ? `Available until ${formattedToday} · 14 left`
                    : `Disponible jusqu'au ${formattedToday} · 14 restants`}
                </p>
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={handleUnlockSurprise}
              disabled={alreadyClaimedToday}
              className={`w-full min-h-[50px] rounded-full font-agrandir-extrabold text-sm transition-colors ${
                alreadyClaimedToday
                  ? 'bg-white/10 text-[#9A9A9A] cursor-not-allowed'
                  : 'bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black cursor-pointer lum-press'
              }`}
            >
              {alreadyClaimedToday
                ? isEn
                  ? 'Revealed today'
                  : "Déjà révélée aujourd'hui"
                : isEn
                ? 'Reveal my surprise'
                : 'Révéler ma surprise'}
            </button>
          </section>

          {/* Autres drops — miniatures 14px + Me prévenir */}
          <section className="space-y-3 max-w-2xl">
            <h2 className="font-agrandir-extrabold text-xl text-white">
              {isEn ? 'Other drops' : 'Autres drops'}
            </h2>

            <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
              <div className="py-4 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentPage('rewards')}
                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[#16130D] border border-white/[0.12] shrink-0">
                    <img
                      src={COMMUNITY_MEDIA.backstageSoundcheckImg}
                      alt="Expérience Lounge VIP"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <p className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                        {isEn ? 'VIP Lounge Experience' : 'Expérience Lounge VIP'}
                      </p>
                      <StatusBadge variant="valid" label={isEn ? 'ACTIVE' : 'ACTIF'} />
                    </div>
                    <p className="text-xs text-[#9A9A9A] truncate">
                      {isEn
                        ? `Until ${tomorrow} · 6 left`
                        : `Jusqu'au ${tomorrow} · 6 restants`}
                    </p>
                  </div>
                </button>
                <span className="font-agrandir-extrabold text-xs sm:text-sm text-[#D4AF6A] tabular-nums shrink-0">
                  900 pts
                </span>
              </div>

              <div className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0 flex-1 text-left">
                  <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[#141414] border border-white/[0.12] shrink-0">
                    <img
                      src={
                        primaryEvent?.officialPoster ||
                        primaryEvent?.bannerImage ||
                        COMMUNITY_MEDIA.vipMezzanineImg
                      }
                      alt={primaryEvent?.artist || 'DOPELYM'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-agrandir-extrabold text-sm sm:text-base text-white truncate">
                        Cadeau {primaryEvent?.artist || 'DOPELYM'}
                      </p>
                      <StatusBadge
                        variant="study"
                        label={isEn ? 'COMING SOON' : 'BIENTÔT DISPONIBLE'}
                      />
                    </div>
                    <p className="text-xs text-[#9A9A9A] truncate">
                      {isEn ? 'Linked to 2026 edition' : "Lié à l'édition 2026"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleAlert('drop_upcoming_1')}
                    className={`min-h-[34px] px-3.5 rounded-full border text-[11px] font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      alertSubscribedIds.includes('drop_upcoming_1')
                        ? 'border-[#D4AF6A] text-[#D4AF6A] bg-[#D4AF6A]/10'
                        : 'border-white/20 text-[#C8C8C8] hover:border-white'
                    }`}
                  >
                    {alertSubscribedIds.includes('drop_upcoming_1') ? (
                      <BellRing className="w-3.5 h-3.5" strokeWidth={1.6} />
                    ) : (
                      <Bell className="w-3.5 h-3.5" strokeWidth={1.6} />
                    )}
                    <span>{isEn ? 'Notify me' : 'Me prévenir'}</span>
                  </button>
                </div>
              </div>

              {secondaryEvent && (
                <div className="py-4 flex items-center justify-between gap-4 opacity-50">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[#111111] border border-white/[0.08] shrink-0">
                      <img
                        src={secondaryEvent.officialPoster || secondaryEvent.bannerImage}
                        alt={secondaryEvent.title}
                        className="w-full h-full object-cover grayscale"
                      />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-agrandir-extrabold text-sm sm:text-base text-[#C8C8C8] truncate">
                          Billet offert — {secondaryEvent.artist || secondaryEvent.title}
                        </p>
                        <StatusBadge variant="neutral" label={isEn ? 'EXPIRED' : 'EXPIRÉ'} />
                      </div>
                      <p className="text-xs text-[#9A9A9A]">
                        {isEn ? 'Operation ended' : 'Opération terminée'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Surprises déjà obtenues */}
          {pointsState.claimedFlashOffers.length > 0 && (
            <section className="space-y-3 max-w-2xl">
              <h3 className="font-agrandir-extrabold text-base text-white">
                {isEn ? 'Your revealed surprises' : 'Vos surprises révélées'}
              </h3>
              <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                {pointsState.claimedFlashOffers.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-agrandir-extrabold text-sm text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#9A9A9A] truncate">{item.detail}</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard?.writeText(item.code).catch(() => {});
                        showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-[#0E0E0E] border border-white/[0.16] font-mono text-xs text-[#D4AF6A] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>{item.code}</span>
                      <Copy className="w-3 h-3" strokeWidth={1.6} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ONGLET FLASH SALES : OFFRES PAYANT (FCFA) & POINTS AVEC COMPTE À REBOURS + BARRE QUANTITÉ */
        <div className="space-y-5 max-w-3xl">
          {/* Offre Flash POINTS dédiée */}
          <article className="rounded-[20px] bg-[#0E0E0E] border border-[#D4AF6A]/40 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge variant="points" label="POINTS" />
                <StatusBadge
                  variant={flashPassAlreadyClaimed ? 'neutral' : 'valid'}
                  label={
                    flashPassAlreadyClaimed
                      ? isEn
                        ? 'CLAIMED'
                        : 'OBTENU'
                      : isEn
                      ? 'ACTIVE'
                      : 'ACTIF'
                  }
                />
              </div>
              {!flashPassAlreadyClaimed && (
                <span className="text-xs text-[#C8C8C8] tabular-nums">
                  {isEn ? `Until ${tomorrow}` : `Jusqu'au ${tomorrow}`}
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-16 h-16 rounded-[14px] overflow-hidden bg-[#141414] border border-white/[0.12] shrink-0">
                  <img
                    src={COMMUNITY_MEDIA.backstageSoundcheckImg}
                    alt="Pass Balances Flash"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-agrandir-extrabold text-base text-white truncate">
                    {isEn ? 'Flash Pass — Soundcheck & Lounge' : 'Pass Flash — Balances & Lounge'}
                  </h3>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {formattedToday} → {tomorrow} · {isEn ? 'Members only · 1 per account' : 'Membres uniquement · 1 par compte'}
                  </p>
                  <p className="text-sm font-agrandir-extrabold text-[#D4AF6A] mt-1 tabular-nums">
                    650 pts
                  </p>
                </div>
              </div>

              {!flashPassAlreadyClaimed && (
                <button
                  type="button"
                  onClick={() => handleRedeemPointsFlash('Pass Flash — Balances & Lounge', 650)}
                  className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs whitespace-nowrap cursor-pointer shrink-0 lum-press"
                >
                  {isEn ? 'Redeem 650 pts' : 'Échanger · 650 pts'}
                </button>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="h-1.5 w-full rounded-full bg-white/[0.1] overflow-hidden">
                <div className="h-full rounded-full bg-[#D4AF6A]" style={{ width: '35%' }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#9A9A9A]">
                <span>{isEn ? 'Valid while stock lasts' : 'Valable dans la limite des places'}</span>
                <span className="font-mono text-[#D4AF6A]">7 / 20 {isEn ? 'left' : 'restantes'}</span>
              </div>
            </div>
          </article>

          {/* Offres Flash PAYANT en FCFA issues des vrais concerts */}
          {liveEventDrops.length === 0 ? (
            <div className="py-12 text-center space-y-2 border-y border-white/[0.12]">
              <Ticket className="w-6 h-6 text-[#D4AF6A] mx-auto" strokeWidth={1.6} />
              <p className="font-agrandir-extrabold text-base text-white">
                {isEn ? 'No Flash Sales live right now' : 'Aucune Flash Sale en cours'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {liveEventDrops.map(({ event, totalQuota, totalRemaining, lowestPrice, currency }, idx) => {
                const remainPct = Math.max(8, Math.min(100, Math.round((totalRemaining / totalQuota) * 100)));
                return (
                  <article
                    key={event.id}
                    className="rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge variant="paid" label={isEn ? 'PAID' : 'PAYANT'} />
                        <StatusBadge variant="valid" label={isEn ? 'ACTIVE' : 'ACTIF'} />
                      </div>
                      <span className="text-xs text-[#C8C8C8] tabular-nums">
                        {formatDateLong(event.date, language)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setCheckoutEvent(event)}
                        className="flex items-center gap-3.5 text-left min-w-0 flex-1 cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-[14px] overflow-hidden bg-[#141414] border border-white/[0.12] shrink-0">
                          <img
                            src={event.officialPoster || event.bannerImage}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-agrandir-extrabold text-base text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                            {event.artist} — {event.title}
                          </p>
                          <p className="text-xs text-[#9A9A9A] truncate mt-0.5">
                            {formatDateLong(event.date, language)} · {event.venue}
                          </p>
                          <p className="text-xs font-agrandir-extrabold text-[#D4AF6A] mt-1 tabular-nums">
                            {isEn ? 'From' : 'Dès'} {lowestPrice.toLocaleString('fr-FR')} {currency}
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBookEvent(event)}
                        className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs whitespace-nowrap cursor-pointer shrink-0 lum-press"
                      >
                        {isEn ? 'Book now' : 'Réserver'}
                      </button>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <div className="h-1.5 w-full rounded-full bg-white/[0.1] overflow-hidden">
                        <div className="h-full rounded-full bg-white" style={{ width: `${remainPct}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#9A9A9A]">
                        <span>
                          {formattedToday} → {tomorrow} · {isEn ? 'Official rate, instant QR' : 'Tarif officiel, QR immédiat'}
                        </span>
                        <span className="font-mono text-[#C8C8C8] tabular-nums">
                          {totalRemaining} {isEn ? 'left' : 'places restantes'}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
