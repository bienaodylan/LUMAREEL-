import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CommunitySuggestion,
  getUserStorageKey,
  loadSuggestions,
  markChallengeCompleted,
  saveSuggestions,
} from '../utils/communityStorage';
import { ArrowUp, Lightbulb, MapPin, Mic2, Send } from 'lucide-react';

type SuggestionFilter = 'all' | 'artist_venue' | 'general_event';
type SortMode = 'popular' | 'recent';

export const SuggestionsView: React.FC = () => {
  const { currentUser, showToast, language } = useApp();
  const isEn = language === 'en';

  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>(() => loadSuggestions());
  const [formType, setFormType] = useState<'artist_venue' | 'general_event'>('artist_venue');
  const [artistName, setArtistName] = useState('');
  const [title, setTitle] = useState('');
  const [cityOrVenue, setCityOrVenue] = useState('');
  const [description, setDescription] = useState('');

  const [filter, setFilter] = useState<SuggestionFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('popular');

  const voterKey = getUserStorageKey(currentUser);

  const visibleSuggestions = useMemo(() => {
    const filtered =
      filter === 'all' ? suggestions : suggestions.filter((s) => s.type === filter);
    return [...filtered].sort((a, b) => {
      if (sortMode === 'popular') return b.votes - a.votes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [suggestions, filter, sortMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCity = cityOrVenue.trim();
    const cleanDesc = description.trim();

    if (formType === 'artist_venue') {
      if (!artistName.trim() || !cleanCity) {
        showToast(
          isEn
            ? 'Please enter both the artist name and the city or venue.'
            : 'Indiquez le nom de l’artiste ainsi que la ville ou la salle souhaitée.',
          'error'
        );
        return;
      }
    } else {
      if (!title.trim() || !cleanDesc) {
        showToast(
          isEn
            ? 'Please enter an event idea title and a short description.'
            : 'Indiquez un titre et une courte description pour votre idée d’événement.',
          'error'
        );
        return;
      }
    }

    const newItem: CommunitySuggestion = {
      id: `sug_${Date.now()}`,
      type: formType,
      artistName: formType === 'artist_venue' ? artistName.trim() : undefined,
      title:
        formType === 'artist_venue'
          ? `${artistName.trim()} — ${cleanCity}`
          : title.trim(),
      cityOrVenue: cleanCity || (isEn ? 'Open location' : 'Lieu libre'),
      description:
        cleanDesc ||
        (isEn
          ? `Community request to bring ${artistName.trim()} live to ${cleanCity}.`
          : `Demande de la communauté pour accueillir ${artistName.trim()} en concert à ${cleanCity}.`),
      authorName: currentUser?.name || (isEn ? 'Community Member' : 'Membre LUMARÉEL'),
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

    const unlocked = markChallengeCompleted(currentUser, 'challenge_suggestion');
    showToast(
      unlocked
        ? (isEn ? 'Suggestion published! +75 challenge points earned.' : 'Suggestion publiée ! +75 points défi ajoutés.')
        : (isEn ? 'Your suggestion has been added to the community board.' : 'Votre suggestion a bien été ajoutée à la boîte à idées.'),
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

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      <header className="mb-8 pb-6 border-b border-white/10">
        <p className="text-xs tracking-[0.2em] text-[#D4AF37] uppercase mb-2">
          {isEn ? 'Community Voice · Lineup Wishes' : 'Voix du Public · Programmation'}
        </p>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-[1.02] text-balance">
          {isEn ? 'Suggestion Box' : 'Boîte à Suggestions'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-3 max-w-2xl leading-relaxed">
          {isEn
            ? 'Tell us which artist you want on stage and where, or pitch your own event concept. Vote on the community’s top requests.'
            : 'Proposez l’artiste que vous rêvez de voir sur scène et la ville ou salle idéale, ou soumettez vos idées d’événements en général.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Colonne gauche : Formulaire de proposition */}
        <section className="lg:col-span-5 rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black border border-white/10">
            <button
              type="button"
              onClick={() => setFormType('artist_venue')}
              className={`min-h-[42px] px-3 rounded-lg text-xs font-agrandir-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                formType === 'artist_venue' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic2 className="w-3.5 h-3.5" />
              <span>{isEn ? 'Artist & Venue' : 'Artiste & Lieu'}</span>
            </button>
            <button
              type="button"
              onClick={() => setFormType('general_event')}
              className={`min-h-[42px] px-3 rounded-lg text-xs font-agrandir-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                formType === 'general_event' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>{isEn ? 'Event Idea' : 'Événement'}</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formType === 'artist_venue' ? (
              <>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    {isEn ? 'Which artist do you want to see?' : 'Quel artiste avez-vous envie de voir ?'} *
                  </label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    placeholder={isEn ? 'e.g. Burna Boy, Didi B, Himra...' : 'Ex : Burna Boy, Didi B, Himra...'}
                    className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    {isEn ? 'Where would you like to see them?' : 'Où aimeriez-vous le voir (ville / salle) ?'} *
                  </label>
                  <input
                    type="text"
                    value={cityOrVenue}
                    onChange={(e) => setCityOrVenue(e.target.value)}
                    placeholder={isEn ? 'e.g. Abidjan · Palais de la Culture' : 'Ex : Abidjan · Palais de la Culture'}
                    className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    {isEn ? 'Event concept title' : 'Titre de votre idée d’événement'} *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isEn ? 'e.g. Rooftop Sunset Acoustic Session' : 'Ex : Soirée Acoustique Coucher de Soleil'}
                    className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">
                    {isEn ? 'Suggested city or venue' : 'Ville ou lieu suggéré'}
                  </label>
                  <input
                    type="text"
                    value={cityOrVenue}
                    onChange={(e) => setCityOrVenue(e.target.value)}
                    placeholder={isEn ? 'e.g. Abidjan, Assinie, Dakar...' : 'Ex : Abidjan, Assinie, Dakar...'}
                    className="w-full min-h-[46px] px-4 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">
                {isEn ? 'Details, vibe or special wish' : 'Précisions, ambiance ou format souhaité'}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  isEn
                    ? 'Tell us what would make this night unforgettable...'
                    : 'Décrivez ce qui rendrait cet événement mémorable...'
                }
                className="w-full p-3.5 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#D4AF37] focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-[48px] rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isEn ? 'Submit suggestion' : 'Envoyer ma suggestion'}</span>
            </button>
          </form>
        </section>

        {/* Colonne droite : Mur des suggestions & votes */}
        <section className="lg:col-span-7 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all' as const, fr: 'Toutes', en: 'All' },
                { id: 'artist_venue' as const, fr: 'Artistes & Lieux', en: 'Artists & Venues' },
                { id: 'general_event' as const, fr: 'Événements', en: 'General Events' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-agrandir-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === f.id
                      ? 'bg-white text-black'
                      : 'bg-[#111111] border border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {isEn ? f.en : f.fr}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSortMode('popular')}
                className={`min-h-[38px] px-3 rounded-lg text-xs cursor-pointer ${
                  sortMode === 'popular' ? 'text-[#D4AF37] font-agrandir-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isEn ? 'Top voted' : 'Plus votés'}
              </button>
              <span className="text-neutral-600">·</span>
              <button
                type="button"
                onClick={() => setSortMode('recent')}
                className={`min-h-[38px] px-3 rounded-lg text-xs cursor-pointer ${
                  sortMode === 'recent' ? 'text-[#D4AF37] font-agrandir-bold' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {isEn ? 'Newest' : 'Récents'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {visibleSuggestions.map((item) => {
              const hasVoted = item.votedByKeys.includes(voterKey);
              return (
                <article
                  key={item.id}
                  className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-5 sm:p-6 flex items-start justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
                      <span className="text-[#D4AF37] font-agrandir-bold">
                        {item.type === 'artist_venue'
                          ? (isEn ? 'Artist & Venue' : 'Artiste & Lieu')
                          : (isEn ? 'Event Concept' : 'Idée d’événement')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-500" />
                        {item.cityOrVenue}
                      </span>
                    </div>

                    <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="text-[11px] text-neutral-500 pt-1">
                      {isEn ? 'Proposed by' : 'Proposé par'} {item.authorName}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleVote(item.id)}
                    aria-pressed={hasVoted}
                    className={`min-w-[60px] min-h-[60px] px-3 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer shrink-0 ${
                      hasVoted
                        ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-black border-white/15 text-neutral-300 hover:border-white/35 hover:text-white'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                    <span className="font-mono text-sm font-bold tabular-nums">{item.votes}</span>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
