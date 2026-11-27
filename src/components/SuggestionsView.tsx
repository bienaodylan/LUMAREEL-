import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  CommunitySuggestion,
  loadSuggestions,
  saveSuggestions,
} from '../utils/communityStorage';
import { Mic2, Send, MapPin } from 'lucide-react';

export const SuggestionsView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { currentUser, showToast, language } = useApp();
  const isEn = language === 'en';
  const memberName = currentUser?.name || (isEn ? 'Member' : 'Membre LUMARÉEL');
  const [suggestions, setSuggestions] = useState<CommunitySuggestion[]>(() =>
    loadSuggestions().filter((item) => item.type === 'artist_venue')
  );
  const [artistName, setArtistName] = useState('');
  const [cityOrVenue, setCityOrVenue] = useState('');
  const [description, setDescription] = useState('');

  const memberSuggestions = useMemo(
    () => suggestions.filter((item) => item.authorName === memberName),
    [suggestions, memberName]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const artist = artistName.trim();
    const location = cityOrVenue.trim();
    const note = description.trim();

    if (!artist) {
      showToast(isEn ? 'Enter an artist name.' : 'Indiquez le nom de l’artiste.', 'error');
      return;
    }

    const duplicate = suggestions.some(
      (item) =>
        (item.artistName || item.title.split(' — ')[0]).trim().toLowerCase() === artist.toLowerCase() &&
        (item.cityOrVenue || '').trim().toLowerCase() === (location || (isEn ? 'Not specified' : 'Non précisé')).toLowerCase()
    );
    if (duplicate) {
      showToast(isEn ? 'This artist suggestion already exists.' : 'Cette proposition existe déjà.', 'info');
      return;
    }

    const nextItem: CommunitySuggestion = {
      id: `artist_${Date.now()}`,
      type: 'artist_venue',
      artistName: artist,
      title: artist,
      cityOrVenue: location || (isEn ? 'Not specified' : 'Non précisé'),
      description: note,
      authorName: memberName,
      votes: 0,
      votedByKeys: [],
      createdAt: new Date().toISOString(),
    };

    const next = [nextItem, ...suggestions];
    setSuggestions(next);
    saveSuggestions(next);
    setArtistName('');
    setCityOrVenue('');
    setDescription('');
    showToast(
      isEn
        ? 'Your artist suggestion has been saved.'
        : 'Votre proposition d’artiste a bien été enregistrée.',
      'success'
    );
  };

  return (
    <div className={`w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 ${embedded ? 'pt-0 pb-8' : 'min-h-screen pt-4 sm:pt-10 pb-20'} text-white font-agrandir-regular`}>
      {!embedded && (
        <header className="mb-8 border-b border-white/15 pb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">LUMARÉEL CLUB</p>
          <h1 className="mt-2 text-3xl font-agrandir-extrabold tracking-tight sm:text-5xl">TA VOIX</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
            {isEn
              ? 'Tell us which artists you would like to see perform at LUMARÉEL.'
              : 'Dites-nous quels artistes vous aimeriez voir se produire chez LUMARÉEL.'}
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <section className="border border-white/12 bg-[#0b0b0b] p-5 sm:p-7 lg:col-span-5">
          <div className="mb-6 flex items-center gap-3">
            <Mic2 className="h-5 w-5 text-white" />
            <div>
              <h3 className="text-base font-agrandir-extrabold">{isEn ? 'Suggest an artist' : 'Proposer un artiste'}</h3>
              <p className="mt-1 text-xs text-neutral-500">{isEn ? 'A direct request to our programming team.' : 'Une proposition directement destinée à notre équipe de programmation.'}</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-neutral-400">{isEn ? 'Artist name' : 'Nom de l’artiste'} *</span>
              <input
                type="text"
                required
                maxLength={100}
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder={isEn ? 'e.g. Burna Boy, Didi B, Himra' : 'Ex. : Burna Boy, Didi B, Himra'}
                className="min-h-12 w-full border border-white/15 bg-black px-4 text-sm text-white outline-none transition-colors focus:border-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-neutral-400">{isEn ? 'Preferred city or venue (optional)' : 'Ville ou salle souhaitée (facultatif)'}</span>
              <input
                type="text"
                maxLength={120}
                value={cityOrVenue}
                onChange={(e) => setCityOrVenue(e.target.value)}
                placeholder={isEn ? 'e.g. Abidjan · Palais de la Culture' : 'Ex. : Abidjan · Palais de la Culture'}
                className="min-h-12 w-full border border-white/15 bg-black px-4 text-sm text-white outline-none transition-colors focus:border-white"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs text-neutral-400">{isEn ? 'Additional note (optional)' : 'Précision (facultatif)'}</span>
              <textarea
                rows={3}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? 'Why would you like to see this artist?' : 'Pourquoi aimeriez-vous voir cet artiste ?'}
                className="w-full resize-none border border-white/15 bg-black p-3.5 text-sm text-white outline-none transition-colors focus:border-white"
              />
            </label>
            <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 bg-white px-4 text-xs font-agrandir-extrabold uppercase tracking-wider text-black transition-colors hover:bg-neutral-200">
              <Send className="h-4 w-4" />
              {isEn ? 'Send my suggestion' : 'Envoyer ma proposition'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-7">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-white/15 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{isEn ? 'Your activity' : 'Votre activité'}</p>
              <h3 className="mt-1 text-xl font-agrandir-extrabold">{isEn ? 'Your artist suggestions' : 'Vos propositions d’artistes'}</h3>
            </div>
            <span className="font-mono text-xs text-neutral-400">{memberSuggestions.length}</span>
          </div>

          {memberSuggestions.length ? (
            <div className="divide-y divide-white/10">
              {memberSuggestions.map((item) => (
                <article key={item.id} className="py-5">
                  <h4 className="text-base font-agrandir-semibold">{item.artistName || item.title}</h4>
                  {item.cityOrVenue && item.cityOrVenue !== 'Non précisé' && item.cityOrVenue !== 'Not specified' && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-neutral-400"><MapPin className="h-3.5 w-3.5" />{item.cityOrVenue}</p>
                  )}
                  {item.description && <p className="mt-2 text-sm leading-6 text-neutral-400">{item.description}</p>}
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-neutral-600">{new Date(item.createdAt).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR')}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-white/15 px-5 py-12 text-center">
              <Mic2 className="mx-auto h-6 w-6 text-neutral-500" />
              <p className="mt-4 text-sm font-agrandir-semibold">{isEn ? 'No suggestions yet' : 'Aucune proposition pour le moment'}</p>
              <p className="mt-2 text-xs text-neutral-500">{isEn ? 'Your requests will appear here after submission.' : 'Vos propositions apparaîtront ici après leur envoi.'}</p>
            </div>
          )}
          <p className="mt-5 text-[10px] leading-5 text-neutral-600">
            {isEn ? 'Suggestions are currently saved on this device.' : 'Les propositions sont actuellement enregistrées sur cet appareil.'}
          </p>
        </section>
      </div>
    </div>
  );
};
