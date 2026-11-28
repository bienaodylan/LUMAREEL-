import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ClubSpaceNav } from './club/ClubSpaceNav';
import {
  ArrowUpRight,
  CheckCircle2,
  Lightbulb,
  MapPin,
  Mic2,
  Send,
} from 'lucide-react';

type SuggestionType = 'artist' | 'venue' | 'event';
type FilterType = 'all' | SuggestionType;

type Suggestion = {
  id: string;
  suggestion_type: SuggestionType;
  title: string;
  description: string;
  artist_type: string | null;
  venue_type: string | null;
  city: string | null;
  profile_url: string | null;
  reference_url: string | null;
  concept: string | null;
  suggested_venue: string | null;
  suggested_artists: string | null;
  status: string;
  admin_response: string | null;
  created_at: string;
};

const ARTIST_CATEGORIES = ['DJ', 'Chanteur', 'Groupe', 'Artiste', 'Performer'] as const;

const VENUE_CATEGORIES: Array<{ value: string; labelFr: string; labelEn: string }> = [
  { value: 'club', labelFr: 'Club', labelEn: 'Club' },
  { value: 'rooftop', labelFr: 'Rooftop', labelEn: 'Rooftop' },
  { value: 'villa', labelFr: 'Villa', labelEn: 'Villa' },
  { value: 'salle', labelFr: 'Salle', labelEn: 'Venue / Hall' },
  { value: 'lieu atypique', labelFr: 'Espace atypique', labelEn: 'Unique space' },
  { value: 'autre', labelFr: 'Autre lieu', labelEn: 'Other place' },
];

const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  received: { fr: 'Reçue', en: 'Received' },
  reviewing: { fr: 'En étude', en: 'Under review' },
  selected: { fr: 'Retenue', en: 'Selected' },
  preparing: { fr: 'En préparation', en: 'In preparation' },
  realized: { fr: 'Réalisée', en: 'Realized' },
  declined: { fr: 'Non retenue', en: 'Not selected' },
};

function normalizeOptionalUrl(raw: string): { valid: boolean; value: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { valid: true, value: null };
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname.includes('.')) return { valid: false, value: null };
    return { valid: true, value: candidate };
  } catch {
    return { valid: false, value: null };
  }
}

export const SuggestionsView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const [kind, setKind] = useState<SuggestionType>('artist');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [artistType, setArtistType] = useState<string>('DJ');
  const [profileUrl, setProfileUrl] = useState('');
  const [venueType, setVenueType] = useState<string>('rooftop');
  const [city, setCity] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [concept, setConcept] = useState('');
  const [suggestedVenue, setSuggestedVenue] = useState('');
  const [suggestedArtists, setSuggestedArtists] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setIsSignedIn(false);
        setItems([]);
        return;
      }
      setIsSignedIn(true);
      const { data, error: queryError } = await supabase
        .from('club_suggestions')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setItems(data || []);
    } catch (err: any) {
      setError(
        err?.message ||
          (isEn
            ? 'Unable to load your proposals.'
            : 'Impossible de charger vos propositions.')
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    return items.filter((item) => item.suggestion_type === filterType);
  }, [items, filterType]);

  const realizedItems = useMemo(
    () => items.filter((item) => item.status === 'realized'),
    [items]
  );

  const switchKind = (nextKind: SuggestionType) => {
    setKind(nextKind);
    setTitle('');
    setDescription('');
    setConcept('');
    setProfileUrl('');
    setReferenceUrl('');
    setCity('');
    setSuggestedVenue('');
    setSuggestedArtists('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = kind === 'event' ? concept.trim() : description.trim();

    if (cleanTitle.length < 2 || cleanTitle.length > 140) {
      showToast(
        isEn
          ? 'Please enter a title between 2 and 140 characters.'
          : 'Veuillez saisir un nom ou titre compris entre 2 et 140 caractères.',
        'error'
      );
      return;
    }

    if (cleanBody.length > 3000) {
      showToast(
        isEn ? 'Your message is too long (max 3000 characters).' : 'Votre texte dépasse 3 000 caractères.',
        'error'
      );
      return;
    }

    const parsedProfileUrl = kind === 'artist' ? normalizeOptionalUrl(profileUrl) : { valid: true, value: null };
    const parsedRefUrl = kind !== 'artist' ? normalizeOptionalUrl(referenceUrl) : { valid: true, value: null };

    if (!parsedProfileUrl.valid || !parsedRefUrl.valid) {
      showToast(
        isEn ? 'Please enter a valid web link (e.g. https://...).' : 'Veuillez saisir un lien valide (ex. https://...).',
        'error'
      );
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to submit your proposal.' : 'Connectez-vous pour transmettre votre proposition.',
        'info'
      );
      return;
    }

    setSending(true);
    const payload = {
      user_id: auth.user.id,
      suggestion_type: kind,
      title: cleanTitle,
      description: cleanBody,
      artist_type: kind === 'artist' ? artistType : null,
      profile_url: parsedProfileUrl.value,
      venue_type: kind === 'venue' ? venueType : null,
      city: kind === 'venue' ? city.trim() || null : null,
      reference_url: parsedRefUrl.value,
      concept: kind === 'event' ? cleanBody || null : null,
      suggested_venue: kind === 'event' ? suggestedVenue.trim() || null : null,
      suggested_artists: kind === 'event' ? suggestedArtists.trim() || null : null,
    };

    const { error: insertError } = await supabase.from('club_suggestions').insert(payload);
    setSending(false);

    if (insertError) {
      showToast(
        isEn
          ? 'Your proposal could not be sent. Please try again.'
          : 'Votre proposition n’a pas pu être envoyée. Veuillez réessayer.',
        'error'
      );
      return;
    }

    switchKind(kind);
    showToast(
      isEn
        ? 'Your proposal has been received by LUMARÉEL.'
        : 'Votre proposition a bien été reçue par LUMARÉEL.',
      'success'
    );
    await load();
  };

  const getTypeLabel = (type: SuggestionType) => {
    if (type === 'artist') return isEn ? 'Artist' : 'Artiste';
    if (type === 'venue') return isEn ? 'Venue' : 'Lieu';
    return isEn ? 'Event idea' : 'Idée d’événement';
  };

  const getStatusText = (status: string) =>
    STATUS_LABELS[status]?.[isEn ? 'en' : 'fr'] || status;

  const inputClass =
    'w-full min-h-12 bg-transparent border-b border-white/20 px-0 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white transition-colors';
  const labelClass = 'mb-2 block text-[10px] uppercase tracking-[0.18em] text-neutral-500';

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-3 sm:pt-8 pb-24 text-white bg-black">
      <ClubSpaceNav active="suggestions" className="mb-8 sm:mb-12" />

      {/* A. PRÉSENTATION */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="pb-9 sm:pb-12 border-b border-white/10"
      >
        <p className="text-[10px] uppercase tracking-[0.26em] text-neutral-500">
          LUMARÉEL CLUB · {isEn ? 'YOUR VOICE' : 'TA VOIX'}
        </p>
        <h1 className="mt-4 max-w-4xl text-[clamp(2.25rem,7.4vw,5.1rem)] font-agrandir-extrabold leading-[0.94] tracking-[-0.03em] text-white">
          {isEn
            ? 'What if the next event came from you?'
            : 'Et si le prochain événement venait de vous ?'}
        </h1>
        <p className="mt-5 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">
          {isEn
            ? 'Artists, venues, concepts and ideas. Suggest what you would like to experience with LUMARÉEL.'
            : 'Artistes, lieux, concepts et idées. Proposez-nous ce que vous aimeriez voir chez LUMARÉEL.'}
        </p>
      </motion.header>

      {/* B / C / D. FORMULAIRES + E. MES PROPOSITIONS */}
      <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 py-10 sm:py-14 border-b border-white/10">
        {/* Colonne gauche : Soumettre une proposition */}
        <section className="lg:col-span-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-5">
            01 · {isEn ? 'SUBMIT A PROPOSAL' : 'PROPOSER'}
          </p>

          {/* Sélecteur des 3 catégories */}
          <div className="mb-8 grid grid-cols-3 border-b border-white/15">
            {(
              [
                { id: 'artist', label: isEn ? 'Artist' : 'Un artiste', icon: Mic2 },
                { id: 'venue', label: isEn ? 'Venue' : 'Un lieu', icon: MapPin },
                { id: 'event', label: isEn ? 'Event idea' : 'Une idée', icon: Lightbulb },
              ] as const
            ).map((option) => {
              const Icon = option.icon;
              const active = kind === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => switchKind(option.id)}
                  className={`min-h-14 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs transition-colors cursor-pointer ${
                    active
                      ? 'text-white font-agrandir-extrabold border-b-2 border-white'
                      : 'text-neutral-500 hover:text-neutral-300 font-agrandir-semibold'
                  }`}
                >
                  <Icon size={15} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* B. PROPOSER UN ARTISTE */}
            {kind === 'artist' && (
              <>
                <div>
                  <span className={labelClass}>
                    {isEn ? 'Category' : 'Catégorie'}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {ARTIST_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setArtistType(cat)}
                        className={`px-3.5 py-2 text-xs border transition-colors cursor-pointer ${
                          artistType === cat
                            ? 'bg-white text-black border-white font-agrandir-extrabold'
                            : 'bg-transparent text-neutral-400 border-white/15 hover:border-white/50 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="voice-artist-name" className={labelClass}>
                    {isEn ? 'Artist name' : 'Nom de l’artiste'} *
                  </label>
                  <input
                    id="voice-artist-name"
                    required
                    minLength={2}
                    maxLength={140}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder={isEn ? 'Name of the artist, DJ or group' : 'Nom de l’artiste, DJ, chanteur ou groupe'}
                  />
                </div>

                <div>
                  <label htmlFor="voice-artist-link" className={labelClass}>
                    {isEn ? 'Optional link' : 'Lien facultatif'}
                  </label>
                  <input
                    id="voice-artist-link"
                    type="text"
                    inputMode="url"
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    className={inputClass}
                    placeholder="https://instagram.com/… ou Spotify, YouTube"
                  />
                </div>

                <div>
                  <label htmlFor="voice-artist-reason" className={labelClass}>
                    {isEn ? 'Why this artist?' : 'Raison de la proposition'}
                  </label>
                  <textarea
                    id="voice-artist-reason"
                    rows={4}
                    maxLength={3000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputClass} resize-y`}
                    placeholder={
                      isEn
                        ? 'Tell us why you would love to see them with LUMARÉEL…'
                        : 'Dites-nous pourquoi vous aimeriez découvrir cet artiste avec LUMARÉEL…'
                    }
                  />
                </div>
              </>
            )}

            {/* C. PROPOSER UN LIEU */}
            {kind === 'venue' && (
              <>
                <div>
                  <span className={labelClass}>
                    {isEn ? 'Type of venue' : 'Type de lieu'}
                  </span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {VENUE_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setVenueType(cat.value)}
                        className={`px-3.5 py-2 text-xs border transition-colors cursor-pointer ${
                          venueType === cat.value
                            ? 'bg-white text-black border-white font-agrandir-extrabold'
                            : 'bg-transparent text-neutral-400 border-white/15 hover:border-white/50 hover:text-white'
                        }`}
                      >
                        {isEn ? cat.labelEn : cat.labelFr}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="voice-venue-name" className={labelClass}>
                    {isEn ? 'Venue name' : 'Nom du lieu'} *
                  </label>
                  <input
                    id="voice-venue-name"
                    required
                    minLength={2}
                    maxLength={140}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder={isEn ? 'Name of the club, rooftop, villa or space' : 'Nom du lieu ou de l’espace'}
                  />
                </div>

                <div>
                  <label htmlFor="voice-venue-city" className={labelClass}>
                    {isEn ? 'Location' : 'Localisation'}
                  </label>
                  <input
                    id="voice-venue-city"
                    maxLength={120}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputClass}
                    placeholder={isEn ? 'Neighborhood, city…' : 'Quartier, ville…'}
                  />
                </div>

                <div>
                  <label htmlFor="voice-venue-link" className={labelClass}>
                    {isEn ? 'Optional link' : 'Lien facultatif'}
                  </label>
                  <input
                    id="voice-venue-link"
                    type="text"
                    inputMode="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    className={inputClass}
                    placeholder="https://…"
                  />
                </div>

                <div>
                  <label htmlFor="voice-venue-reason" className={labelClass}>
                    {isEn ? 'Why this venue?' : 'Raison de la proposition'}
                  </label>
                  <textarea
                    id="voice-venue-reason"
                    rows={4}
                    maxLength={3000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${inputClass} resize-y`}
                    placeholder={
                      isEn
                        ? 'Atmosphere, acoustics, view, capacity…'
                        : 'Atmosphère, cadre, capacité, ce qui rend ce lieu singulier…'
                    }
                  />
                </div>
              </>
            )}

            {/* D. PROPOSER UNE IDÉE D'ÉVÉNEMENT */}
            {kind === 'event' && (
              <>
                <div>
                  <label htmlFor="voice-idea-title" className={labelClass}>
                    {isEn ? 'Concept or idea title' : 'Titre du concept ou de l’idée'} *
                  </label>
                  <input
                    id="voice-idea-title"
                    required
                    minLength={2}
                    maxLength={140}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClass}
                    placeholder={
                      isEn
                        ? 'A night, collaboration, artistic experience…'
                        : 'Une soirée, un concept, une expérience, une collaboration…'
                    }
                  />
                </div>

                <div>
                  <label htmlFor="voice-idea-concept" className={labelClass}>
                    {isEn ? 'Your idea' : 'Votre idée librement'}
                  </label>
                  <textarea
                    id="voice-idea-concept"
                    rows={5}
                    maxLength={3000}
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className={`${inputClass} resize-y`}
                    placeholder={
                      isEn
                        ? 'Describe the atmosphere, format or experience you imagine…'
                        : 'Décrivez l’ambiance, le format ou l’expérience que vous imaginez…'
                    }
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="voice-idea-venue" className={labelClass}>
                      {isEn ? 'Suggested venue (optional)' : 'Lieu envisagé (facultatif)'}
                    </label>
                    <input
                      id="voice-idea-venue"
                      value={suggestedVenue}
                      onChange={(e) => setSuggestedVenue(e.target.value)}
                      className={inputClass}
                      placeholder={isEn ? 'Optional' : 'Facultatif'}
                    />
                  </div>
                  <div>
                    <label htmlFor="voice-idea-artists" className={labelClass}>
                      {isEn ? 'Suggested artists (optional)' : 'Artistes envisagés (facultatif)'}
                    </label>
                    <input
                      id="voice-idea-artists"
                      value={suggestedArtists}
                      onChange={(e) => setSuggestedArtists(e.target.value)}
                      className={inputClass}
                      placeholder={isEn ? 'Optional' : 'Facultatif'}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="voice-idea-link" className={labelClass}>
                    {isEn ? 'Reference link (optional)' : 'Lien ou inspiration (facultatif)'}
                  </label>
                  <input
                    id="voice-idea-link"
                    type="text"
                    inputMode="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    className={inputClass}
                    placeholder="https://…"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={sending || title.trim().length < 2}
              className="w-full min-h-12 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.14em] inline-flex items-center justify-center gap-2 hover:bg-neutral-200 transition-colors disabled:opacity-35 cursor-pointer"
            >
              <Send size={14} />
              <span>
                {sending
                  ? isEn
                    ? 'Sending…'
                    : 'Envoi en cours…'
                  : isEn
                    ? 'Send my proposal'
                    : 'Envoyer ma proposition'}
              </span>
            </button>
          </form>
        </section>

        {/* E. MES PROPOSITIONS */}
        <section className="lg:col-span-6 lg:border-l lg:border-white/10 lg:pl-12">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                02 · {isEn ? 'YOUR TRACKING' : 'VOTRE SUIVI'}
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">
                {isEn ? 'My proposals' : 'Mes propositions'}
              </h2>
            </div>
            <span className="text-xs text-neutral-500 tabular-nums">{items.length}</span>
          </div>

          {items.length > 1 && (
            <div className="mb-6 flex items-center gap-5 text-[11px] uppercase tracking-[0.12em] overflow-x-auto scrollbar-hide border-b border-white/10 pb-3">
              {(
                [
                  { id: 'all', label: isEn ? 'All' : 'Toutes' },
                  { id: 'artist', label: isEn ? 'Artists' : 'Artistes' },
                  { id: 'venue', label: isEn ? 'Venues' : 'Lieux' },
                  { id: 'event', label: isEn ? 'Ideas' : 'Idées' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterType(tab.id)}
                  className={`shrink-0 transition-colors cursor-pointer ${
                    filterType === tab.id
                      ? 'text-white font-agrandir-extrabold'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {!isSignedIn ? (
            <div className="border border-white/12 bg-[#080808] p-6 sm:p-8">
              <p className="text-base font-agrandir-extrabold text-white">
                {isEn ? 'Track your submissions' : 'Suivez l’évolution de vos propositions'}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {isEn
                  ? 'Sign in with your LUMARÉEL account to submit artists, venues or event ideas and follow their status.'
                  : 'Connectez-vous avec votre compte LUMARÉEL pour proposer vos idées et suivre leur statut en temps réel.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-5 min-h-11 px-6 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.12em] cursor-pointer"
              >
                {isEn ? 'Sign in' : 'Se connecter'}
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-4 py-6">
              <div className="h-24 lum-skeleton" />
              <div className="h-24 lum-skeleton" />
            </div>
          ) : error ? (
            <p className="py-8 text-sm text-neutral-400">{error}</p>
          ) : filteredItems.length > 0 ? (
            <div className="divide-y divide-white/10 border-t border-white/10">
              {filteredItems.map((item) => {
                const body = item.description || item.concept;
                const externalLink = item.profile_url || item.reference_url;
                const isHighlightedStatus =
                  item.status === 'selected' ||
                  item.status === 'preparing' ||
                  item.status === 'realized';

                return (
                  <article key={item.id} className="py-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                          {getTypeLabel(item.suggestion_type)}
                          {item.artist_type ? ` · ${item.artist_type}` : ''}
                          {item.venue_type ? ` · ${item.venue_type}` : ''}
                          {item.city ? ` · ${item.city}` : ''}
                        </p>
                        <h3 className="mt-1.5 text-lg font-agrandir-extrabold text-white">
                          {item.title}
                        </h3>
                      </div>

                      <span
                        className={`shrink-0 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] border ${
                          isHighlightedStatus
                            ? 'border-white/40 text-white bg-white/[0.06]'
                            : 'border-white/15 text-neutral-400'
                        }`}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </div>

                    {body && (
                      <p className="mt-3 text-sm leading-6 text-neutral-400 whitespace-pre-wrap">
                        {body}
                      </p>
                    )}

                    <div className="mt-3.5 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
                      <span>
                        {new Date(item.created_at).toLocaleDateString(
                          isEn ? 'en-GB' : 'fr-FR',
                          { day: 'numeric', month: 'long', year: 'numeric' }
                        )}
                      </span>
                      {externalLink && (
                        <a
                          href={externalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-neutral-300 hover:text-white underline underline-offset-4"
                        >
                          {isEn ? 'Link' : 'Lien'}
                          <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>

                    {item.admin_response && (
                      <div className="mt-4 border-l border-white/30 pl-4 py-1">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                          {isEn ? 'LUMARÉEL response' : 'Retour de LUMARÉEL'}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-neutral-200">
                          {item.admin_response}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="border-y border-white/10 py-14 text-center">
              <CheckCircle2 size={20} className="mx-auto text-neutral-600" />
              <p className="mt-4 text-base font-agrandir-extrabold text-white">
                {isEn ? 'No proposals yet.' : 'Aucune proposition pour le moment.'}
              </p>
              <p className="mt-2 text-xs leading-5 text-neutral-500 max-w-sm mx-auto">
                {isEn
                  ? 'Every artist, venue or concept you share will appear here along with its review status.'
                  : 'Chaque artiste, lieu ou concept que vous proposez apparaîtra ici avec son statut d’avancement.'}
              </p>
            </div>
          )}
        </section>
      </div>

      {/* F. PARTICIPATION COMMUNAUTAIRE */}
      <section className="pt-12 sm:pt-16">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
            03 · {isEn ? 'COMMUNITY IMPACT' : 'PARTICIPATION COMMUNAUTAIRE'}
          </p>
          <h2 className="mt-3 text-2xl sm:text-4xl font-agrandir-extrabold leading-[1.02] tracking-tight text-white">
            {isEn
              ? 'You suggested. We listened.'
              : 'Vous nous avez proposé. Nous avons écouté.'}
          </h2>
        </div>

        {realizedItems.length > 0 ? (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {realizedItems.map((item) => (
              <article
                key={item.id}
                className="border-t border-white/20 pt-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    <span>{getTypeLabel(item.suggestion_type)}</span>
                    <span className="text-white">{isEn ? 'Realized' : 'Réalisée'}</span>
                  </div>
                  <h3 className="mt-2.5 text-xl font-agrandir-extrabold text-white">
                    {item.title}
                  </h3>
                  {(item.description || item.concept) && (
                    <p className="mt-2 text-sm leading-6 text-neutral-400 line-clamp-3">
                      {item.description || item.concept}
                    </p>
                  )}
                </div>
                {item.admin_response && (
                  <p className="mt-4 pt-3 border-t border-white/10 text-xs text-neutral-300">
                    {item.admin_response}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 border border-white/10 bg-[#070707] p-6 sm:p-10">
            <p className="max-w-xl text-sm leading-7 text-neutral-400">
              {isEn
                ? 'Proposals submitted by members that come to life with LUMARÉEL are highlighted here. Share your ideas above to help shape the next chapters.'
                : 'Les propositions de la communauté qui prennent vie avec LUMARÉEL sont mises en lumière ici. Partagez vos idées pour contribuer aux prochaines éditions.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
