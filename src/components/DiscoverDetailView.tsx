import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  RedeemedReward,
  computeUserPointsSummary,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import {
  buildLumareelExperiences,
  getExperienceActionLabel,
  getExperienceStatusLabel,
  loadUserExperienceActions,
  saveUserExperienceAction,
} from '../utils/discoverCatalog';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { StatusBadge } from './ui/LumareelKit';
import { Calendar, CheckCircle2, ChevronLeft, Copy, MapPin, ShieldCheck } from 'lucide-react';

/**
 * Page détaillée dédiée aux contenus Discover :
 * - Publications éditoriales / Actualités
 * - Expériences, invitations, rencontres & accès spéciaux
 */
export const DiscoverDetailView: React.FC = () => {
  const {
    selectedDiscoverItem,
    previousPage,
    goBack,
    setCurrentPage,
    setSelectedEventSlug,
    setCheckoutEvent,
    setIsAuthModalOpen,
    events,
    currentUser,
    customerOrders,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [userActions, setUserActions] = useState(() => loadUserExperienceActions(currentUser));

  const bookedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    userActions.forEach((a) => {
      counts[a.experienceId] = (counts[a.experienceId] || 0) + 1;
    });
    return counts;
  }, [userActions]);

  const experiences = useMemo(
    () => buildLumareelExperiences(events, language, bookedCounts),
    [events, language, bookedCounts]
  );

  const summary = useMemo(
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
    [currentUser, customerOrders, pointsState]
  );

  const activeBlackCard = useMemo(
    () => loadStoredMemberCard(currentUser?.email),
    [currentUser?.email]
  );

  const backLabel =
    previousPage === 'home' || previousPage === 'discover' || previousPage === 'splash'
      ? isEn
        ? 'Home'
        : 'Accueil'
      : previousPage === 'privileged_access'
      ? isEn
        ? 'Experiences'
        : 'Expériences'
      : 'Discover';

  if (!selectedDiscoverItem) {
    return (
      <div
        className="min-h-screen w-full max-w-[920px] mx-auto px-5 sm:px-8 pb-24 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={() => setCurrentPage('explore')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer mb-6"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>Discover</span>
        </button>
        <div className="py-12 border-y border-white/[0.12] text-center space-y-2">
          <p className="font-agrandir-extrabold text-lg text-white">
            {isEn ? 'Content unavailable' : 'Contenu introuvable'}
          </p>
          <p className="text-xs text-[#9A9A9A]">
            {isEn
              ? 'Select an editorial post or experience from Discover.'
              : 'Sélectionnez une publication ou une expérience depuis Discover.'}
          </p>
        </div>
      </div>
    );
  }

  const matchedExp =
    selectedDiscoverItem.kind === 'experience' && selectedDiscoverItem.experienceId
      ? experiences.find((e) => e.id === selectedDiscoverItem.experienceId) || null
      : null;

  const existingAction = matchedExp
    ? userActions.find((a) => a.experienceId === matchedExp.id) || null
    : null;

  const matchedEvent =
    (selectedDiscoverItem.eventSlug &&
      events.find((e) => e.slug === selectedDiscoverItem.eventSlug)) ||
    (matchedExp?.eventId && events.find((e) => e.id === matchedExp.eventId)) ||
    null;

  const effectiveStatus = matchedExp?.status || selectedDiscoverItem.status;
  const statusMeta = effectiveStatus ? getExperienceStatusLabel(effectiveStatus, isEn) : null;
  const isUnavailable =
    effectiveStatus === 'coming_soon' ||
    effectiveStatus === 'full' ||
    effectiveStatus === 'ended' ||
    (matchedExp ? matchedExp.remaining <= 0 && !existingAction : false);

  const handleExperienceAction = () => {
    if (!matchedExp || isUnavailable || existingAction) return;

    if (matchedExp.mode === 'fcfa') {
      if (!matchedEvent) {
        showToast(
          isEn ? 'No ticketing session available right now.' : 'Aucune billetterie ouverte actuellement.',
          'info'
        );
        return;
      }
      if (!currentUser) {
        setCheckoutEvent(matchedEvent);
        setIsAuthModalOpen(true);
        showToast(
          isEn ? 'Sign in to reserve your seat.' : 'Connectez-vous pour réserver votre place.',
          'info'
        );
        return;
      }
      setCheckoutEvent(matchedEvent);
      return;
    }

    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to continue.' : 'Connectez-vous pour continuer.',
        'info'
      );
      return;
    }

    if (matchedExp.mode === 'black_card' && !activeBlackCard) {
      showToast(
        isEn
          ? 'Active LUMARÉEL Black Card required for this experience.'
          : 'Une LUMARÉEL Black Card active est requise pour cette expérience.',
        'info'
      );
      setCurrentPage('member_card');
      return;
    }

    if (matchedExp.mode === 'points') {
      const cost = matchedExp.pointsCost || 800;
      if (summary.availablePoints < cost) {
        showToast(
          isEn
            ? `You need ${cost - summary.availablePoints} more points.`
            : `Il vous manque ${cost - summary.availablePoints} points.`,
          'error'
        );
        return;
      }
      const code = `LMR-EXP-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const newReward: RedeemedReward = {
        id: `exp_${Date.now()}`,
        rewardId: matchedExp.id,
        title: isEn ? matchedExp.titleEn : matchedExp.titleFr,
        category: 'free_ticket',
        pointsCost: cost,
        voucherCode: code,
        redeemedAt: new Date().toISOString(),
        status: 'active',
      };
      const nextPoints = {
        ...pointsState,
        redeemedRewards: [newReward, ...pointsState.redeemedRewards],
      };
      setPointsState(nextPoints);
      saveUserPointsState(currentUser, nextPoints);

      const nextActions = saveUserExperienceAction(currentUser, {
        experienceId: matchedExp.id,
        code,
        action: 'booked',
        createdAt: new Date().toISOString(),
      });
      setUserActions(nextActions);
      showToast(
        isEn ? `Access confirmed! Code: ${code}` : `Accès confirmé ! Code : ${code}`,
        'success'
      );
      return;
    }

    const prefix = matchedExp.mode === 'invite' ? 'LMR-INV' : matchedExp.mode === 'black_card' ? 'LMR-BC' : 'LMR-REG';
    const code = `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const actionKind =
      matchedExp.mode === 'invite'
        ? 'invite_requested'
        : matchedExp.mode === 'register'
        ? 'registered'
        : 'booked';

    const nextActions = saveUserExperienceAction(currentUser, {
      experienceId: matchedExp.id,
      code,
      action: actionKind,
      createdAt: new Date().toISOString(),
    });
    setUserActions(nextActions);
    showToast(
      actionKind === 'invite_requested'
        ? isEn
          ? `Invitation request logged (${code}).`
          : `Demande d'invitation enregistrée (${code}).`
        : isEn
        ? `Registration confirmed (${code}).`
        : `Inscription enregistrée (${code}).`,
      'success'
    );
  };

  return (
    <div
      className="min-h-screen w-full max-w-[920px] mx-auto px-5 sm:px-8 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Lien retour contextuel */}
      <button
        type="button"
        onClick={() => goBack()}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer mb-5"
      >
        <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
        <span>{backLabel}</span>
      </button>

      <article className="space-y-6">
        {/* En-tête éditorial compact */}
        <header className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
              {selectedDiscoverItem.kicker}
            </span>
            {statusMeta && <StatusBadge variant={statusMeta.variant} label={statusMeta.label} />}
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white leading-[1.06] tracking-tight">
            {selectedDiscoverItem.title}
          </h1>
          {selectedDiscoverItem.subtitle &&
            selectedDiscoverItem.subtitle !== selectedDiscoverItem.description && (
              <p className="text-sm text-[#C8C8C8] leading-relaxed max-w-2xl">
                {selectedDiscoverItem.subtitle}
              </p>
            )}
        </header>

        {/* Visuel adapté et proportionné (ne monopolise pas tout l'écran) */}
        {selectedDiscoverItem.image && (
          <div className="w-full max-w-2xl aspect-[16/10] max-h-[340px] rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
            <img
              src={selectedDiscoverItem.image}
              alt={selectedDiscoverItem.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Informations clés : Date, Lieu, Disponibilité, Conditions */}
        {(selectedDiscoverItem.dateLabel ||
          selectedDiscoverItem.venueLabel ||
          selectedDiscoverItem.availabilityLabel ||
          selectedDiscoverItem.conditions) && (
          <div className="max-w-2xl rounded-[18px] bg-[#0E0E0E] border border-white/[0.12] divide-y divide-white/[0.08]">
            {selectedDiscoverItem.dateLabel && (
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                <span className="inline-flex items-center gap-2 text-[#9A9A9A]">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.6} />
                  {isEn ? 'Date' : 'Date'}
                </span>
                <span className="font-agrandir-semibold text-white text-right">
                  {selectedDiscoverItem.dateLabel}
                </span>
              </div>
            )}

            {selectedDiscoverItem.venueLabel && (
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                <span className="inline-flex items-center gap-2 text-[#9A9A9A]">
                  <MapPin className="w-3.5 h-3.5" strokeWidth={1.6} />
                  {selectedDiscoverItem.kind === 'article'
                    ? isEn
                      ? 'By'
                      : 'Par'
                    : isEn
                    ? 'Location'
                    : 'Lieu'}
                </span>
                <span className="font-agrandir-semibold text-white text-right">
                  {selectedDiscoverItem.venueLabel}
                </span>
              </div>
            )}

            {matchedExp && (
              <div className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                <span className="text-[#9A9A9A]">
                  {isEn ? 'Availability' : 'Disponibilité'}
                </span>
                <span className="font-mono text-[#D4AF6A] tabular-nums text-right">
                  {matchedExp.status === 'coming_soon'
                    ? isEn
                      ? 'Opening soon'
                      : 'Ouverture prochaine'
                    : matchedExp.status === 'ended'
                    ? isEn
                      ? 'Ended'
                      : 'Terminé'
                    : matchedExp.remaining <= 0
                    ? isEn
                      ? 'Sold out'
                      : 'Complet'
                    : `${matchedExp.remaining} / ${matchedExp.total} ${isEn ? 'left' : 'disponibles'}`}
                </span>
              </div>
            )}

            {selectedDiscoverItem.conditions && (
              <div className="px-4 py-3 flex items-start justify-between gap-4 text-xs">
                <span className="inline-flex items-center gap-2 text-[#9A9A9A] shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.6} />
                  {isEn ? 'Access conditions' : "Conditions d'accès"}
                </span>
                <span className="text-[#C8C8C8] text-right leading-relaxed max-w-sm">
                  {selectedDiscoverItem.conditions}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description & contenu éditorial */}
        <div className="max-w-2xl space-y-3 text-sm text-[#D0D0D0] leading-relaxed">
          <p>{selectedDiscoverItem.description}</p>
          {selectedDiscoverItem.body?.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {/* Bloc d'action contextuel */}
        <div className="max-w-2xl pt-2 space-y-3">
          {existingAction && matchedExp ? (
            <div className="p-4 sm:p-5 rounded-[18px] bg-[#0F2A1A]/75 border border-[#7FE0A6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#7FE0A6] shrink-0 mt-0.5" strokeWidth={1.6} />
                <div>
                  <p className="text-sm font-agrandir-extrabold text-white">
                    {existingAction.action === 'invite_requested'
                      ? isEn
                        ? 'Invitation request logged'
                        : "Demande d'invitation enregistrée"
                      : isEn
                      ? 'Access confirmed'
                      : 'Participation confirmée'}
                  </p>
                  <p className="text-xs text-[#C8C8C8] mt-0.5">
                    {isEn ? 'Reference:' : 'Référence :'}{' '}
                    <span className="font-mono text-[#D4AF6A]">{existingAction.code}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard?.writeText(existingAction.code).catch(() => {});
                  showToast(isEn ? 'Reference copied.' : 'Référence copiée.', 'success');
                }}
                className="min-h-[38px] px-4 rounded-full border border-white/25 hover:border-white text-xs font-agrandir-extrabold text-white inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{isEn ? 'Copy' : 'Copier'}</span>
              </button>
            </div>
          ) : selectedDiscoverItem.kind === 'experience' && matchedExp ? (
            isUnavailable ? (
              <p className="text-xs text-[#9A9A9A] py-3 px-4 rounded-[14px] bg-[#0E0E0E] border border-white/[0.10]">
                {matchedExp.status === 'coming_soon'
                  ? isEn
                    ? 'This experience is not open yet. Check back soon.'
                    : "Cette expérience n'est pas encore ouverte. Elle sera accessible prochainement."
                  : isEn
                  ? 'This experience is currently unavailable.'
                  : 'Cette expérience est actuellement complète ou terminée.'}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleExperienceAction}
                  className="min-h-[46px] px-7 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer lum-press"
                >
                  {matchedExp.mode === 'black_card' && !activeBlackCard
                    ? isEn
                      ? 'Discover LUMARÉEL Black Card'
                      : 'Découvrir la LUMARÉEL Black Card'
                    : matchedExp.mode === 'points' && matchedExp.pointsCost
                    ? `${getExperienceActionLabel(matchedExp.actionType, isEn)} · ${matchedExp.pointsCost} pts`
                    : getExperienceActionLabel(matchedExp.actionType, isEn)}
                </button>
                {matchedEvent && (
                  <button
                    type="button"
                    onClick={() => setCheckoutEvent(matchedEvent)}
                    className="min-h-[46px] px-5 rounded-full border border-white/20 hover:border-white/50 text-white font-agrandir-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {isEn ? 'Book tickets' : 'Réserver'}
                  </button>
                )}
              </div>
            )
          ) : (
            matchedEvent && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutEvent(matchedEvent)}
                  className="min-h-[46px] px-6 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer lum-press"
                >
                  {isEn ? 'Book tickets' : 'Réserver'}
                </button>
              </div>
            )
          )}
        </div>
      </article>
    </div>
  );
};
