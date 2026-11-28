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
          : 'Veuillez saisir entre 2 et 140 caractères.',
        'error'
      );
      return;
    }

    if (cleanReason.length > 3000) {
      showToast(
        isEn ? 'Your message is too long.' : 'Votre texte dépasse la limite autorisée.',
        'error'
      );
      return;
    }

    const parsedUrl = normalizeOptionalUrl(linkUrl);
    if (!parsedUrl.valid) {
      showToast(
        isEn ? 'Please enter a valid link.' : 'Veuillez saisir un lien valide.',
        'error'
      );
      return;
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setIsAuthModalOpen(true);
      showToast(
        isEn ? 'Sign in to send your idea.' : 'Connectez-vous pour envoyer votre idée.',
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
        isEn ? 'Unable to send your idea. Please try again.' : 'Envoi impossible. Veuillez réessayer.',
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
        : 'Proposer l’artiste que l’on aimerait voir.',
      image: artistThumb,
    },
    {
      id: 'venue',
      title: isEn ? 'A venue' : 'Un lieu',
      subtitle: isEn
        ? 'Suggest a space for a future event.'
        : 'Proposer un lieu pour un prochain événement.',
      image: venueThumb,
    },
    {
      id: 'event',
      title: isEn ? 'An idea' : 'Une idée',
      subtitle: isEn
        ? 'Suggest a concept or experience.'
        : 'Proposer un concept ou une expérience.',
      image: ideaThumb,
    },
  ];

  const activeOption = options.find((o) => o.id === selectedKind) || null;

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#111111] pt-16 md:pt-12 pb-32 md:pb-24">
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
              <div className="w-10 h-10 rounded-full bg-[#111111] text-white flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111] leading-snug max-w-md">
                {isEn
                  ? 'Thank you. Your idea has been sent.'
                  : 'Merci. Votre idée a bien été envoyée.'}
              </h1>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSelectedKind(null);
                }}
                className="text-[14px] font-medium text-[#6E6E73] hover:text-[#111111] transition-colors"
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
              <h1 className="font-agrandir-extrabold text-[28px] sm:text-[36px] tracking-tight text-[#111111] leading-[1.16] max-w-lg">
                {isEn
                  ? 'What if your idea became our next event?'
                  : 'Et si votre idée devenait notre prochain événement ?'}
              </h1>

              <div className="divide-y divide-black/[0.08] border-t border-b border-black/[0.08]">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => chooseKind(opt.id)}
                    className="group w-full py-5 sm:py-6 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={opt.image}
                        alt=""
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover grayscale contrast-105 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-agrandir-semibold text-[18px] sm:text-[20px] tracking-tight text-[#111111]">
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-[14px] text-[#6E6E73] leading-snug">
                          {opt.subtitle}
                        </p>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#86868B] shrink-0 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[#111111]" />
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
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#111111] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isEn ? 'Back' : 'Retour'}</span>
              </button>

              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111]">
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
                      placeholder={isEn ? 'Your idea' : 'Votre idée'}
                    />
                    <TextAreaField
                      label={isEn ? 'Description' : 'Description'}
                      value={reason}
                      onChange={setReason}
                      placeholder={isEn ? 'Describe the experience...' : 'Décrivez l’expérience...'}
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
                    className="inline-flex items-center justify-center rounded-full bg-[#111111] text-white px-7 py-3 text-[14px] font-medium transition-opacity hover:opacity-85 disabled:opacity-35"
                  >
                    {sending ? (isEn ? 'Sending...' : 'Envoi...') : isEn ? 'Send' : 'Envoyer'}
                  </button>
                </div>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* MES PROPOSITIONS — affiché uniquement si le membre a déjà proposé */}
        {items.length > 0 && !selectedKind && !submitted && (
          <section className="mt-16 pt-10 border-t border-black/[0.08]">
            <h2 className="text-[13px] font-medium text-[#6E6E73] mb-4">
              {isEn ? 'My proposals' : 'Mes propositions'}
            </h2>
            <ul className="divide-y divide-black/[0.07]">
              {items.map((item) => {
                const statusLabel =
                  STATUS_LABELS[item.status]?.[isEn ? 'en' : 'fr'] || item.status;
                return (
                  <li
                    key={item.id}
                    className="py-3.5 flex items-baseline justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] text-[#111111] truncate">{item.title}</p>
                      <p className="text-[12px] text-[#86868B] mt-0.5">
                        {formatDate(item.created_at, isEn)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] text-[#6E6E73]">
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
    <span className="block text-[13px] font-medium text-[#6E6E73]">{label}</span>
    <input
      type="text"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-black/[0.15] focus:border-[#111111] py-2.5 text-[15px] text-[#111111] placeholder:text-[#A1A1A6] outline-none transition-colors"
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
    <span className="block text-[13px] font-medium text-[#6E6E73]">{label}</span>
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-transparent border-b border-black/[0.15] focus:border-[#111111] py-2.5 text-[15px] text-[#111111] placeholder:text-[#A1A1A6] outline-none resize-none transition-colors"
    />
  </label>
);
