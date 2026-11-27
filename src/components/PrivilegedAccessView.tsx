import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  RedeemedReward,
  computeUserPointsSummary,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { formatDateLong } from '../utils/dateUtils';
import { BottomSheet, ScrollReveal, StatusBadge } from './ui/LumareelKit';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  Copy,
  CreditCard,
  Lock,
  Sparkles,
  Ticket,
} from 'lucide-react';

interface QuotaOption {
  id: 'member_points' | 'released_seats' | 'black_card' | 'special_invite';
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  remaining: number;
  total: number;
  mode: 'points' | 'fcfa' | 'black_card' | 'invite';
  pointsCost?: number;
  priceFcfa?: number;
}

/**
 * Écran 11 — Accès privilégié (Même quand c'est complet).
 * Quotas dédiés membres, places remises à disposition, priorité Black Card et invitations spéciales.
 * Zéro arrondi (0px) sur les cartes, 4px sur les boutons, or #D4AF6A.
 */
export const PrivilegedAccessView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    events,
    setCurrentPage,
    setCheckoutEvent,
    setIsAuthModalOpen,
    showToast,
    language,
  } = useApp();
  const isEn = language === 'en';

  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [bookedQuotas, setBookedQuotas] = useState<Record<string, number>>({});
  const [selectedOption, setSelectedOption] = useState<QuotaOption | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  const summary = useMemo(
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
    [currentUser, customerOrders, pointsState]
  );

  const activeBlackCard = useMemo(
    () => loadStoredMemberCard(currentUser?.email),
    [currentUser?.email]
  );

  const targetEvent = useMemo(() => {
    const published = (events || []).filter((e) => e.status !== 'draft');
    return published[0] || events[0] || null;
  }, [events]);

  const lowestPriceFcfa = useMemo(() => {
    if (!targetEvent?.categories?.length) return 15000;
    const prices = targetEvent.categories
      .map((c) => Number(c.price || 0))
      .filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 15000;
  }, [targetEvent]);

  const quotaOptions: QuotaOption[] = useMemo(() => {
    const usedPoints = bookedQuotas['member_points'] || 0;
    const usedReleased = bookedQuotas['released_seats'] || 0;
    const usedBlackCard = bookedQuotas['black_card'] || 0;

    return [
      {
        id: 'member_points',
        titleFr: 'Quota membres',
        titleEn: 'Member quota',
        subtitleFr: 'Échangez vos points LUMARÉEL contre une place réservée.',
        subtitleEn: 'Redeem your LUMARÉEL points for a reserved member seat.',
        remaining: Math.max(0, 6 - usedPoints),
        total: 10,
        mode: 'points',
        pointsCost: 800,
      },
      {
        id: 'released_seats',
        titleFr: 'Places remises à disposition',
        titleEn: 'Released seats',
        subtitleFr: 'Billets réattribués au tarif officiel LUMARÉEL, sans majoration.',
        subtitleEn: 'Reallocated seats at official LUMARÉEL pricing, zero markup.',
        remaining: Math.max(0, 4 - usedReleased),
        total: 8,
        mode: 'fcfa',
        priceFcfa: lowestPriceFcfa,
      },
      {
        id: 'black_card',
        titleFr: 'Accès prioritaire Black Card',
        titleEn: 'Black Card priority access',
        subtitleFr: 'Contingent réservé aux titulaires d’une LUMARÉEL Black Card active.',
        subtitleEn: 'Dedicated allocation for active LUMARÉEL Black Card members.',
        remaining: Math.max(0, 3 - usedBlackCard),
        total: 5,
        mode: 'black_card',
      },
      {
        id: 'special_invite',
        titleFr: 'Invitation spéciale',
        titleEn: 'Special invitation',
        subtitleFr: 'Accès nominatif sur invitation de la production.',
        subtitleEn: 'Named invitation granted by production.',
        remaining: 0,
        total: 4,
        mode: 'invite',
      },
    ];
  }, [bookedQuotas, lowestPriceFcfa]);

  const handleSelectOption = (opt: QuotaOption) => {
    // Règle stricte : impossible de sélectionner une option dont le quota est à 0
    if (opt.remaining <= 0) return;

    if (opt.mode === 'fcfa') {
      if (!targetEvent) {
        showToast(
          isEn ? 'No event currently available.' : 'Aucun événement disponible actuellement.',
          'info'
        );
        return;
      }
      if (!currentUser) {
        setCheckoutEvent(targetEvent);
        setIsAuthModalOpen(true);
        showToast(
          isEn ? 'Sign in to reserve your seat.' : 'Connectez-vous pour réserver votre place.',
          'info'
        );
        return;
      }
      setCheckoutEvent(targetEvent);
      return;
    }

    setConfirmedCode(null);
    setSelectedOption(opt);
  };

  const handleConfirmAccess = () => {
    if (!selectedOption || selectedOption.remaining <= 0) return;

    if (!currentUser) {
      setSelectedOption(null);
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to reserve a member quota.' : 'Connectez-vous pour réserver un quota membre.',
        'info'
      );
      return;
    }

    if (selectedOption.mode === 'black_card' && !activeBlackCard) {
      setSelectedOption(null);
      setCurrentPage('member_card');
      return;
    }

    if (selectedOption.mode === 'points') {
      const cost = selectedOption.pointsCost || 800;
      if (summary.availablePoints < cost) {
        showToast(
          isEn
            ? `You need ${cost - summary.availablePoints} more points.`
            : `Il vous manque ${cost - summary.availablePoints} points.`,
          'error'
        );
        return;
      }

      const code = `LMR-PRV-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const newReward: RedeemedReward = {
        id: `prv_${Date.now()}`,
        rewardId: `privileged_${targetEvent?.id || 'event'}`,
        title: `${isEn ? 'Priority Access' : 'Accès privilégié'} — ${
          targetEvent?.artist || targetEvent?.title || 'LUMARÉEL'
        }`,
        category: 'free_ticket',
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
      setBookedQuotas((prev) => ({
        ...prev,
        [selectedOption.id]: (prev[selectedOption.id] || 0) + 1,
      }));
      setConfirmedCode(code);
      showToast(
        isEn ? `Quota reserved! Code: ${code}` : `Quota réservé ! Code : ${code}`,
        'success'
      );
      return;
    }

    // Réservation prioritaire Black Card active
    const code = `LMR-BC-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setBookedQuotas((prev) => ({
      ...prev,
      [selectedOption.id]: (prev[selectedOption.id] || 0) + 1,
    }));
    setConfirmedCode(code);
    showToast(
      isEn ? `Black Card access reserved! Code: ${code}` : `Accès Black Card réservé ! Code : ${code}`,
      'success'
    );
  };

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Lien retour < Mes points */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={() => setCurrentPage('rewards')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>{isEn ? 'My points' : 'Mes points'}</span>
        </button>

        <span className="px-3.5 py-1.5 rounded-full border border-[#D4AF6A]/70 text-[#D4AF6A] text-xs font-agrandir-extrabold tabular-nums">
          {summary.availablePoints.toLocaleString('fr-FR')} pts
        </span>
      </div>

      {/* En-tête éditorial */}
      <header className="mb-7 space-y-2 max-w-2xl">
        <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
          {isEn ? 'PRIORITY ACCESS' : 'ACCÈS PRIVILÉGIÉ'}
        </p>
        <h1 className="font-agrandir-extrabold text-[2.25rem] sm:text-5xl text-white leading-[0.98] tracking-tight">
          {isEn ? (
            <>
              Even when
              <br />
              sold out.
            </>
          ) : (
            <>
              Même quand
              <br />
              c&apos;est complet.
            </>
          )}
        </h1>
        <p className="text-sm text-[#C8C8C8] leading-relaxed pt-1">
          {isEn
            ? 'When public ticketing closes, LUMARÉEL opens strictly capped allocations for active members and Black Card holders.'
            : 'Lorsque la billetterie publique affiche complet, LUMARÉEL maintient des quotas limités dédiés à la communauté et aux membres Black Card.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne gauche : Carte événement ciblé (0px) + 2 badges COMPLET vs QUOTA RÉSERVÉ */}
        <div className="lg:col-span-5 space-y-4">
          <article className="bg-[#0E0E0E] border border-white/[0.12] overflow-hidden">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#141414]">
              <img
                src={
                  targetEvent?.bannerImage ||
                  targetEvent?.officialPoster ||
                  COMMUNITY_MEDIA.vipMezzanineImg
                }
                alt={targetEvent?.artist || 'LUMARÉEL'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />

              {/* Double statut : Public COMPLET vs Membres QUOTA RÉSERVÉ */}
              <div className="absolute top-3.5 left-3.5 right-3.5 flex flex-wrap items-center justify-between gap-2">
                <StatusBadge
                  variant="neutral"
                  label={isEn ? 'PUBLIC · SOLD OUT' : 'PUBLIC · COMPLET'}
                />
                <StatusBadge
                  variant="points"
                  label={isEn ? 'RESERVED QUOTA' : 'QUOTA RÉSERVÉ'}
                />
              </div>

              <div className="absolute inset-x-4 bottom-4">
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl uppercase text-white leading-none">
                  {targetEvent?.artist || targetEvent?.title || 'DOPELYM'}
                </h2>
                <p className="mt-1.5 text-xs text-[#C8C8C8]">
                  {targetEvent
                    ? `${formatDateLong(targetEvent.date, language)} · ${targetEvent.venue}`
                    : 'Abidjan · Palais de la Culture'}
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-white/[0.12] flex items-center justify-between gap-3 text-xs">
              <span className="text-[#9A9A9A]">
                {isEn ? 'Public ticketing' : 'Billetterie grand public'}
              </span>
              <span className="font-agrandir-extrabold text-[#D4AF6A]">
                {quotaOptions.reduce((sum, o) => sum + o.remaining, 0)}{' '}
                {isEn ? 'member seats open' : 'places membres ouvertes'}
              </span>
            </div>
          </article>
        </div>

        {/* Colonne droite : 4 options d'accès avec quotas réels */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
            {isEn ? 'Available allocations' : 'Quotas disponibles'}
          </h2>

          <ScrollReveal>
            <div className="space-y-3">
              {quotaOptions.map((opt) => {
                const isExhausted = opt.remaining <= 0;
                const fillPct = Math.round((opt.remaining / Math.max(1, opt.total)) * 100);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isExhausted}
                    onClick={() => handleSelectOption(opt)}
                    className={`w-full text-left p-4 sm:p-5 bg-[#0E0E0E] border transition-colors block ${
                      isExhausted
                        ? 'border-white/[0.08] opacity-45 cursor-not-allowed'
                        : 'border-white/[0.12] hover:border-[#D4AF6A]/65 cursor-pointer lum-press'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <span className="w-9 h-9 bg-[#141414] border border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                          {opt.mode === 'points' ? (
                            <Award className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                          ) : opt.mode === 'fcfa' ? (
                            <Ticket className="w-4 h-4 text-white" strokeWidth={1.6} />
                          ) : opt.mode === 'black_card' ? (
                            <CreditCard className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                          ) : (
                            <Lock className="w-4 h-4 text-[#9A9A9A]" strokeWidth={1.6} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white">
                              {isEn ? opt.titleEn : opt.titleFr}
                            </h3>
                            {isExhausted && (
                              <StatusBadge
                                variant="neutral"
                                label={isEn ? 'EXHAUSTED' : 'ÉPUISÉ'}
                              />
                            )}
                          </div>
                          <p className="text-xs text-[#9A9A9A] mt-1 leading-relaxed">
                            {isEn ? opt.subtitleEn : opt.subtitleFr}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {opt.mode === 'points' && opt.pointsCost ? (
                          <span className="font-agrandir-extrabold text-sm text-[#D4AF6A] tabular-nums">
                            {opt.pointsCost.toLocaleString('fr-FR')} pts
                          </span>
                        ) : opt.mode === 'fcfa' && opt.priceFcfa ? (
                          <span className="font-agrandir-extrabold text-sm text-white tabular-nums">
                            {opt.priceFcfa.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : opt.mode === 'black_card' ? (
                          <span className="font-agrandir-extrabold text-xs text-[#D4AF6A] uppercase">
                            Black Card
                          </span>
                        ) : (
                          <span className="font-agrandir-extrabold text-xs text-[#9A9A9A]">
                            0 / {opt.total}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barre de quota restant (0px) */}
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between gap-4">
                      <div className="flex-1 h-1 bg-white/[0.1] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isExhausted ? 'bg-neutral-600' : 'bg-[#D4AF6A]'
                          }`}
                          style={{ width: `${fillPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#9A9A9A] tabular-nums shrink-0">
                        {isExhausted
                          ? isEn
                            ? '0 left'
                            : 'Quota épuisé'
                          : `${opt.remaining} ${isEn ? 'left' : 'restantes'}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollReveal>

          <p className="pt-2 text-xs text-[#9A9A9A] leading-relaxed">
            {isEn
              ? 'Each allocation is strictly capped. Once a quota reaches zero, the option is automatically locked.'
              : 'Chaque contingent est strictement limité. Dès qu’un quota atteint zéro, l’option est automatiquement verrouillée.'}
          </p>
        </div>
      </div>

      {/* BOTTOM SHEET CONFIRMATION ACCÈS PRIVILÉGIÉ */}
      <BottomSheet
        open={Boolean(selectedOption)}
        onClose={() => {
          setSelectedOption(null);
          setConfirmedCode(null);
        }}
        kicker={isEn ? 'PRIORITY ACCESS' : 'ACCÈS PRIVILÉGIÉ'}
        title={
          confirmedCode
            ? isEn
              ? 'Allocation confirmed'
              : 'Place réservée'
            : selectedOption
            ? isEn
              ? selectedOption.titleEn
              : selectedOption.titleFr
            : ''
        }
      >
        {confirmedCode ? (
          <div className="space-y-5">
            <div className="p-4 bg-[#0F2A1A] border border-[#7FE0A6]/30 flex items-center gap-3 text-[#7FE0A6]">
              <CheckCircle2 className="w-5 h-5 shrink-0" strokeWidth={1.6} />
              <p className="text-xs sm:text-sm font-agrandir-semibold">
                {isEn
                  ? 'Your priority access is confirmed.'
                  : 'Votre accès privilégié est confirmé.'}
              </p>
            </div>

            <div className="p-5 bg-black border border-white/[0.14] text-center space-y-2">
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                {isEn ? 'ACCESS CODE' : "CODE D'ACCÈS"}
              </p>
              <p className="font-mono text-xl sm:text-2xl font-bold tracking-[0.14em] text-[#D4AF6A]">
                {confirmedCode}
              </p>
              <p className="text-xs text-[#9A9A9A]">
                {targetEvent?.artist || targetEvent?.title || 'LUMARÉEL'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard?.writeText(confirmedCode).catch(() => {});
                  showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                }}
                className="min-h-[46px] rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy className="w-4 h-4" strokeWidth={1.6} />
                <span>{isEn ? 'Copy code' : 'Copier'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedOption(null);
                  setConfirmedCode(null);
                }}
                className="min-h-[46px] rounded-[4px] border border-white/25 hover:border-white text-white font-agrandir-extrabold text-xs cursor-pointer"
              >
                {isEn ? 'Close' : 'Fermer'}
              </button>
            </div>
          </div>
        ) : (
          selectedOption && (
            <div className="space-y-5">
              <p className="text-sm text-[#C8C8C8] leading-relaxed">
                {isEn ? selectedOption.subtitleEn : selectedOption.subtitleFr}
              </p>

              {selectedOption.mode === 'black_card' && !activeBlackCard ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#141414] border border-[#D4AF6A]/35 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#D4AF6A] shrink-0 mt-0.5" strokeWidth={1.6} />
                    <p className="text-xs text-[#C8C8C8] leading-relaxed">
                      {isEn
                        ? 'This allocation is reserved for active LUMARÉEL Black Card members. Activate your membership to unlock priority access.'
                        : 'Ce quota est réservé aux membres LUMARÉEL Black Card actifs. Activez votre carte membre pour débloquer cet accès.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOption(null);
                      setCurrentPage('member_card');
                    }}
                    className="w-full min-h-[48px] rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm cursor-pointer"
                  >
                    {isEn ? 'Discover Black Card' : 'Découvrir la Black Card'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-y border-white/[0.12] divide-y divide-white/[0.12] text-sm">
                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#9A9A9A]">{isEn ? 'Event' : 'Événement'}</span>
                      <span className="font-agrandir-extrabold text-white">
                        {targetEvent?.artist || targetEvent?.title || 'DOPELYM'}
                      </span>
                    </div>
                    <div className="py-3 flex items-center justify-between gap-3">
                      <span className="text-[#9A9A9A]">{isEn ? 'Remaining quota' : 'Quota restant'}</span>
                      <span className="font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                        {selectedOption.remaining} / {selectedOption.total}
                      </span>
                    </div>
                    {selectedOption.mode === 'points' && selectedOption.pointsCost && (
                      <div className="py-3 flex items-center justify-between gap-3">
                        <span className="text-[#9A9A9A]">{isEn ? 'Cost' : 'Coût'}</span>
                        <span className="font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                          {selectedOption.pointsCost.toLocaleString('fr-FR')} pts
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      selectedOption.mode === 'points' &&
                      Boolean(currentUser) &&
                      summary.availablePoints < (selectedOption.pointsCost || 800)
                    }
                    onClick={handleConfirmAccess}
                    className="w-full min-h-[48px] rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed lum-press"
                  >
                    {!currentUser
                      ? isEn
                        ? 'Sign in to reserve'
                        : 'Se connecter pour réserver'
                      : isEn
                      ? 'Confirm priority access'
                      : "Confirmer l'accès privilégié"}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </BottomSheet>
    </div>
  );
};
