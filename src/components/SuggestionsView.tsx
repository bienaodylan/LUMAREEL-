import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CommunitySuggestion,
  compressImageDataUrl,
  getUserStorageKey,
  loadSuggestions,
  markChallengeCompleted,
  saveSuggestions,
} from '../utils/communityStorage';
import { LumareelStatusVariant, StatusBadge, Tabs } from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronUp,
  ImagePlus,
  Lightbulb,
  Mic2,
  Send,
  X,
} from 'lucide-react';

type MainTab = 'trending' | 'propose' | 'mine';
type CategoryPill = 'all' | 'abidjan' | 'international' | 'nights';

interface ArtistPollOption {
  id: string;
  name: string;
  votes: number;
  votedBy: string[];
}

interface SuggestionStatusMeta {
  key: 'received' | 'study' | 'preparation' | 'confirmed' | 'rejected';
  labelFr: string;
  labelEn: string;
  variant: LumareelStatusVariant;
  stepIndex: number; // 0..3 (or -1 for rejected)
  teamNoteFr: string;
  teamNoteEn: string;
}

const STATUS_SEQUENCE: SuggestionStatusMeta[] = [
  {
    key: 'study',
    labelFr: 'EN ÉTUDE',
    labelEn: 'UNDER REVIEW',
    variant: 'study',
    stepIndex: 1,
    teamNoteFr: 'Proposition transmise à la direction artistique pour étude de faisabilité et calendrier.',
    teamNoteEn: 'Forwarded to our artistic direction for feasibility and calendar review.',
  },
  {
    key: 'preparation',
    labelFr: 'EN PRÉPARATION',
    labelEn: 'IN PREPARATION',
    variant: 'preparation',
    stepIndex: 2,
    teamNoteFr: 'Le projet est en cours de préparation avec nos équipes de production.',
    teamNoteEn: 'Currently in preparation with our production teams.',
  },
  {
    key: 'confirmed',
    labelFr: 'CONFIRMÉE',
    labelEn: 'CONFIRMED',
    variant: 'valid',
    stepIndex: 3,
    teamNoteFr: 'Proposition confirmée pour la programmation LUMARÉEL. Merci à toute la communauté.',
    teamNoteEn: 'Confirmed for the upcoming LUMARÉEL lineup. Thank you to the community.',
  },
  {
    key: 'received',
    labelFr: 'REÇUE',
    labelEn: 'RECEIVED',
    variant: 'neutral',
    stepIndex: 0,
    teamNoteFr: 'Votre proposition est bien reçue et ouverte aux votes de la communauté.',
    teamNoteEn: 'Your proposal has been received and is open for community votes.',
  },
  {
    key: 'rejected',
    labelFr: 'NON RETENUE',
    labelEn: 'NOT SELECTED',
    variant: 'rejected',
    stepIndex: -1,
    teamNoteFr: 'Non retenue pour cette saison en raison de contraintes de calendrier ou de production.',
    teamNoteEn: 'Not selected for this season due to scheduling or production constraints.',
  },
];

const PROGRESS_STEPS_FR = ['Reçue', 'En étude', 'En préparation', 'Confirmée'];
const PROGRESS_STEPS_EN = ['Received', 'Under review', 'In prep', 'Confirmed'];

const POLL_STORAGE_KEY = 'lumareel_artist_poll_v1';

const DEFAULT_ARTIST_POLL: ArtistPollOption[] = [
  { id: 'poll_1', name: 'Burna Boy', votes: 148, votedBy: [] },
  { id: 'poll_2', name: 'Didi B', votes: 112, votedBy: [] },
  { id: 'poll_3', name: 'Rema', votes: 76, votedBy: [] },
];

function loadArtistPoll(): ArtistPollOption[] {
  try {
    const raw = localStorage.getItem(POLL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ARTIST_POLL;
}

/**
 * Écran 13 — Boîte à suggestions & votes (fidèle 1:1 à la maquette 13 — 0px, 6 statuts, 5 étapes).
 */
export const SuggestionsView: React.FC = () => {
  const { currentUser, setCurrentPage, showToast, language } = useApp();
  const isEn = language === 'en';

  const [activeTab, setActiveTab] = useState<MainTab>('trending');
  const [categoryPill, setCategoryPill] = useState<CategoryPill>('all');
  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>(() => loadSuggestions());
  const [artistPoll, setArtistPoll] = useState<ArtistPollOption[]>(() => loadArtistPoll());

  // Formulaire de proposition (Artiste, Concert, Ville, Concept) + confirmation dédiée + image optionnelle
  const [proposalKind, setProposalKind] = useState<'artist' | 'concert' | 'city' | 'concept'>('artist');
  const [artistName, setArtistName] = useState('');
  const [title, setTitle] = useState('');
  const [cityOrVenue, setCityOrVenue] = useState('');
  const [description, setDescription] = useState('');
  const [attachedImage, setAttachedImage] = useState<string>('');
  const [submittedIdea, setSubmittedIdea] = useState<CommunitySuggestion | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const voterKey = getUserStorageKey(currentUser);

  const totalPollVotes = useMemo(
    () => Math.max(1, artistPoll.reduce((sum, p) => sum + p.votes, 0)),
    [artistPoll]
  );

  const handleToggleArtistPoll = (pollId: string) => {
    const next = artistPoll.map((opt) => {
      if (opt.id !== pollId) return opt;
      const already = opt.votedBy.includes(voterKey);
      return {
        ...opt,
        votes: already ? Math.max(0, opt.votes - 1) : opt.votes + 1,
        votedBy: already
          ? opt.votedBy.filter((k) => k !== voterKey)
          : [...opt.votedBy, voterKey],
      };
    });
    setArtistPoll(next);
    try {
      localStorage.setItem(POLL_STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const filteredSuggestions = useMemo(() => {
    const base = [...suggestions].sort((a, b) => b.votes - a.votes);
    if (categoryPill === 'all') return base;
    if (categoryPill === 'abidjan') {
      return base.filter(
        (s) =>
          s.type === 'artist_venue' &&
          `${s.cityOrVenue} ${s.title}`.toLowerCase().includes('abidjan')
      );
    }
    if (categoryPill === 'international') {
      return base.filter((s) => s.type === 'artist_venue');
    }
    return base.filter((s) => s.type === 'general_event');
  }, [suggestions, categoryPill]);

  const mySuggestions = useMemo(() => {
    const myName = (currentUser?.name || '').toLowerCase();
    return suggestions.filter(
      (s) =>
        s.votedByKeys.includes(voterKey) ||
        (myName && s.authorName.toLowerCase() === myName)
    );
  }, [suggestions, voterKey, currentUser?.name]);

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageDataUrl(file, 960, 0.78);
      setAttachedImage(compressed);
    } catch {
      showToast(isEn ? 'Could not load image.' : "Impossible de charger l'image.", 'error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCity = cityOrVenue.trim();
    const cleanDesc = description.trim();
    const cleanArtist = artistName.trim();
    const cleanTitle = title.trim();

    if (proposalKind === 'artist' || proposalKind === 'concert') {
      if (!cleanArtist || !cleanCity) {
        showToast(
          isEn
            ? 'Please enter both the artist name and the city or venue.'
            : "Indiquez le nom de l'artiste et la ville ou salle souhaitée.",
          'error'
        );
        return;
      }
    } else if (proposalKind === 'city') {
      if (!cleanCity) {
        showToast(
          isEn ? 'Please enter the city you want to suggest.' : 'Indiquez la ville que vous souhaitez proposer.',
          'error'
        );
        return;
      }
    } else if (!cleanTitle) {
      showToast(
        isEn ? 'Please enter your concept title.' : 'Indiquez un titre pour votre idée.',
        'error'
      );
      return;
    }

    const mappedStorageType: 'artist_venue' | 'general_event' =
      proposalKind === 'artist' || proposalKind === 'concert' ? 'artist_venue' : 'general_event';

    const generatedTitle =
      proposalKind === 'artist'
        ? `${cleanArtist} à ${cleanCity}`
        : proposalKind === 'concert'
        ? `Concert ${cleanArtist} — ${cleanCity}`
        : proposalKind === 'city'
        ? cleanTitle || `Date LUMARÉEL à ${cleanCity}`
        : cleanTitle;

    const newItem: CommunitySuggestion = {
      id: `sug_${Date.now()}`,
      type: mappedStorageType,
      artistName: mappedStorageType === 'artist_venue' ? cleanArtist : undefined,
      title: generatedTitle,
      cityOrVenue: cleanCity || 'Abidjan',
      description:
        cleanDesc ||
        (mappedStorageType === 'artist_venue'
          ? `Suggestion communauté pour ${cleanArtist} à ${cleanCity}.`
          : generatedTitle),
      authorName: currentUser?.name || (isEn ? 'Member' : 'Membre LUMARÉEL'),
      votes: 1,
      votedByKeys: [voterKey],
      createdAt: new Date().toISOString(),
    };

    const next = [newItem, ...suggestions];
    setSuggestions(next);
    saveSuggestions(next);
    setArtistName('');
    setTitle('');
    setCityOrVenue('');
    setDescription('');
    setAttachedImage('');
    if (imageInputRef.current) imageInputRef.current.value = '';
    setSubmittedIdea(newItem);

    const unlocked = markChallengeCompleted(currentUser, 'challenge_suggestion');
    showToast(
      unlocked
        ? isEn
          ? 'Suggestion published! +75 points.'
          : 'Suggestion publiée ! +75 points.'
        : isEn
        ? 'Suggestion published.'
        : 'Votre idée a été publiée.',
      'success'
    );
  };

  const handleToggleVote = (id: string) => {
    const next = suggestions.map((item) => {
      if (item.id !== id) return item;
      const alreadyVoted = item.votedByKeys.includes(voterKey);
      return {
        ...item,
        votes: alreadyVoted ? Math.max(0, item.votes - 1) : item.votes + 1,
        votedByKeys: alreadyVoted
          ? item.votedByKeys.filter((k) => k !== voterKey)
          : [...item.votedByKeys, voterKey],
      };
    });
    setSuggestions(next);
    saveSuggestions(next);
  };

  const getStatusForSuggestion = (item: CommunitySuggestion, index: number): SuggestionStatusMeta => {
    // Les idées tout juste soumises par l'utilisateur démarrent au statut NOUVELLE
    if (item.id.startsWith('sug_') && item.votes <= 3) {
      return STATUS_SEQUENCE[3]; // NOUVELLE
    }
    return STATUS_SEQUENCE[index % STATUS_SEQUENCE.length];
  };

  const progressSteps = isEn ? PROGRESS_STEPS_EN : PROGRESS_STEPS_FR;

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

      {/* En-tête éditorial */}
      <header className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
            {isEn ? 'COMMUNITY · SUGGESTIONS' : 'COMMUNAUTÉ · SUGGESTIONS'}
          </p>
          <h1 className="font-agrandir-extrabold text-[2.2rem] sm:text-5xl text-white leading-[0.98] tracking-tight max-w-xl">
            {isEn ? (
              <>
                The next stage
                <br />
                is shaped
                <br />
                by you.
              </>
            ) : (
              <>
                La prochaine
                <br />
                scène,
                <br />
                c&apos;est vous qui la
                <br />
                dessinez.
              </>
            )}
          </h1>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-[#0E0E0E] border border-white/[0.12] items-center justify-center shrink-0">
          <Icons.Suggestions size="md" accent="mono" />
        </div>
      </header>

      {/* 3 onglets soulignés : Tendances | Proposer | Mes idées */}
      <Tabs<MainTab>
        activeId={activeTab}
        onChange={(next) => {
          setActiveTab(next);
          if (next !== 'propose') setSubmittedIdea(null);
        }}
        className="mb-5"
        items={[
          { id: 'trending', label: isEn ? 'Trending' : 'Tendances' },
          { id: 'propose', label: isEn ? 'Submit' : 'Proposer' },
          { id: 'mine', label: isEn ? 'My ideas' : 'Mes idées' },
        ]}
      />

      {/* ONGLET 1 : TENDANCES */}
      {activeTab === 'trending' && (
        <div className="space-y-8">
          {/* Pilules de filtre : Tout | Artistes à Abidjan | Internationaux | Soirées */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {(
              [
                { id: 'all', label: isEn ? 'All' : 'Tout' },
                { id: 'abidjan', label: isEn ? 'Artists in Abidjan' : 'Artistes à Abidjan' },
                { id: 'international', label: isEn ? 'International' : 'Internationaux' },
                { id: 'nights', label: isEn ? 'Nights' : 'Soirées' },
              ] as { id: CategoryPill; label: string }[]
            ).map((pill) => {
              const active = categoryPill === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setCategoryPill(pill.id)}
                  className={`min-h-[36px] px-4 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'border border-white/20 text-[#C8C8C8] hover:border-white/50 hover:text-white'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Bloc sondage "Qui voulez-vous voir ?" — Barres arrondies */}
          <section className="space-y-3 max-w-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Icons.ArtistVote size="xs" accent="mono" />
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
                  {isEn ? 'Who do you want to see?' : 'Qui voulez-vous voir ?'}
                </h2>
              </div>
              <span className="text-xs text-[#9A9A9A]">
                {isEn ? 'Artist vote' : 'Vote artiste'}
              </span>
            </div>

            <div className="space-y-2.5">
              {artistPoll.map((opt) => {
                const pct = Math.min(100, Math.max(12, Math.round((opt.votes / totalPollVotes) * 100)));
                const hasVoted = opt.votedBy.includes(voterKey);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleArtistPoll(opt.id)}
                    className={`relative w-full min-h-[52px] rounded-[14px] overflow-hidden bg-[#0E0E0E] border transition-colors px-4 flex items-center justify-between gap-3 text-left cursor-pointer ${
                      hasVoted ? 'border-[#D4AF6A]' : 'border-white/[0.12] hover:border-white/25'
                    }`}
                  >
                    <div
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 bg-[#D4AF6A]/20 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative z-10 font-agrandir-extrabold text-sm text-white truncate">
                      {opt.name}
                    </span>
                    <span className="relative z-10 text-xs text-[#C8C8C8] tabular-nums shrink-0">
                      {opt.votes} votes
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Liste classée : Les idées les plus soutenues — 0px upvote boxes + 6 statuts */}
          <section className="space-y-3 max-w-2xl">
            <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
              {isEn ? 'Most supported ideas' : 'Les idées les plus soutenues'}
            </h2>

            <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
              {filteredSuggestions.map((item, idx) => {
                const hasVoted = item.votedByKeys.includes(voterKey);
                const status = getStatusForSuggestion(item, idx);
                return (
                  <article
                    key={item.id}
                    className="py-4 flex items-start justify-between gap-3.5"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <span className="font-agrandir-extrabold text-sm text-[#D4AF6A] tabular-nums w-5 pt-0.5 shrink-0">
                        {idx + 1}
                      </span>

                      <div className="min-w-0 space-y-2">
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white leading-snug">
                          {item.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-[#9A9A9A]">
                            {item.type === 'artist_venue'
                              ? isEn
                                ? 'Artists'
                                : 'Concerts'
                              : isEn
                              ? 'Event concepts'
                              : 'Concepts de soirées'}
                          </span>
                          <StatusBadge
                            variant={status.variant}
                            label={isEn ? status.labelEn : status.labelFr}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleVote(item.id)}
                      aria-pressed={hasVoted}
                      className={`w-14 min-h-[54px] rounded-[14px] border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
                        hasVoted
                          ? 'bg-[#D4AF6A]/15 border-[#D4AF6A] text-[#D4AF6A]'
                          : 'bg-[#0E0E0E] border-white/[0.14] text-white hover:border-white/35'
                      }`}
                    >
                      <ChevronUp className="w-4 h-4" strokeWidth={1.6} />
                      <span className="font-mono text-xs font-bold tabular-nums">
                        {item.votes}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>

            <p className="pt-2 text-xs text-[#9A9A9A] leading-relaxed">
              {isEn
                ? 'Votes reflect community interest. Submitting an idea or voting does not guarantee scheduling — every proposal is reviewed by the LUMARÉEL team.'
                : "Les votes expriment l'intérêt de la communauté. Soumettre une idée ou voter ne garantit pas sa réalisation — chaque proposition est étudiée par l'équipe LUMARÉEL."}
            </p>
          </section>
        </div>
      )}

      {/* ONGLET 2 : PROPOSER (conteneur 20px, inputs 12px, boutons pilule) */}
      {activeTab === 'propose' && (
        <section className="max-w-xl rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] p-5 sm:p-6 space-y-5">
          {submittedIdea ? (
            <div className="py-4 space-y-5 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#7FE0A6] mx-auto" strokeWidth={1.6} />
              <div className="space-y-1.5">
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  {isEn ? 'PROPOSAL REGISTERED' : 'PROPOSITION ENREGISTRÉE'}
                </p>
                <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                  {submittedIdea.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#9A9A9A] max-w-md mx-auto leading-relaxed">
                  {isEn
                    ? 'Your idea is now visible for community votes and has been logged for review by our team.'
                    : "Votre idée est désormais ouverte aux votes de la communauté et transmise à l'équipe LUMARÉEL."}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedIdea(null);
                    setActiveTab('mine');
                  }}
                  className="min-h-[46px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs cursor-pointer lum-press"
                >
                  {isEn ? 'Track in My ideas' : 'Suivre dans Mes idées'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedIdea(null);
                    setActiveTab('trending');
                  }}
                  className="min-h-[46px] rounded-full border border-white/25 hover:border-white text-white font-agrandir-extrabold text-xs cursor-pointer"
                >
                  {isEn ? 'Back to Trending' : 'Retour aux tendances'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#9A9A9A]">
                  {isEn ? 'Proposal type' : 'Type de proposition'}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-[16px] bg-black border border-white/[0.12]">
                  {(
                    [
                      { id: 'artist', label: isEn ? 'Artist' : 'Artiste', icon: 'mic' },
                      { id: 'concert', label: 'Concert', icon: 'mic' },
                      { id: 'city', label: isEn ? 'City' : 'Ville', icon: 'bulb' },
                      { id: 'concept', label: isEn ? 'Concept' : 'Concept', icon: 'bulb' },
                    ] as const
                  ).map((item) => {
                    const active = proposalKind === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setProposalKind(item.id)}
                        className={`min-h-[38px] px-3 rounded-full text-xs font-agrandir-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                          active
                            ? 'bg-[#D4AF6A] text-black'
                            : 'text-[#9A9A9A] hover:text-white'
                        }`}
                      >
                        {item.icon === 'mic' ? (
                          <Mic2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5" strokeWidth={1.6} />
                        )}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {proposalKind === 'artist' || proposalKind === 'concert' ? (
                  <>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'Artist name' : "Nom de l'artiste"} *
                      </label>
                      <input
                        type="text"
                        value={artistName}
                        onChange={(e) => setArtistName(e.target.value)}
                        placeholder="Ex : Burna Boy, Didi B, Himra..."
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'City or venue' : 'Ville ou salle souhaitée'} *
                      </label>
                      <input
                        type="text"
                        value={cityOrVenue}
                        onChange={(e) => setCityOrVenue(e.target.value)}
                        placeholder="Ex : Abidjan · Palais de la Culture"
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                  </>
                ) : proposalKind === 'city' ? (
                  <>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'Suggested city' : 'Ville souhaitée'} *
                      </label>
                      <input
                        type="text"
                        value={cityOrVenue}
                        onChange={(e) => setCityOrVenue(e.target.value)}
                        placeholder="Ex : Dakar, Lomé, Cotonou, Paris..."
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'Format or artist wished (optional)' : 'Format ou artiste souhaité (optionnel)'}
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex : Soirée LUMARÉEL Live Session"
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'Concept or idea title' : 'Titre de votre concept'} *
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex : Soirée rooftop au coucher du soleil"
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#9A9A9A] mb-1.5">
                        {isEn ? 'City or venue (optional)' : 'Ville ou lieu suggéré (optionnel)'}
                      </label>
                      <input
                        type="text"
                        value={cityOrVenue}
                        onChange={(e) => setCityOrVenue(e.target.value)}
                        placeholder="Ex : Abidjan, Assinie..."
                        className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs text-[#9A9A9A] mb-1.5">
                    {isEn ? 'Details (optional)' : 'Précisions (optionnel)'}
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={
                      isEn
                        ? 'Describe the atmosphere or format...'
                        : "Décrivez l'ambiance ou le format souhaité..."
                    }
                    className="w-full p-3.5 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none resize-none"
                  />
                </div>

                {/* Image d'inspiration optionnelle */}
                <div>
                  <label className="block text-xs text-[#9A9A9A] mb-1.5">
                    {isEn ? 'Visual reference (optional)' : "Image d'inspiration (optionnel)"}
                  </label>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImagePick}
                    className="hidden"
                  />
                  {attachedImage ? (
                    <div className="relative rounded-[14px] overflow-hidden border border-white/[0.14] bg-black p-2">
                      <img
                        src={attachedImage}
                        alt="Reference"
                        className="w-full max-h-40 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachedImage('')}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/80 border border-white/20 flex items-center justify-center text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={1.6} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full min-h-[44px] px-4 rounded-xl border border-dashed border-white/25 hover:border-[#D4AF6A] text-xs text-[#C8C8C8] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                      <span>{isEn ? 'Attach an image' : 'Joindre une image'}</span>
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer lum-press"
                >
                  <Send className="w-4 h-4" strokeWidth={1.6} />
                  <span>{isEn ? 'Submit my idea' : 'Envoyer ma suggestion'}</span>
                </button>
                <p className="text-[11px] text-[#9A9A9A] text-center leading-relaxed">
                  {isEn
                    ? 'Submitting a proposal does not guarantee scheduling — every idea is reviewed by LUMARÉEL.'
                    : "Proposer une idée ne garantit pas sa réalisation — chaque suggestion est étudiée par LUMARÉEL."}
                </p>
              </form>
            </>
          )}
        </section>
      )}

      {/* ONGLET 3 : MES IDÉES (Suivi 5 étapes + Réponse équipe LUMARÉEL) */}
      {activeTab === 'mine' && (
        <section className="max-w-2xl space-y-4">
          {mySuggestions.length === 0 ? (
            <div className="py-10 text-center space-y-3 border-y border-white/[0.12]">
              <p className="text-sm text-[#9A9A9A]">
                {isEn
                  ? "You haven't submitted or voted for any ideas yet."
                  : "Vous n'avez encore proposé ni voté pour aucune idée."}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('propose')}
                className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs cursor-pointer lum-press"
              >
                {isEn ? 'Propose an idea' : 'Proposer une idée'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {mySuggestions.map((item, idx) => {
                const hasVoted = item.votedByKeys.includes(voterKey);
                const status = getStatusForSuggestion(item, idx);

                return (
                  <article
                    key={item.id}
                    className="rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1.5">
                        <StatusBadge
                          variant={status.variant}
                          label={isEn ? status.labelEn : status.labelFr}
                        />
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white">
                          {item.title}
                        </h3>
                        <p className="text-xs text-[#9A9A9A]">{item.cityOrVenue}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleVote(item.id)}
                        className={`w-14 min-h-[50px] rounded-[14px] border flex flex-col items-center justify-center gap-0.5 cursor-pointer shrink-0 ${
                          hasVoted
                            ? 'bg-[#D4AF6A]/15 border-[#D4AF6A] text-[#D4AF6A]'
                            : 'bg-black border-white/[0.14] text-white'
                        }`}
                      >
                        <ChevronUp className="w-4 h-4" strokeWidth={1.6} />
                        <span className="font-mono text-xs font-bold tabular-nums">
                          {item.votes}
                        </span>
                      </button>
                    </div>

                    {/* Barre de progression 4 étapes (Reçue → En étude → En préparation → Confirmée) */}
                    {status.stepIndex >= 0 && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-4 gap-1.5">
                          {progressSteps.map((stepLabel, sIdx) => {
                            const reached = sIdx <= status.stepIndex;
                            return (
                              <div key={stepLabel} className="space-y-1">
                                <div
                                  className={`h-1.5 w-full rounded-full ${
                                    reached ? 'bg-[#D4AF6A]' : 'bg-white/[0.12]'
                                  }`}
                                />
                                <span
                                  className={`block text-[9px] uppercase tracking-[0.06em] truncate ${
                                    reached
                                      ? 'text-[#D4AF6A] font-agrandir-extrabold'
                                      : 'text-[#9A9A9A]'
                                  }`}
                                >
                                  {stepLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Réponse officielle de l'équipe LUMARÉEL */}
                    <div className="p-3.5 rounded-[14px] bg-black border border-white/[0.12] space-y-1">
                      <p className="text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-[#D4AF6A]">
                        {isEn ? 'LUMARÉEL TEAM RESPONSE' : "RÉPONSE DE L'ÉQUIPE LUMARÉEL"}
                      </p>
                      <p className="text-xs text-[#C8C8C8] leading-relaxed">
                        {isEn ? status.teamNoteEn : status.teamNoteFr}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
