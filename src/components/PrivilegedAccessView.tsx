import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  computeUserPointsSummary,
  loadUserPointsState,
} from '../utils/communityStorage';
import {
  LumareelExperience,
  buildLumareelExperiences,
  experienceToDiscoverDetail,
  getExperienceActionLabel,
  getExperienceStatusLabel,
  loadUserExperienceActions,
} from '../utils/discoverCatalog';
import { ScrollReveal, StatusBadge } from './ui/LumareelKit';
import { Calendar, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

type ExperienceFilter = 'all' | 'available' | 'members' | 'invitations';

/**
 * Espace Expériences LUMARÉEL :
 * Accès spéciaux, invitations, rencontres, expériences VIP, événements privés et quotas dédiés.
 * Chaque carte affiche uniquement les infos utiles et ouvre la page dédiée DiscoverDetailView.
 */
export const PrivilegedAccessView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    events,
    previousPage,
    goBack,
    setCurrentPage,
    setSelectedDiscoverItem,
    language,
  } = useApp();

  const isEn = language === 'en';
  const cameFromExplore = previousPage === 'explore' || previousPage === 'discover';
  const [filter, setFilter] = useState<ExperienceFilter>('all');

  const pointsState = useMemo(() => loadUserPointsState(currentUser), [currentUser]);
  const summary = useMemo(
    () => computeUserPointsSummary(currentUser, customerOrders, pointsState),
    [currentUser, customerOrders, pointsState]
  );

  const userActions = useMemo(
    () => loadUserExperienceActions(currentUser),
    [currentUser]
  );

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

  const filteredExperiences = useMemo(() => {
    if (filter === 'all') return experiences;
    if (filter === 'available') {
      return experiences.filter((e) => e.status === 'available' || e.status === 'members_only');
    }
    if (filter === 'members') {
      return experiences.filter((e) => e.mode === 'black_card' || e.mode === 'points');
    }
    return experiences.filter((e) => e.mode === 'invite' || e.mode === 'register');
  }, [experiences, filter]);

  const openExperienceDetail = (exp: LumareelExperience) => {
    setSelectedDiscoverItem(experienceToDiscoverDetail(exp, isEn));
    setCurrentPage('discover_detail');
  };

  return (
    <div
      className="min-h-screen w-full max-w-[1160px] mx-auto px-5 sm:px-8 md:px-10 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Barre supérieure : Retour dynamique < Discover ou < Carte + Solde points */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <button
          type="button"
          onClick={() => (cameFromExplore ? setCurrentPage('explore') : goBack())}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>{cameFromExplore ? 'Discover' : isEn ? 'Card' : 'Carte'}</span>
        </button>

        <span className="px-3.5 py-1.5 rounded-full border border-[#D4AF6A]/65 text-[#D4AF6A] text-xs font-agrandir-extrabold tabular-nums">
          {summary.availablePoints.toLocaleString('fr-FR')} pts
        </span>
      </div>

      {/* En-tête éditorial compact */}
      <header className="mb-6 space-y-2 max-w-2xl">
        <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
          {isEn ? 'LUMARÉEL EXPERIENCES' : 'EXPÉRIENCES LUMARÉEL'}
        </p>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white leading-[1.02] tracking-tight">
          {isEn ? 'Special access, invitations & meets.' : 'Accès spéciaux, invitations & rencontres.'}
        </h1>
        <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
          {isEn
            ? 'Curated backstage moments, private invitations, VIP hospitality, and reserved member allocations under clear conditions.'
            : 'Rencontres en coulisses, invitations privées, expériences VIP et quotas réservés selon les conditions et disponibilités.'}
        </p>
      </header>

      {/* Filtres compacts */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6 -mx-5 px-5 sm:mx-0 sm:px-0">
        {(
          [
            { id: 'all', label: isEn ? 'All' : 'Tout' },
            { id: 'available', label: isEn ? 'Available' : 'Disponibles' },
            { id: 'invitations', label: isEn ? 'Invitations & Meets' : 'Invitations & Rencontres' },
            { id: 'members', label: isEn ? 'Members & Black Card' : 'Membres & Black Card' },
          ] as { id: ExperienceFilter; label: string }[]
        ).map((pill) => {
          const active = filter === pill.id;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`min-h-[34px] px-4 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'border border-white/15 text-[#C8C8C8] hover:border-white/40 hover:text-white'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Liste éditoriale des expériences */}
      <ScrollReveal>
        <div className="divide-y divide-white/[0.10] border-y border-white/[0.10]">
          {filteredExperiences.map((exp) => {
            const statusMeta = getExperienceStatusLabel(exp.status, isEn);
            const existingAction = userActions.find((a) => a.experienceId === exp.id);
            const isUnavailable =
              exp.status === 'coming_soon' ||
              exp.status === 'full' ||
              exp.status === 'ended' ||
              (exp.remaining <= 0 && !existingAction);

            const availabilityText =
              exp.status === 'coming_soon'
                ? isEn
                  ? 'Opening soon'
                  : 'Ouverture prochaine'
                : exp.status === 'ended'
                ? isEn
                  ? 'Ended'
                  : 'Terminé'
                : exp.remaining <= 0
                ? isEn
                  ? 'Sold out'
                  : 'Complet'
                : `${exp.remaining} / ${exp.total} ${isEn ? 'left' : 'disponibles'}`;

            return (
              <article
                key={exp.id}
                className={`py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 ${
                  isUnavailable ? 'opacity-65' : ''
                }`}
              >
                {/* Visuel compact proportionné */}
                <button
                  type="button"
                  onClick={() => openExperienceDetail(exp)}
                  className="w-full sm:w-[148px] aspect-[16/10] sm:aspect-[4/3] rounded-[14px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] shrink-0 cursor-pointer block"
                >
                  <img
                    src={exp.image}
                    alt={isEn ? exp.titleEn : exp.titleFr}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className={`w-full h-full object-cover ${isUnavailable ? 'grayscale' : ''}`}
                  />
                </button>

                {/* Contenu éditorial structuré */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#D4AF6A]">
                      {isEn ? exp.categoryEn : exp.categoryFr}
                    </span>
                    <StatusBadge variant={statusMeta.variant} label={statusMeta.label} />
                    {existingAction && (
                      <StatusBadge
                        variant="valid"
                        label={isEn ? 'REGISTERED' : 'ENREGISTRÉ'}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openExperienceDetail(exp)}
                    className="text-left block group cursor-pointer"
                  >
                    <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white group-hover:text-[#D4AF6A] transition-colors leading-snug">
                      {isEn ? exp.titleEn : exp.titleFr}
                    </h2>
                  </button>

                  <p className="text-xs text-[#B5B5B5] leading-relaxed max-w-2xl">
                    {isEn ? exp.shortDescEn : exp.shortDescFr}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9A9A9A] pt-0.5">
                    {exp.dateLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" strokeWidth={1.6} />
                        {exp.dateLabel}
                      </span>
                    )}
                    {exp.venueLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" strokeWidth={1.6} />
                        {exp.venueLabel}
                      </span>
                    )}
                    <span className="font-mono text-[#C8C8C8] tabular-nums">{availabilityText}</span>
                  </div>

                  <p className="text-[11px] text-[#7E7E7E]">
                    {isEn ? exp.conditionsEn : exp.conditionsFr}
                  </p>
                </div>

                {/* Action contextuelle (aucun bouton actif si indisponible) */}
                <div className="sm:self-center shrink-0">
                  {isUnavailable ? (
                    <span className="inline-block text-xs font-agrandir-semibold text-[#777]">
                      {statusMeta.label}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openExperienceDetail(exp)}
                      className="min-h-[40px] px-5 rounded-full bg-[#0E0E0E] hover:bg-[#D4AF6A] border border-white/20 hover:border-[#D4AF6A] text-white hover:text-black font-agrandir-extrabold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer lum-press"
                    >
                      <span>
                        {existingAction
                          ? isEn
                            ? 'View pass'
                            : 'Voir mon accès'
                          : getExperienceActionLabel(exp.actionType, isEn)}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
};
