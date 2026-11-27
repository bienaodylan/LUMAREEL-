import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { COMMUNITY_MEDIA, markChallengeCompleted } from '../utils/communityStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { Crown, Lock, Play, X } from 'lucide-react';

interface BackstageDrop {
  id: string;
  category: 'soundcheck' | 'studio' | 'scenography' | 'black_card';
  categoryLabelFr: string;
  categoryLabelEn: string;
  titleFr: string;
  titleEn: string;
  subtitleFr: string;
  subtitleEn: string;
  duration: string;
  date: string;
  image: string;
  membersOnly?: boolean;
  embedUrl: string;
  notesFr: string[];
  notesEn: string[];
}

const BACKSTAGE_DROPS: BackstageDrop[] = [
  {
    id: 'bs_1',
    category: 'soundcheck',
    categoryLabelFr: 'Soundcheck & Balances',
    categoryLabelEn: 'Soundcheck',
    titleFr: 'Dans le silence avant les portes — Balances à Abidjan',
    titleEn: 'Before doors open — Abidjan live soundcheck',
    subtitleFr: 'Deux heures avant l’arrivée du public, la régie façade et les musiciens règlent chaque fréquence de la salle.',
    subtitleEn: 'Two hours before doors open, front-of-house engineers and live musicians calibrate every frequency in the hall.',
    duration: '08:42',
    date: 'Nov 2026',
    image: COMMUNITY_MEDIA.backstageSoundcheckImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?autoplay=1&rel=0',
    notesFr: [
      'Captation brute à la console principale sans coupure.',
      'Réglage des retours scène et test complet des faisceaux lumineux.',
      'Répétition du morceau d’ouverture en version acoustique inédite.',
    ],
    notesEn: [
      'Uncut capture straight from the front-of-house mixing console.',
      'Stage monitor calibration and full lighting cue walkthrough.',
      'Unheard acoustic rehearsal of the opening track.',
    ],
  },
  {
    id: 'bs_2',
    category: 'studio',
    categoryLabelFr: 'Session Studio',
    categoryLabelEn: 'Studio Session',
    titleFr: 'Minuit en studio — Arranger le set live',
    titleEn: 'Midnight in the studio — Scoring the live set',
    subtitleFr: 'Comment un titre studio est réécrit pour la scène : cuivres, transitions et dynamique live.',
    subtitleEn: 'How a studio record is rebuilt for the stage: brass arrangements, transitions, and live dynamics.',
    duration: '11:15',
    date: 'Nov 2026',
    image: COMMUNITY_MEDIA.backstageStudioImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?autoplay=1&rel=0',
    notesFr: [
      'Conversation intimiste avec le directeur musical de la tournée.',
      'Écoute des maquettes alternatives jamais sorties sur les plateformes.',
      'Préparation des transitions surprise avec les invités.',
    ],
    notesEn: [
      'Intimate conversation with the tour musical director.',
      'Preview of unreleased alternate live arrangements.',
      'Behind-the-scenes prep for surprise guest transitions.',
    ],
  },
  {
    id: 'bs_3',
    category: 'scenography',
    categoryLabelFr: 'Scénographie',
    categoryLabelEn: 'Scenography',
    titleFr: 'Architecture de lumière — Concevoir une scène LUMARÉEL',
    titleEn: 'Light architecture — Designing a LUMARÉEL stage',
    subtitleFr: 'Plans d’éclairage, géométrie des projecteurs et mise en espace des loges avant la nuit du concert.',
    subtitleEn: 'Lighting plots, beam geometry, and lounge spatial staging before show night.',
    duration: '06:28',
    date: 'Oct 2026',
    image: COMMUNITY_MEDIA.loungeStageImg,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?autoplay=1&rel=0',
    notesFr: [
      'Du croquis initial au montage complet sur site.',
      'Choix des températures chaudes or et tungstène propres à la signature visuelle.',
    ],
    notesEn: [
      'From initial lighting sketch to full venue rigging.',
      'Warm gold and tungsten color temperature signature.',
    ],
  },
  {
    id: 'bs_4',
    category: 'black_card',
    categoryLabelFr: 'Exclusivité Black Card',
    categoryLabelEn: 'Black Card Exclusive',
    titleFr: 'Carnet privé des loges — Rencontre d’après-concert',
    titleEn: 'Private greenroom diary — Post-show conversations',
    subtitleFr: 'Les minutes qui suivent la sortie de scène, réservées aux détenteurs de la LUMARÉEL Black Card.',
    subtitleEn: 'The raw minutes right after walking off stage, reserved for LUMARÉEL Black Card holders.',
    duration: '14:05',
    date: 'Nov 2026',
    image: COMMUNITY_MEDIA.vipMezzanineImg,
    membersOnly: true,
    embedUrl: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?autoplay=1&rel=0',
    notesFr: [
      'Accès exclusif réservé aux membres LUMARÉEL Black Card.',
      'Réactions à chaud des artistes dans les loges privées.',
    ],
    notesEn: [
      'Exclusive access reserved for LUMARÉEL Black Card holders.',
      'Immediate off-stage artist reflections from the private greenroom.',
    ],
  },
];

export const BackstageView: React.FC = () => {
  const { currentUser, setCurrentPage, showToast, language } = useApp();
  const isEn = language === 'en';
  const [activeDrop, setActiveDrop] = useState<BackstageDrop | null>(null);

  const hasBlackCard = Boolean(loadStoredMemberCard(currentUser?.email));

  const visibleDrops = BACKSTAGE_DROPS;

  const handleOpenDrop = (drop: BackstageDrop) => {
    if (drop.membersOnly && !hasBlackCard) {
      showToast(
        isEn
          ? 'This episode is reserved for LUMARÉEL Black Card holders.'
          : 'Ce contenu est réservé aux membres LUMARÉEL Black Card.',
        'info'
      );
      setCurrentPage('member_card');
      return;
    }
    setActiveDrop(drop);
    const unlocked = markChallengeCompleted(currentUser, 'challenge_backstage');
    if (unlocked) {
      showToast(
        isEn ? 'Backstage challenge completed! +50 points earned.' : 'Défi Backstage validé ! +50 points crédités.',
        'success'
      );
    }
  };

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      <header className="mb-8 pb-6 border-b border-white/10">
        <p className="text-xs tracking-[0.22em] text-[#D4AF37] uppercase mb-2">
          BACKSTAGE · {isEn ? 'Exclusive Access' : 'Contenus Exclusifs'}
        </p>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-[1.02] text-balance">
          {isEn ? 'Behind the curtains of every show.' : 'Dans les coulisses de chaque production.'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-3 max-w-2xl leading-relaxed">
          {isEn
            ? 'Discover exclusive videos, intimate moments and stories from behind each production.'
            : 'Des vidéos exclusives, des moments privilégiés et des histoires captées dans les coulisses de chaque production.'}
        </p>
      </header>

      {/* Contenu vedette en grand format */}
      {visibleDrops.length > 0 && (
        <section className="mb-10">
          <div
            onClick={() => handleOpenDrop(visibleDrops[0])}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenDrop(visibleDrops[0]); } }}
            className="group relative rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 cursor-pointer grid grid-cols-1 lg:grid-cols-12 items-stretch"
          >
            <div className="lg:col-span-7 relative aspect-[16/9] lg:aspect-auto lg:min-h-[360px] bg-black overflow-hidden">
              <img
                src={visibleDrops[0].image}
                alt={isEn ? visibleDrops[0].titleEn : visibleDrops[0].titleFr}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/15 group-hover:bg-white text-white group-hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors">
                  {visibleDrops[0].membersOnly && !hasBlackCard ? (
                    <Lock className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5 fill-current" />
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-3">
                <div className="text-xs text-neutral-400 flex items-center gap-2">
                  <span className="font-mono">{visibleDrops[0].duration}</span>
                  <span aria-hidden="true">·</span>
                  <span>{visibleDrops[0].date}</span>
                </div>
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight">
                  {isEn ? visibleDrops[0].titleEn : visibleDrops[0].titleFr}
                </h2>
                <p className="text-sm text-neutral-400 leading-relaxed">
                  {isEn ? visibleDrops[0].subtitleEn : visibleDrops[0].subtitleFr}
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs font-agrandir-bold uppercase tracking-wider text-white group-hover:text-[#D4AF37] transition-colors">
                  {visibleDrops[0].membersOnly && !hasBlackCard
                    ? (isEn ? 'Unlock with LUMARÉEL Black Card' : 'Débloquer avec la LUMARÉEL Black Card')
                    : (isEn ? 'Watch Backstage episode' : 'Regarder l’épisode Backstage')}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grille des autres épisodes Backstage */}
      {visibleDrops.length > 1 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visibleDrops.slice(1).map((drop) => {
            const locked = Boolean(drop.membersOnly && !hasBlackCard);
            return (
              <article
                key={drop.id}
                onClick={() => handleOpenDrop(drop)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenDrop(drop); } }}
                className="group rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-white/25 transition-colors cursor-pointer flex flex-col"
              >
                <div className="aspect-[16/10] relative bg-black overflow-hidden">
                  <img
                    src={drop.image}
                    alt={isEn ? drop.titleEn : drop.titleFr}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-white">
                    {locked ? <Crown className="w-4 h-4 text-[#D4AF37]" /> : <Play className="w-4 h-4 fill-current" />}
                    <span className="font-mono">{drop.duration}</span>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-500">{drop.date}</div>
                    <h3 className="font-agrandir-extrabold text-base text-white leading-snug">
                      {isEn ? drop.titleEn : drop.titleFr}
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                      {isEn ? drop.subtitleEn : drop.subtitleFr}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-white/10 text-xs font-agrandir-bold text-white group-hover:text-[#D4AF37] transition-colors">
                    {locked
                      ? (isEn ? 'Black Card required' : 'Réservé LUMARÉEL Black Card')
                      : (isEn ? 'Watch now' : 'Visionner')}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lecteur modal Backstage intégré */}
      {activeDrop && (
        <div className="fixed inset-0 z-[80] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6">
          <div className="w-full max-w-4xl rounded-3xl bg-[#0e0e0e] border border-white/15 overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-[#D4AF37]">
                  BACKSTAGE · {isEn ? activeDrop.categoryLabelEn : activeDrop.categoryLabelFr}
                </div>
                <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white truncate">
                  {isEn ? activeDrop.titleEn : activeDrop.titleFr}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveDrop(null)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black">
                <iframe
                  src={activeDrop.embedUrl}
                  title={isEn ? activeDrop.titleEn : activeDrop.titleFr}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {isEn ? activeDrop.subtitleEn : activeDrop.subtitleFr}
                </p>
                <ul className="space-y-2 pt-2 border-t border-white/10">
                  {(isEn ? activeDrop.notesEn : activeDrop.notesFr).map((note, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-neutral-400">
                      {idx + 1}. {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
