import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import artistThumb from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import venueThumb from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import ideaThumb from '../assets/images/concert_memories_crowd_1795735706315.jpg';

type SuggestionType = 'artist' | 'venue' | 'event';

type Suggestion = {
  id: string;
  suggestion_type: SuggestionType;
  title: string;
  status: string;
  created_at: string;
};

const STATUS_LABELS: Record<string, { fr: string; en: string }> = {
  received: { fr: 'Reçue', en: 'Received' },
  reviewing: { fr: 'En étude', en: 'In review' },
  selected: { fr: 'Retenue', en: 'Selected' },
  preparing: { fr: 'En préparation', en: 'In preparation' },
  realized: { fr: 'Réalisée', en: 'Realized' },
  declined: { fr: 'Non retenue', en: 'Declined' },
};

const PREVIEW_SUGGESTIONS: Suggestion[] = [
  {
    id: 'demo-sug-1',
    suggestion_type: 'artist',
    title: 'Burna Boy — Esplanade Abidjan',
    status: 'reviewing',
    created_at: '2026-11-23T15:00:00Z',
  },
  {
    id: 'demo-sug-2',
    suggestion_type: 'venue',
    title: 'Rooftop Plateau · Session Sunset',
    status: 'selected',
    created_at: '2026-11-18T11:30:00Z',
  },
  {
    id: 'demo-sug-3',
    suggestion_type: 'event',
    title: 'Concert acoustique à la bougie',
    status: 'preparing',
    created_at: '2026-11-12T19:45:00Z',
  },
];

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

function formatDate(iso: string, isEn: boolean) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

export const SuggestionsView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';

  const [items, setItems] = useState<Suggestion[]>([]);
  const [selectedKind, setSelectedKind] = useState<SuggestionType | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [city, setCity] = useState('');
  const [suggestedArtists, setSuggestedArtists] = useState('');
  const [suggestedVenue, setSuggestedVenue] = useState('');

  const load = useCallback(async () => {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setItems([]);
        return;
      }
      const { data, error: queryError } = await supabase
        .from('club_suggestions')
        .select('id,suggestion_type,title,status,created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false });
      if (!queryError) setItems(data || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  const resetForm = () => {
    setTitle('');
    setReason('');
    setLinkUrl('');
    setCity('');
    setSuggestedArtists('');
    setSuggestedVenue('');
  };

  const chooseKind = (kind: SuggestionType) => {
    resetForm();
    setSubmitted(false);
    setSelectedKind(kind);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKind) return;

    const cleanTitle = title.trim();
    const cleanReason = reason.trim();

    if (cleanTitle.length < 2 || cleanTitle.length > 140) {
      showToast(
        isEn
          ? 'Please enter between 2 and 140 characters.'
          : 'Écris entre 2 et 140 caractères.',
        'error'
      );
      return;
    }

    if (cleanReason.length > 3000) {
      showToast(
        isEn ? 'Your message is too long.' : 'Ton texte est un peu trop long.',
        'error'
      );
      return;
    }

    const parsedUrl = normalizeOptionalUrl(linkUrl);
    if (!parsedUrl.valid) {
      showToast(
        isEn ? 'Please enter a valid link.' : 'Entre un lien valide.',
        'error'
      );
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to send your idea.' : 'Connecte-toi pour envoyer ton idée.',
        'info'
      );
      return;
    }

    setSending(true);
    const payload = {
      user_id: auth.user.id,
      suggestion_type: selectedKind,
      title: cleanTitle,
      description: cleanReason,
      artist_type: null,
      profile_url: selectedKind === 'artist' ? parsedUrl.value : null,
      venue_type: null,
      city: selectedKind === 'venue' ? city.trim() || null : null,
      reference_url: selectedKind !== 'artist' ? parsedUrl.value : null,
      concept: selectedKind === 'event' ? cleanReason || null : null,
      suggested_venue: selectedKind === 'event' ? suggestedVenue.trim() || null : null,
      suggested_artists: selectedKind === 'event' ? suggestedArtists.trim() || null : null,
    };

    const { error: insertError } = await supabase.from('club_suggestions').insert(payload);
    setSending(false);

    if (insertError) {
      showToast(
        isEn ? 'Unable to send your idea. Please try again.' : 'Envoi impossible pour le moment. Réessaie.',
        'error'
      );
      return;
    }

    resetForm();
    setSubmitted(true);
    await load();
  };

  const options: Array<{
    id: SuggestionType;
    title: string;
    subtitle: string;
    image: string;
  }> = [
    {
      id: 'artist',
      title: isEn ? 'An artist' : 'Un artiste',
      subtitle: isEn
        ? 'Suggest an artist you want to see.'
        : 'Propose l’artiste que tu rêves de voir sur scène.',
      image: artistThumb,
    },
    {
      id: 'venue',
      title: isEn ? 'A venue' : 'Un lieu',
      subtitle: isEn
        ? 'Suggest a space for a future event.'
        : 'Propose un lieu pour notre prochain événement.',
      image: venueThumb,
    },
    {
      id: 'event',
      title: isEn ? 'An idea' : 'Une idée',
      subtitle: isEn
        ? 'Suggest a concept or experience.'
        : 'Propose un concept ou une expérience originale.',
      image: ideaThumb,
    },
  ];

  const activeOption = options.find((o) => o.id === selectedKind) || null;

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white pt-16 md:pt-12 pb-32 md:pb-24 transition-colors duration-200">
      <div className="mx-auto max-w-[640px] px-5 sm:px-8 pt-6 sm:pt-12">
        <AnimatePresence mode="wait">
          {submitted ? (
            /* CONFIRMATION */
            <motion.section
              key="confirmation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="py-16 sm:py-24 space-y-6"
            >
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111] dark:text-white leading-snug max-w-md">
                {isEn
                  ? 'Thank you. Your idea has been sent.'
                  : 'Merci ! Ton idée a bien été envoyée.'}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSelectedKind(null);
                }}
                className="text-[14px] font-medium text-[#6E6E73] hover:text-[#111111] dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isEn ? 'Submit another idea' : 'Proposer autre chose'}
              </button>
            </motion.section>
          ) : !selectedKind ? (
            /* SÉLECTION DES 3 POSSIBILITÉS */
            <motion.section
              key="choices"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-10 sm:space-y-12"
            >
              <h1 className="font-agrandir-extrabold text-[28px] sm:text-[36px] tracking-tight text-[#111111] dark:text-white leading-[1.16] max-w-lg">
                {isEn
                  ? 'What if your idea became our next event?'
                  : 'Et si ton idée devenait notre prochain événement ?'}
              </h1>

              <div className="divide-y divide-black/[0.08] dark:divide-white/[0.1] border-t border-b border-black/[0.08] dark:border-white/[0.1]">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => chooseKind(opt.id)}
                    className="group w-full py-5 sm:py-6 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={opt.image}
                        alt=""
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover grayscale contrast-105 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-agrandir-semibold text-[18px] sm:text-[20px] tracking-tight text-[#111111] dark:text-white">
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-[14px] text-[#6E6E73] dark:text-white/55 leading-snug">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#86868B] dark:text-white/45 shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#111111] dark:group-hover:text-white" />
                  </button>
                ))}
              </div>
            </motion.section>
          ) : (
            /* FORMULAIRE LÉGER ADAPTÉ AU CHOIX */
            <motion.section
              key={`form-${selectedKind}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="space-y-8"
            >
              <button
                type="button"
                onClick={() => setSelectedKind(null)}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#111111] dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isEn ? 'Back' : 'Retour'}</span>
              </button>

              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111] dark:text-white">
                {activeOption?.title}
              </h1>

              <form onSubmit={handleSubmit} className="space-y-7">
                {selectedKind === 'artist' && (
                  <>
                    <Field
                      label={isEn ? 'Artist name' : 'Nom de l’artiste'}
                      required
                      value={title}
                      onChange={setTitle}
                      placeholder={isEn ? 'Name' : 'Nom'}
                    />
                    <Field
                      label={isEn ? 'Link (optional)' : 'Lien (facultatif)'}
                      value={linkUrl}
                      onChange={setLinkUrl}
                      placeholder="https://..."
                    />
                    <TextAreaField
                      label={isEn ? 'Why this artist?' : 'Raison de la proposition'}
                      value={reason}
                      onChange={setReason}
                      placeholder={isEn ? 'A few words...' : 'Quelques mots...'}
                    />
                  </>
                )}

                {selectedKind === 'venue' && (
                  <>
                    <Field
                      label={isEn ? 'Venue name' : 'Nom du lieu'}
                      required
                      value={title}
                      onChange={setTitle}
                      placeholder={isEn ? 'Name' : 'Nom'}
                    />
                    <Field
                      label={isEn ? 'City or location' : 'Ville ou localisation'}
                      value={city}
                      onChange={setCity}
                      placeholder={isEn ? 'Abidjan, Cocody...' : 'Abidjan, Cocody...'}
                    />
                    <Field
                      label={isEn ? 'Link (optional)' : 'Lien (facultatif)'}
                      value={linkUrl}
                      onChange={setLinkUrl}
                      placeholder="https://..."
                    />
                    <TextAreaField
                      label={isEn ? 'Why this venue?' : 'Raison de la proposition'}
                      value={reason}
                      onChange={setReason}
                      placeholder={isEn ? 'A few words...' : 'Quelques mots...'}
                    />
                  </>
                )}

                {selectedKind === 'event' && (
                  <>
                    <Field
                      label={isEn ? 'Title' : 'Titre'}
                      required
                      value={title}
                      onChange={setTitle}
                      placeholder={isEn ? 'Your idea' : 'Ton idée'}
                    />
                    <TextAreaField
                      label={isEn ? 'Description' : 'Description'}
                      value={reason}
                      onChange={setReason}
                      placeholder={isEn ? 'Describe the experience...' : 'Décris l’expérience...'}
                    />
                    <Field
                      label={isEn ? 'Artist (optional)' : 'Artiste éventuel (facultatif)'}
                      value={suggestedArtists}
                      onChange={setSuggestedArtists}
                      placeholder={isEn ? 'Optional' : 'Facultatif'}
                    />
                    <Field
                      label={isEn ? 'Venue (optional)' : 'Lieu éventuel (facultatif)'}
                      value={suggestedVenue}
                      onChange={setSuggestedVenue}
                      placeholder={isEn ? 'Optional' : 'Facultatif'}
                    />
                    <Field
                      label={isEn ? 'Reference link (optional)' : 'Référence (facultatif)'}
                      value={linkUrl}
                      onChange={setLinkUrl}
                      placeholder="https://..."
                    />
                  </>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={sending || title.trim().length < 2}
                    className="inline-flex items-center justify-center rounded-full bg-[#111111] text-white dark:bg-white dark:text-black px-7 py-3 text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-35 cursor-pointer"
                  >
                    {sending ? (isEn ? 'Sending...' : 'Envoi...') : isEn ? 'Send' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* MES PROPOSITIONS (ou aperçu des idées du Club) */}
        {!selectedKind && !submitted && (
          <section className="mt-14 pt-9 border-t border-black/[0.08] dark:border-white/[0.1]">
            <h2 className="text-[13px] font-medium text-[#6E6E73] dark:text-white/55 mb-4">
              {items.length > 0
                ? isEn
                  ? 'My proposals'
                  : 'Mes propositions'
                : isEn
                  ? 'Recent Club ideas'
                  : 'Idées récentes du Club'}
            </h2>
            <ul className="divide-y divide-black/[0.07] dark:divide-white/[0.08]">
              {(items.length > 0 ? items : PREVIEW_SUGGESTIONS).map((item) => {
                const statusLabel =
                  STATUS_LABELS[item.status]?.[isEn ? 'en' : 'fr'] || item.status;
                return (
                  <li
                    key={item.id}
                    className="py-3.5 flex items-baseline justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] text-[#111111] dark:text-white truncate">{item.title}</p>
                      <p className="text-[12px] text-[#86868B] dark:text-white/45 mt-0.5">
                        {formatDate(item.created_at, isEn)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] text-[#6E6E73] dark:text-white/55">
                      {statusLabel}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, required }) => (
  <label className="block space-y-1.5">
    <span className="block text-[13px] font-medium text-[#6E6E73] dark:text-white/60">{label}</span>
    <input
      type="text"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-black/[0.15] focus:border-[#111111] dark:border-white/[0.18] dark:focus:border-white py-2.5 text-[15px] text-[#111111] dark:text-white placeholder:text-[#A1A1A6] dark:placeholder:text-white/35 outline-none transition-colors"
    />
  </label>
);

const TextAreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block space-y-1.5">
    <span className="block text-[13px] font-medium text-[#6E6E73] dark:text-white/60">{label}</span>
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-black/[0.15] focus:border-[#111111] dark:border-white/[0.18] dark:focus:border-white py-2.5 text-[15px] text-[#111111] dark:text-white placeholder:text-[#A1A1A6] dark:placeholder:text-white/35 outline-none resize-none transition-colors"
    />
  </label>
);
