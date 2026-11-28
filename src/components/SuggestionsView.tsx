import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpRight, CheckCircle2, Lightbulb, MapPin, Mic2, Send } from 'lucide-react';

type SuggestionType = 'artist' | 'venue' | 'event';
type Suggestion = { id: string; suggestion_type: SuggestionType; title: string; description: string; artist_type: string | null; venue_type: string | null; city: string | null; profile_url: string | null; reference_url: string | null; concept: string | null; suggested_venue: string | null; suggested_artists: string | null; status: string; admin_response: string | null; created_at: string };
const statusLabel: Record<string,string> = { received: 'Reçue', reviewing: 'En étude', selected: 'Retenue', preparing: 'En préparation', realized: 'Réalisée', declined: 'Non retenue' };

export const SuggestionsView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<SuggestionType>('artist');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [artistType, setArtistType] = useState('DJ');
  const [profileUrl, setProfileUrl] = useState('');
  const [venueType, setVenueType] = useState('rooftop');
  const [city, setCity] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [concept, setConcept] = useState('');
  const [suggestedVenue, setSuggestedVenue] = useState('');
  const [suggestedArtists, setSuggestedArtists] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { setItems([]); return; }
      const { data, error: queryError } = await supabase.from('club_suggestions').select('*').eq('user_id', auth.user.id).order('created_at',{ascending:false});
      if (queryError) throw queryError;
      setItems(data || []);
    } catch (err: any) { setError(err?.message || (isEn ? 'Unable to load your suggestions.' : 'Impossible de charger vos propositions.')); }
    finally { setLoading(false); }
  }, [isEn]);

  useEffect(() => { void load(); }, [load, currentUser?.id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    if (!cleanTitle || cleanTitle.length > 140 || cleanDescription.length > 3000) {
      showToast(isEn ? 'Check the title and description.' : 'Vérifiez le titre et la description.', 'error'); return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setIsAuthModalOpen(true); return; }
    setSending(true);
    const payload = {
      user_id: auth.user.id,
      suggestion_type: kind,
      title: cleanTitle,
      description: cleanDescription,
      artist_type: kind === 'artist' ? artistType : null,
      profile_url: kind === 'artist' ? (profileUrl.trim() || null) : null,
      venue_type: kind === 'venue' ? venueType : null,
      city: kind === 'venue' ? (city.trim() || null) : null,
      reference_url: kind === 'venue' ? (referenceUrl.trim() || null) : (kind === 'event' ? (referenceUrl.trim() || null) : null),
      concept: kind === 'event' ? (concept.trim() || cleanDescription) : null,
      suggested_venue: kind === 'event' ? (suggestedVenue.trim() || null) : null,
      suggested_artists: kind === 'event' ? (suggestedArtists.trim() || null) : null,
    };
    const { error: insertError } = await supabase.from('club_suggestions').insert(payload);
    setSending(false);
    if (insertError) { showToast(isEn ? 'Your suggestion could not be sent. Please try again.' : 'Votre proposition n’a pas pu être envoyée. Réessayez.', 'error'); return; }
    setTitle(''); setDescription(''); setProfileUrl(''); setCity(''); setReferenceUrl(''); setConcept(''); setSuggestedVenue(''); setSuggestedArtists('');
    showToast(isEn ? 'Your suggestion has been sent to LUMARÉEL.' : 'Votre proposition a bien été transmise à LUMARÉEL.', 'success');
    await load();
  };

  const inputClass = 'w-full min-h-12 bg-transparent border-b border-white/20 px-0 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-white';
  const labelClass = 'mb-2 block text-[10px] uppercase tracking-[0.16em] text-neutral-500';

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-5 sm:pt-10 pb-16 text-white">
      <header className="mb-9 sm:mb-12">
        <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">LUMARÉEL CLUB · PARTICIPATION</p>
        <h1 className="mt-3 max-w-4xl text-[clamp(2.3rem,8vw,5.2rem)] font-agrandir-extrabold leading-[0.94] tracking-tight">{isEn ? 'What if the next event came from you?' : 'Et si le prochain événement venait de vous ?'}</h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">{isEn ? 'Artists, places, concepts and ideas. Tell us what you would like to experience with LUMARÉEL.' : 'Artistes, lieux, concepts et idées. Proposez-nous ce que vous aimeriez voir chez LUMARÉEL.'}</p>
      </header>

      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
        <section className="lg:col-span-6">
          <div className="mb-7 grid grid-cols-3 border-b border-white/15">
            {([{id:'artist',label:isEn?'Artist':'Artiste',icon:Mic2},{id:'venue',label:isEn?'Place':'Lieu',icon:MapPin},{id:'event',label:isEn?'Idea':'Idée',icon:Lightbulb}] as const).map((option) => { const Icon=option.icon; return <button key={option.id} onClick={() => { setKind(option.id); setTitle(''); setDescription(''); }} className={`min-h-14 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs ${kind===option.id?'text-white border-b-2 border-white':'text-neutral-500'}`}><Icon size={16}/>{option.label}</button>; })}
          </div>
          <form onSubmit={submit} className="space-y-6">
            <div><label className={labelClass}>{kind==='artist'?(isEn?'Artist name':'Nom de l’artiste'):kind==='venue'?(isEn?'Place name':'Nom du lieu'):(isEn?'Idea title':'Titre de votre idée')} *</label><input required maxLength={140} value={title} onChange={(e)=>setTitle(e.target.value)} className={inputClass} placeholder={kind==='artist'?'Ex. : Didi B, Himra…':kind==='venue'?'Ex. : un rooftop à Abidjan':'Ex. : une soirée au lever du soleil'}/></div>
            {kind==='artist' && <><div><label className={labelClass}>{isEn?'Artist type':'Type d’artiste'}</label><select value={artistType} onChange={(e)=>setArtistType(e.target.value)} className={inputClass+' bg-black'}>{['DJ','Chanteur','Groupe','Artiste','Performer'].map((v)=><option key={v}>{v}</option>)}</select></div><div><label className={labelClass}>{isEn?'Profile or content link (optional)':'Lien vers son profil ou un contenu (facultatif)'}</label><input type="url" value={profileUrl} onChange={(e)=>setProfileUrl(e.target.value)} className={inputClass} placeholder="https://…"/></div><div><label className={labelClass}>{isEn?'Why this artist?':'Pourquoi cet artiste ?'}</label><textarea rows={4} maxLength={3000} value={description} onChange={(e)=>setDescription(e.target.value)} className={inputClass+' resize-y'} placeholder={isEn?'Tell us what makes this artist special…':'Expliquez-nous ce qui rend cet artiste intéressant…'}/></div></>}
            {kind==='venue' && <><div><label className={labelClass}>{isEn?'Place type':'Type de lieu'}</label><select value={venueType} onChange={(e)=>setVenueType(e.target.value)} className={inputClass+' bg-black'}>{['rooftop','club','salle','villa','lieu atypique','autre'].map((v)=><option key={v} value={v}>{v}</option>)}</select></div><div><label className={labelClass}>{isEn?'City / location':'Ville ou localisation'}</label><input value={city} onChange={(e)=>setCity(e.target.value)} className={inputClass} placeholder="Abidjan…"/></div><div><label className={labelClass}>{isEn?'Link (optional)':'Lien (facultatif)'}</label><input type="url" value={referenceUrl} onChange={(e)=>setReferenceUrl(e.target.value)} className={inputClass} placeholder="https://…"/></div><div><label className={labelClass}>{isEn?'Why this place?':'Pourquoi ce lieu ?'}</label><textarea rows={4} maxLength={3000} value={description} onChange={(e)=>setDescription(e.target.value)} className={inputClass+' resize-y'}/></div></>}
            {kind==='event' && <><div><label className={labelClass}>{isEn?'Concept':'Concept'}</label><textarea rows={5} maxLength={3000} value={concept} onChange={(e)=>setConcept(e.target.value)} className={inputClass+' resize-y'} placeholder={isEn?'Describe the experience you imagine…':'Décrivez librement l’expérience que vous imaginez…'}/></div><div><label className={labelClass}>{isEn?'Possible location (optional)':'Lieu envisagé (facultatif)'}</label><input value={suggestedVenue} onChange={(e)=>setSuggestedVenue(e.target.value)} className={inputClass}/></div><div><label className={labelClass}>{isEn?'Artists (optional)':'Artistes (facultatif)'}</label><input value={suggestedArtists} onChange={(e)=>setSuggestedArtists(e.target.value)} className={inputClass}/></div><div><label className={labelClass}>{isEn?'Reference link (optional)':'Lien ou référence (facultatif)'}</label><input type="url" value={referenceUrl} onChange={(e)=>setReferenceUrl(e.target.value)} className={inputClass}/></div></>}
            <button disabled={sending || !title.trim()} className="w-full min-h-12 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-40"><Send size={15}/>{sending?(isEn?'Sending…':'Envoi…'):(isEn?'Send my suggestion':'Envoyer ma proposition')}</button>
          </form>
        </section>

        <section className="lg:col-span-6 lg:border-l lg:border-white/10 lg:pl-10">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{isEn?'YOUR PARTICIPATION':'VOTRE PARTICIPATION'}</p><h2 className="mt-2 text-2xl font-agrandir-extrabold">{isEn?'My suggestions':'Mes propositions'}</h2></div><span className="text-xs text-neutral-500">{items.length}</span></div>
          {!currentUser && <div className="mb-5 border border-white/15 p-4"><p className="text-sm text-neutral-300">{isEn?'Sign in to send and track your suggestions.':'Connectez-vous pour envoyer et suivre vos propositions.'}</p><button onClick={()=>setIsAuthModalOpen(true)} className="mt-3 text-xs underline">{isEn?'Sign in':'Se connecter'}</button></div>}
          {loading ? <p className="py-10 text-sm text-neutral-500">{isEn?'Loading…':'Chargement…'}</p> : error ? <p className="py-8 text-sm text-neutral-400">{error}</p> : items.length ? <div className="divide-y divide-white/10">{items.map((item)=><article key={item.id} className="py-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{item.suggestion_type==='artist'?'ARTISTE':item.suggestion_type==='venue'?'LIEU':'IDÉE'}</p><h3 className="mt-1 text-base font-agrandir-extrabold">{item.title}</h3></div><span className="shrink-0 text-[10px] text-neutral-400 border-b border-white/20 pb-1">{statusLabel[item.status] || item.status}</span></div><p className="mt-2 text-xs text-neutral-400 whitespace-pre-wrap">{item.description || item.concept}</p><p className="mt-3 text-[10px] text-neutral-600">{new Date(item.created_at).toLocaleDateString(isEn?'en-GB':'fr-FR')}</p>{item.admin_response && <div className="mt-4 border-l border-white/30 pl-3"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn?'LUMARÉEL reply':'Retour de LUMARÉEL'}</p><p className="mt-1 text-sm text-neutral-300">{item.admin_response}</p></div>}</article>)}</div> : <div className="border-y border-white/10 py-12 text-center"><CheckCircle2 size={22} className="mx-auto text-neutral-600"/><p className="mt-4 text-sm text-neutral-400">{isEn?'No suggestions yet.':'Aucune proposition pour le moment.'}</p><p className="mt-2 text-xs text-neutral-600">{isEn?'Your submissions and their progress will appear here.':'Vos envois et leur évolution apparaîtront ici.'}</p></div>}
        </section>
      </div>
    </div>
  );
};
