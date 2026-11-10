import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Radio, Package, Truck, ShieldCheck, RefreshCw, Search, Upload, AlertCircle, Link2, Ban } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';

type Tab = 'dashboard'|'orders'|'inventory'|'nfc'|'association'|'shipping'|'replacements'|'imports'|'logs';
type Credential = {id:string;card_id:string;chip_reference:string;chip_type:string;credential_status:string;enrolled_at:string|null;revoked_at:string|null};
const tabs:{id:Tab;label:string;icon:React.ElementType}[]=[
 {id:'dashboard',label:'Vue d’ensemble',icon:CreditCard},{id:'orders',label:'Commandes',icon:Package},
 {id:'inventory',label:'Inventaire physique',icon:CreditCard},{id:'nfc',label:'Registre NFC',icon:Radio},
 {id:'association',label:'Association',icon:ShieldCheck},{id:'shipping',label:'Expédition',icon:Truck},
 {id:'replacements',label:'Remplacements & révocations',icon:RefreshCw},{id:'imports',label:'Imports fournisseur',icon:Upload},
 {id:'logs',label:'Journal d’activité',icon:Search},
];
const metricCards:{label:string;key:string}[]=[
 {label:'Commandes d’adhésion',key:'orders'},{label:'Cartes émises',key:'cards'},
 {label:'En production',key:'pending'},{label:'Expédiées',key:'shipped'},
 {label:'Livrées',key:'delivered'},{label:'Cartes actives',key:'active'},
 {label:'Suspendues',key:'suspended'},{label:'Révoquées',key:'revoked'},
 {label:'Expirées',key:'expired'},{label:'Credentials NFC',key:'credentials'},
 {label:'NFC actifs',key:'nfcActive'},{label:'NFC révoqués',key:'nfcRevoked'},
];
type OverviewStats=Record<string,number>;
type Activity={id:string;action_type:string;entity_type:string;entity_id:string;details:Record<string,unknown>;created_at:string};
type OrderRow={id:string;order_reference:string;amount:number;currency:string;payment_status:string;paid_at:string|null;created_at:string};
type PhysicalCard={id:string;card_number:string;cardholder_name:string;card_status:string;physical_card_status:string;physical_card_tracking_number:string|null;issued_at:string;expires_at:string};

export const AdminPhysicalCardsView:React.FC=()=>{
 const [tab,setTab]=useState<Tab>('dashboard');
 const [error,setError]=useState('');
 const [overview,setOverview]=useState<OverviewStats|null>(null);
 const [events,setEvents]=useState<Activity[]>([]);\n const [orderRows,setOrderRows]=useState<OrderRow[]>([]);\n const [physicalCards,setPhysicalCards]=useState<PhysicalCard[]>([]);
 const [loadingOverview,setLoadingOverview]=useState(false);
 const [credentials,setCredentials]=useState<Credential[]>([]);
 const [loadingNfc,setLoadingNfc]=useState(false);
 const [cardId,setCardId]=useState('');
 const [chipReference,setChipReference]=useState('');
 const [chipType,setChipType]=useState('MIFARE_DESFIRE_EV3');
 const [saving,setSaving]=useState(false);
 const [file,setFile]=useState<File|null>(null);
 const active=tabs.find(t=>t.id===tab)!;

 const api=useCallback(async(path:string,init:RequestInit={})=>{
   const {data:{session}}=await supabase.auth.getSession();
   if(!session?.access_token)throw new Error('Session Supabase administrateur requise.');
   const response=await fetch(path,{...init,headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`,...(init.headers||{})}});
   const data=await response.json();
   if(!response.ok||!data.success)throw new Error(data.error||'Requête refusée.');
   return data;
 },[]);
 const loadNfc=useCallback(async()=>{
   setLoadingNfc(true);
   try{const data=await api('/api/membership/nfc');setCredentials(data.credentials||[]);setError('');}
   catch(e:any){setError(e.message||'Registre NFC indisponible.');}
   finally{setLoadingNfc(false);}
 },[api]);
 const loadOverview=useCallback(async()=>{
   setLoadingOverview(true);
   try{const data=await api('/api/membership/admin/physical-cards');setOverview(data.stats||{});setEvents(data.events||[]);setOrderRows(data.orderRows||[]);setPhysicalCards(data.physicalCards||[]);setError('');}
   catch(e:any){setError(e.message||'Vue d’ensemble indisponible.');}
   finally{setLoadingOverview(false);}
 },[api]);
 useEffect(()=>{if(tab==='nfc')void loadNfc();if(tab==='dashboard'||tab==='logs')void loadOverview();},[tab,loadNfc,loadOverview]);

 const associate=async(e:React.FormEvent)=>{
   e.preventDefault();setSaving(true);
   try{await api('/api/membership/nfc/associate',{method:'POST',body:JSON.stringify({cardId,chipReference,chipType})});
     setCardId('');setChipReference('');await loadNfc();setTab('nfc');setError('Association NFC confirmée et auditée.');
   }catch(err:any){setError(err.message||'Association refusée.');}finally{setSaving(false);}
 };
 const revoke=async(id:string)=>{
   const reason=window.prompt('Motif obligatoire de révocation (min. 5 caractères) :');
   if(!reason)return;setSaving(true);
   try{await api(`/api/membership/nfc/${encodeURIComponent(id)}/revoke`,{method:'POST',body:JSON.stringify({reason})});await loadNfc();setError('Credential révoqué et opération auditée.');}
   catch(err:any){setError(err.message||'Révocation refusée.');}finally{setSaving(false);}
 };

 return <section className="space-y-6 text-white">
  <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[.25em] text-[#d4af37]">LUMARÉEL MANAGEMENT</p><h1 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">PHYSICAL CARD & NFC</h1><p className="mt-2 text-sm text-neutral-400">Gestion unifiée des cartes physiques, puces et livraisons.</p></div><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">API sécurisées · Supabase</span></header>
  <nav className="flex gap-2 overflow-x-auto pb-2">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab===t.id?'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]':'border-white/10 bg-white/[.03] text-neutral-400 hover:text-white'}`}><t.icon size={14}/>{t.label}</button>)}</nav>
  {tab==='dashboard'&&<div className="space-y-4"><div className="flex items-center justify-between"><p className="text-xs text-neutral-400">Indicateurs issus du registre Supabase sécurisé</p><button onClick={()=>void loadOverview()} disabled={loadingOverview} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingOverview?'animate-spin':''}/></button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{metricCards.map(m=><div key={m.key} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"><p className="text-xs text-neutral-400">{m.label}</p><p className="mt-3 text-2xl font-semibold text-white">{loadingOverview?'…':overview?.[m.key]??'—'}</p><p className="mt-1 text-[10px] text-neutral-600">Données réelles · accès super-admin</p></div>)}</div></div>}
  {tab==='orders'&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Commandes d’adhésion (100 dernières)</h2><button onClick={()=>void loadOverview()} disabled={loadingOverview} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingOverview?'animate-spin':''}/></button></div>{loadingOverview?<p className="text-sm text-neutral-400">Chargement…</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-neutral-500"><tr><th className="p-2">Référence</th><th className="p-2">Montant</th><th className="p-2">Paiement</th><th className="p-2">Date</th></tr></thead><tbody>{orderRows.map(o=><tr key={o.id} className="border-t border-white/10"><td className="p-2 font-mono">{o.order_reference}</td><td className="p-2 whitespace-nowrap">{Number(o.amount).toLocaleString('fr-FR')} {o.currency}</td><td className="p-2">{o.payment_status}</td><td className="p-2 whitespace-nowrap">{new Date(o.created_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div>}</div>}
  {tab==='inventory'&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Registre des cartes physiques</h2><button onClick={()=>void loadOverview()} disabled={loadingOverview} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingOverview?'animate-spin':''}/></button></div>{loadingOverview?<p className="text-sm text-neutral-400">Chargement…</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-neutral-500"><tr><th className="p-2">Numéro</th><th className="p-2">Titulaire</th><th className="p-2">Carte</th><th className="p-2">Physique</th><th className="p-2">Tracking</th><th className="p-2">Expiration</th></tr></thead><tbody>{physicalCards.map(card=><tr key={card.id} className="border-t border-white/10"><td className="p-2 font-mono">{card.card_number}</td><td className="p-2">{card.cardholder_name}</td><td className="p-2">{card.card_status}</td><td className="p-2">{card.physical_card_status}</td><td className="p-2 font-mono">{card.physical_card_tracking_number||'—'}</td><td className="p-2 whitespace-nowrap">{new Date(card.expires_at).toLocaleDateString('fr-FR')}</td></tr>)}</tbody></table></div>}</div>}
  {tab==='nfc'&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Registre NFC sécurisé</h2><button onClick={()=>void loadNfc()} disabled={loadingNfc} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingNfc?'animate-spin':''}/></button></div>{loadingNfc?<p className="text-sm text-neutral-400">Chargement…</p>:credentials.length===0?<p className="text-sm text-neutral-400">Aucun credential retourné (ou accès requis).</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-neutral-500"><tr><th className="p-2">Carte UUID</th><th className="p-2">Référence opaque</th><th className="p-2">Type</th><th className="p-2">État</th><th className="p-2">Action</th></tr></thead><tbody>{credentials.map(c=><tr key={c.id} className="border-t border-white/10"><td className="p-2 font-mono">{c.card_id}</td><td className="p-2 font-mono">{c.chip_reference}</td><td className="p-2">{c.chip_type}</td><td className="p-2">{c.credential_status}</td><td className="p-2">{c.credential_status!=='revoked'&&<button disabled={saving} onClick={()=>void revoke(c.id)} className="inline-flex items-center gap-1 text-red-300"><Ban size={13}/> Révoquer</button>}</td></tr>)}</tbody></table></div>}<p className="text-xs text-amber-300">Aucun UID brut ni secret DESFire n’est affiché ou stocké ici.</p></div>}
  {tab==='association'&&<form onSubmit={associate} className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Associer une puce à une LUMARÉEL CARD</h2><p className="text-sm text-neutral-400">Réservé au super-administrateur. La fonction serveur vérifie la carte active, l’adhésion payée, l’unicité et écrit l’audit dans la même transaction.</p><label className="block text-xs text-neutral-400">ID UUID de la carte<input required value={cardId} onChange={e=>setCardId(e.target.value.trim())} placeholder="UUID membership_cards" className="mt-2 w-full rounded-xl border border-white/15 bg-black px-4 py-3 font-mono text-sm text-white"/></label><label className="block text-xs text-neutral-400">Référence opaque / digest (pas l’UID NFC)<input required minLength={16} maxLength={160} pattern="[A-Za-z0-9_-]+" value={chipReference} onChange={e=>setChipReference(e.target.value)} placeholder="digest ou référence sécurisée" className="mt-2 w-full rounded-xl border border-white/15 bg-black px-4 py-3 font-mono text-sm text-white"/></label><label className="block text-xs text-neutral-400">Type de puce<select value={chipType} onChange={e=>setChipType(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-sm text-white"><option>MIFARE_DESFIRE_EV3</option><option>MIFARE_DESFIRE_EV2</option></select></label><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#d4af37] px-5 py-3 text-xs font-bold text-black disabled:opacity-50"><Link2 size={14}/>{saving?'Traitement…':'Associer & auditer'}</button></form>}
  {tab==='shipping'&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Suivi de production & livraison</h2><button onClick={()=>void loadOverview()} disabled={loadingOverview} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingOverview?'animate-spin':''}/></button></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-neutral-400">En production</p><p className="mt-2 text-xl">{overview?.pending??'—'}</p></div><div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-neutral-400">Expédiées</p><p className="mt-2 text-xl">{overview?.shipped??'—'}</p></div><div className="rounded-xl border border-white/10 p-4"><p className="text-xs text-neutral-400">Livrées</p><p className="mt-2 text-xl">{overview?.delivered??'—'}</p></div></div><p className="text-xs text-neutral-500">Les mises à jour de statut et tracking seront activées après validation des règles logistiques.</p></div>}
  {tab==='replacements'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Remplacements & révocations</h2><p className="mt-2 text-sm text-neutral-400">Historique conservé, motif obligatoire et désactivation de l’ancien credential.</p></div>}
  {tab==='imports'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 space-y-3"><h2 className="font-bold">Import fournisseur CSV / Excel</h2><input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]||null)} className="block text-sm text-neutral-400"/>{file&&<p className="text-xs text-neutral-300">{file.name} · {(file.size/1024).toFixed(1)} Ko — aperçu/validation serveur à connecter.</p>}<p className="text-xs text-amber-300">Sélectionner un fichier ne déclenche aucun import.</p></div>}
  {tab==='logs'&&<div className="space-y-4 rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><div className="flex items-center justify-between"><h2 className="font-bold">Journal d’activité récent</h2><button onClick={()=>void loadOverview()} disabled={loadingOverview} className="rounded-lg border border-white/15 p-2"><RefreshCw size={15} className={loadingOverview?'animate-spin':''}/></button></div>{loadingOverview?<p className="text-sm text-neutral-400">Chargement du journal…</p>:events.length===0?<p className="text-sm text-neutral-400">Aucun événement enregistré pour le moment.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-neutral-500"><tr><th className="p-2">Date</th><th className="p-2">Action</th><th className="p-2">Objet</th><th className="p-2">Référence</th></tr></thead><tbody>{events.map(ev=><tr key={ev.id} className="border-t border-white/10"><td className="p-2 whitespace-nowrap">{new Date(ev.created_at).toLocaleString('fr-FR')}</td><td className="p-2">{ev.action_type}</td><td className="p-2">{ev.entity_type}</td><td className="p-2 font-mono">{ev.entity_id}</td></tr>)}</tbody></table></div>}</div>}
  {error&&<div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4 text-xs text-amber-200"><AlertCircle size={16} className="shrink-0"/><p>{error}</p></div>}
 </section>;
};
