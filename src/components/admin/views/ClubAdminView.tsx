import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { Archive, Check, Film, ImagePlus, Layers3, MessageSquare, Plus, Radio, Send, Upload, Video } from 'lucide-react';

type AdminTab = 'media' | 'albums' | 'offers' | 'suggestions';
type EventOption = { id: string; title: string; artist: string; date: string };
type Collection = { id: string; title: string; slug: string; description: string };
type Suggestion = { id: string; suggestion_type: string; title: string; description: string; status: string; admin_response: string | null; created_at: string };
type Album = { id: string; title: string; event_id: string; status: string };
type Media = { id: string; title: string; category: string; status: string; access_tier: string; media_type: string };
type Offer = { id: string; title: string; offer_type: string; status: string; ends_at: string | null };

const categories = [
  ['ballon','Ballon'], ['session_studio','Sessions Studio'], ['backstage','Backstage'],
  ['interviews','Interviews'], ['stories','Stories'], ['originals','LUMARÉEL Originals'], ['discover','À découvrir'],
];
const statuses = [['received','Reçue'],['reviewing','En étude'],['selected','Retenue'],['preparing','En préparation'],['realized','Réalisée'],['declined','Non retenue']];

export const ClubAdminView: React.FC = () => {
  const [tab,setTab] = useState<AdminTab>('media');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [message,setMessage] = useState('');
  const [events,setEvents] = useState<EventOption[]>([]);
  const [collections,setCollections] = useState<Collection[]>([]);
  const [media,setMedia] = useState<Media[]>([]);
  const [albums,setAlbums] = useState<Album[]>([]);
  const [offers,setOffers] = useState<Offer[]>([]);
  const [suggestions,setSuggestions] = useState<Suggestion[]>([]);

  const [mediaTitle,setMediaTitle] = useState('');
  const [mediaDescription,setMediaDescription] = useState('');
  const [mediaCategory,setMediaCategory] = useState('backstage');
  const [mediaTier,setMediaTier] = useState('free');
  const [mediaStatus,setMediaStatus] = useState('draft');
  const [mediaCollection,setMediaCollection] = useState('');
  const [mediaArtist,setMediaArtist] = useState('');
  const [mediaFile,setMediaFile] = useState<File|null>(null);
  const [coverFile,setCoverFile] = useState<File|null>(null);

  const [collectionTitle,setCollectionTitle] = useState('');
  const [collectionDescription,setCollectionDescription] = useState('');
  const [albumEvent,setAlbumEvent] = useState('');
  const [albumTitle,setAlbumTitle] = useState('');
  const [albumDescription,setAlbumDescription] = useState('');
  const [albumRecap,setAlbumRecap] = useState('');
  const [albumCover,setAlbumCover] = useState<File|null>(null);
  const [photoAlbum,setPhotoAlbum] = useState('');
  const [photoFiles,setPhotoFiles] = useState<File[]>([]);

  const [offerType,setOfferType] = useState<'flash'|'surprise'>('flash');
  const [offerTitle,setOfferTitle] = useState('');
  const [offerDescription,setOfferDescription] = useState('');
  const [offerBenefit,setOfferBenefit] = useState('');
  const [offerEnd,setOfferEnd] = useState('');
  const [offerStatus,setOfferStatus] = useState('draft');
  const [offerCover,setOfferCover] = useState<File|null>(null);

  const load = useCallback(async () => {
    setLoading(true); setMessage('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Connectez-vous avec un compte administrateur.');
      const results = await Promise.all([
        supabase.from('events').select('id,title,artist,date').order('date',{ascending:false}),
        supabase.from('club_backstage_collections').select('id,title,slug,description').order('sort_order'),
        supabase.from('club_backstage_media').select('id,title,category,status,access_tier,media_type').order('created_at',{ascending:false}),
        supabase.from('club_moment_albums').select('id,title,event_id,status').order('created_at',{ascending:false}),
        supabase.from('club_offers').select('id,title,offer_type,status,ends_at').order('created_at',{ascending:false}),
        supabase.from('club_suggestions').select('id,suggestion_type,title,description,status,admin_response,created_at').order('created_at',{ascending:false}),
      ]);
      for (const result of results) if (result.error) throw result.error;
      setEvents(results[0].data || []);
      setCollections(results[1].data || []);
      setMedia(results[2].data || []);
      setAlbums(results[3].data || []);
      setOffers(results[4].data || []);
      setSuggestions(results[5].data || []);
    } catch (err:any) { setMessage(err?.message || 'Impossible de charger les données Club.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();},[load]);

  const uploadFile = async (file: File, folder: string) => {
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g,'-').slice(-90);
    const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from('club-media').upload(path,file,{upsert:false,contentType:file.type});
    if (error) throw error;
    return path;
  };

  const createCollection = async (e:React.FormEvent) => {
    e.preventDefault(); if(!collectionTitle.trim()) return;
    setSaving(true); setMessage('');
    const slug = collectionTitle.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    const { error } = await supabase.from('club_backstage_collections').insert({title:collectionTitle.trim(),slug,description:collectionDescription.trim(),status:'published',sort_order:collections.length});
    setSaving(false);
    if(error){setMessage(error.message);return;}
    setCollectionTitle('');setCollectionDescription('');await load();
  };

  const createMedia = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!mediaTitle.trim() || !mediaFile){setMessage('Ajoutez un titre et un fichier média.');return;}
    if(mediaFile.type.startsWith('video/') && !coverFile){setMessage('Ajoutez une couverture pour la vidéo.');return;}
    setSaving(true);setMessage('');
    try{
      const mediaPath=await uploadFile(mediaFile,'backstage');
      const thumbPath=mediaFile.type.startsWith('image/')?mediaPath:(coverFile?await uploadFile(coverFile,'backstage-covers'):null);
      const {error}=await supabase.from('club_backstage_media').insert({
        title:mediaTitle.trim(),description:mediaDescription.trim(),category:mediaCategory,
        media_type:mediaFile.type.startsWith('video/')?'video':'image',storage_path:mediaPath,
        thumbnail_path:thumbPath,collection_id:mediaCollection||null,artist_name:mediaArtist.trim()||null,
        access_tier:mediaTier,status:mediaStatus,published_at:mediaStatus==='published'?new Date().toISOString():null,
      });
      if(error) throw error;
      setMediaTitle('');setMediaDescription('');setMediaArtist('');setMediaFile(null);setCoverFile(null);
      setMessage('Contenu enregistré.');
      await load();
    }catch(err:any){setMessage(err?.message||'Échec de publication.');}
    finally{setSaving(false);}
  };

  const createAlbum = async (e:React.FormEvent) => {
    e.preventDefault();if(!albumEvent||!albumTitle.trim()){setMessage('Choisissez un événement et un titre.');return;}
    setSaving(true);setMessage('');
    try{
      const coverPath=albumCover?await uploadFile(albumCover,'moments-covers'):null;
      const {error}=await supabase.from('club_moment_albums').insert({
        event_id:albumEvent,title:albumTitle.trim(),description:albumDescription.trim(),
        recap_url:albumRecap.trim()||null,cover_path:coverPath,status:'published',
      });
      if(error)throw error;
      setAlbumTitle('');setAlbumDescription('');setAlbumRecap('');setAlbumCover(null);await load();
    }catch(err:any){setMessage(err?.message||'Impossible de créer cet album.');}
    finally{setSaving(false);}
  };

  const addPhotos = async (e:React.FormEvent) => {
    e.preventDefault();if(!photoAlbum||!photoFiles.length){setMessage('Choisissez un album et au moins une photo.');return;}
    setSaving(true);setMessage('');
    try{
      for(const file of photoFiles){
        if(!file.type.startsWith('image/')) continue;
        const path=await uploadFile(file,'moments');
        const {error}=await supabase.from('club_moment_media').insert({album_id:photoAlbum,storage_path:path,thumbnail_path:path,caption:file.name,media_type:'image',downloadable:true});
        if(error)throw error;
      }
      setPhotoFiles([]);await load();setMessage('Photos ajoutées à l’album.');
    }catch(err:any){setMessage(err?.message||'Échec du téléversement des photos.');}
    finally{setSaving(false);}
  };

  const createOffer = async (e:React.FormEvent) => {
    e.preventDefault();if(!offerTitle.trim()){setMessage('Saisissez un titre pour cette offre.');return;}
    setSaving(true);setMessage('');
    try{
      const coverPath=offerCover?await uploadFile(offerCover,'offers'):null;
      const {error}=await supabase.from('club_offers').insert({
        offer_type:offerType,title:offerTitle.trim(),description:offerDescription.trim(),
        benefit_label:offerBenefit.trim()||null,cover_path:coverPath,
        ends_at:offerEnd?new Date(offerEnd).toISOString():null,status:offerStatus,
      });
      if(error)throw error;
      setOfferTitle('');setOfferDescription('');setOfferBenefit('');setOfferEnd('');setOfferCover(null);await load();
    }catch(err:any){setMessage(err?.message||'Impossible de créer cette offre.');}
    finally{setSaving(false);}
  };

  const updateSuggestion = async (item:Suggestion,status:string,response:string) => {
    const {error}=await supabase.from('club_suggestions').update({status,admin_response:response,updated_at:new Date().toISOString()}).eq('id',item.id);
    if(error){setMessage(error.message);return;} await load();
  };

  const tabs: {id:AdminTab;label:string;icon:React.ElementType}[]=[
    {id:'media',label:'Backstage',icon:Film},{id:'albums',label:'Mes Moments',icon:ImagePlus},
    {id:'offers',label:'Gift & Offres',icon:Layers3},{id:'suggestions',label:'Ta Voix',icon:MessageSquare},
  ];

  return <div className="space-y-7 text-white">
    <header><p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">LUMARÉEL CLUB · CMS</p><h1 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">Contenus & communauté</h1><p className="mt-2 text-sm text-neutral-500">Publication des contenus, albums, offres et suivi des propositions membres.</p></header>
    <nav className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3">{tabs.map(t=>{const Icon=t.icon;return <button key={t.id} onClick={()=>setTab(t.id)} className={`shrink-0 min-h-10 px-4 inline-flex items-center gap-2 text-xs ${tab===t.id?'bg-white text-black':'bg-white/[0.05] text-neutral-400'}`}><Icon size={15}/>{t.label}</button>;})}</nav>
    {message&&<p role="status" className="border border-white/15 px-4 py-3 text-xs text-neutral-300">{message}</p>}
    {loading?<p className="py-12 text-sm text-neutral-500">Chargement…</p>:<>
      {tab==='media'&&<div className="grid xl:grid-cols-2 gap-8">
        <form onSubmit={createMedia} className="space-y-4 border border-white/10 p-5">
          <h2 className="font-agrandir-extrabold">Publier un contenu Backstage</h2>
          <input value={mediaTitle} onChange={e=>setMediaTitle(e.target.value)} required placeholder="Titre du contenu" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/>
          <textarea value={mediaDescription} onChange={e=>setMediaDescription(e.target.value)} placeholder="Description" rows={3} className="w-full bg-black border border-white/15 p-3 text-sm"/>
          <div className="grid sm:grid-cols-2 gap-3"><select value={mediaCategory} onChange={e=>setMediaCategory(e.target.value)} className="min-h-11 bg-black border border-white/15 px-3 text-xs">{categories.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select value={mediaTier} onChange={e=>setMediaTier(e.target.value)} className="min-h-11 bg-black border border-white/15 px-3 text-xs">{[['free','Public'],['club','Membres Club'],['card','LUMARÉEL Card'],['tv_pass','TV Pass'],['vip','VIP']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
          <select value={mediaCollection} onChange={e=>setMediaCollection(e.target.value)} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="">Sans collection</option>{collections.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select>
          <input value={mediaArtist} onChange={e=>setMediaArtist(e.target.value)} placeholder="Artiste (facultatif)" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/>
          <label className="block text-xs text-neutral-400">Fichier image ou vidéo<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={e=>setMediaFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs"/></label>
          <label className="block text-xs text-neutral-400">Couverture vidéo (obligatoire pour une vidéo)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setCoverFile(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs"/></label>
          <select value={mediaStatus} onChange={e=>setMediaStatus(e.target.value)} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="draft">Brouillon</option><option value="published">Publier</option></select>
          <button disabled={saving} className="min-h-11 w-full bg-white text-black text-xs font-agrandir-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-50"><Upload size={15}/>{saving?'Enregistrement…':'Enregistrer le contenu'}</button>
        </form>
        <div className="space-y-6">
          <form onSubmit={createCollection} className="border border-white/10 p-5 space-y-3"><h2 className="font-agrandir-extrabold">Nouvelle collection</h2><input value={collectionTitle} onChange={e=>setCollectionTitle(e.target.value)} placeholder="Titre de collection" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><input value={collectionDescription} onChange={e=>setCollectionDescription(e.target.value)} placeholder="Description" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><button disabled={saving} className="min-h-10 px-4 bg-white text-black text-xs">Créer la collection</button></form>
          <div><h2 className="mb-3 font-agrandir-extrabold">Contenus enregistrés ({media.length})</h2>{media.length?media.map(m=><div key={m.id} className="py-3 border-b border-white/10 flex justify-between gap-3 text-xs"><span>{m.title}<small className="block mt-1 text-neutral-500">{m.category} · {m.access_tier}</small></span><span className="text-neutral-400">{m.status}</span></div>):<p className="text-xs text-neutral-500">Aucun contenu publié ou enregistré.</p>}</div>
        </div>
      </div>}
      {tab==='albums'&&<div className="grid xl:grid-cols-2 gap-8">
        <form onSubmit={createAlbum} className="space-y-4 border border-white/10 p-5"><h2 className="font-agrandir-extrabold">Créer un album événement</h2><select required value={albumEvent} onChange={e=>setAlbumEvent(e.target.value)} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="">Choisir un événement</option>{events.map(ev=><option key={ev.id} value={ev.id}>{ev.artist} — {ev.title} ({ev.date})</option>)}</select><input required value={albumTitle} onChange={e=>setAlbumTitle(e.target.value)} placeholder="Titre de l’album" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><textarea value={albumDescription} onChange={e=>setAlbumDescription(e.target.value)} placeholder="Description" rows={3} className="w-full bg-black border border-white/15 p-3 text-sm"/><input type="url" value={albumRecap} onChange={e=>setAlbumRecap(e.target.value)} placeholder="URL du récap vidéo (facultatif)" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><label className="text-xs text-neutral-400">Couverture de l’album<input type="file" accept="image/*" onChange={e=>setAlbumCover(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs"/></label><button disabled={saving} className="min-h-11 w-full bg-white text-black text-xs font-agrandir-extrabold">Créer l’album</button></form>
        <div className="space-y-5"><form onSubmit={addPhotos} className="border border-white/10 p-5 space-y-3"><h2 className="font-agrandir-extrabold">Ajouter des photos officielles</h2><select value={photoAlbum} onChange={e=>setPhotoAlbum(e.target.value)} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="">Choisir un album</option>{albums.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}</select><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={e=>setPhotoFiles(Array.from(e.target.files||[]))} className="block w-full text-xs"/><button disabled={saving||!photoFiles.length} className="min-h-11 w-full bg-white text-black text-xs font-agrandir-extrabold disabled:opacity-40">Ajouter {photoFiles.length||''} photo(s)</button></form><div><h2 className="mb-3 font-agrandir-extrabold">Albums ({albums.length})</h2>{albums.map(a=><p key={a.id} className="py-3 border-b border-white/10 text-xs">{a.title}<span className="ml-2 text-neutral-500">{a.status}</span></p>)}</div></div>
      </div>}
      {tab==='offers'&&<div className="grid xl:grid-cols-2 gap-8">
        <form onSubmit={createOffer} className="space-y-4 border border-white/10 p-5"><h2 className="font-agrandir-extrabold">Créer une surprise ou vente flash</h2><select value={offerType} onChange={e=>setOfferType(e.target.value as 'flash'|'surprise')} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="flash">Vente flash</option><option value="surprise">Surprise membre</option></select><input required value={offerTitle} onChange={e=>setOfferTitle(e.target.value)} placeholder="Titre" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><textarea value={offerDescription} onChange={e=>setOfferDescription(e.target.value)} placeholder="Description" rows={3} className="w-full bg-black border border-white/15 p-3 text-sm"/><input value={offerBenefit} onChange={e=>setOfferBenefit(e.target.value)} placeholder="Avantage / prix / bénéfice" className="w-full min-h-11 bg-black border border-white/15 px-3 text-sm"/><label className="text-xs text-neutral-400">Date de fin<input type="datetime-local" value={offerEnd} onChange={e=>setOfferEnd(e.target.value)} className="mt-2 block w-full min-h-11 bg-black border border-white/15 px-3 text-xs"/></label><label className="text-xs text-neutral-400">Image (facultative)<input type="file" accept="image/*" onChange={e=>setOfferCover(e.target.files?.[0]||null)} className="mt-2 block w-full text-xs"/></label><select value={offerStatus} onChange={e=>setOfferStatus(e.target.value)} className="w-full min-h-11 bg-black border border-white/15 px-3 text-xs"><option value="draft">Brouillon</option><option value="published">Publier</option></select><button disabled={saving} className="min-h-11 w-full bg-white text-black text-xs font-agrandir-extrabold">Enregistrer l’offre</button></form>
        <div><h2 className="mb-3 font-agrandir-extrabold">Offres ({offers.length})</h2>{offers.map(o=><div key={o.id} className="py-3 border-b border-white/10 flex justify-between gap-3 text-xs"><span>{o.title}<small className="block mt-1 text-neutral-500">{o.offer_type}</small></span><span className="text-neutral-400">{o.status}</span></div>)}</div>
      </div>}
      {tab==='suggestions'&&<div><h2 className="mb-4 font-agrandir-extrabold">Propositions des membres ({suggestions.length})</h2>{suggestions.length? suggestions.map(item=><SuggestionAdminRow key={item.id} item={item} onSave={updateSuggestion}/>):<p className="py-10 text-sm text-neutral-500">Aucune proposition reçue.</p>}</div>}
    </>}
  </div>;
};

const SuggestionAdminRow: React.FC<{item:Suggestion;onSave:(item:Suggestion,status:string,response:string)=>Promise<void>}> = ({item,onSave}) => {
  const [status,setStatus]=useState(item.status);
  const [response,setResponse]=useState(item.admin_response||'');
  return <article className="grid lg:grid-cols-12 gap-4 border-t border-white/10 py-5">
    <div className="lg:col-span-5"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{item.suggestion_type}</p><h3 className="mt-1 font-agrandir-extrabold">{item.title}</h3><p className="mt-2 text-xs leading-5 text-neutral-400 whitespace-pre-wrap">{item.description}</p><p className="mt-2 text-[10px] text-neutral-600">{new Date(item.created_at).toLocaleString('fr-FR')}</p></div>
    <div className="lg:col-span-7 space-y-3"><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full min-h-10 bg-black border border-white/15 px-3 text-xs">{statuses.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><textarea rows={2} value={response} onChange={e=>setResponse(e.target.value)} placeholder="Réponse de LUMARÉEL (facultatif)" className="w-full bg-black border border-white/15 p-3 text-xs"/><button onClick={()=>void onSave(item,status,response)} className="min-h-10 px-4 bg-white text-black text-xs inline-flex items-center gap-2"><Check size={14}/>Enregistrer le suivi</button></div>
  </article>;
};
