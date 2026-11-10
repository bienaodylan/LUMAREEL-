import React, { useState } from 'react';
import { CreditCard, Radio, Package, Truck, ShieldCheck, RefreshCw, Search, Upload, AlertCircle } from 'lucide-react';

/**
 * LUMARÉEL physical card operations workspace.
 * Data is intentionally sourced only from backend endpoints; no demo counters or fake records.
 * API wiring is added in the backend phase, so unavailable endpoints are surfaced transparently.
 */
type Tab = 'dashboard' | 'orders' | 'inventory' | 'nfc' | 'association' | 'shipping' | 'replacements' | 'imports' | 'logs';
const tabs: {id:Tab;label:string;icon:React.ElementType}[] = [
  {id:'dashboard',label:'Vue d’ensemble',icon:CreditCard},{id:'orders',label:'Commandes',icon:Package},
  {id:'inventory',label:'Inventaire physique',icon:CreditCard},{id:'nfc',label:'Registre NFC',icon:Radio},
  {id:'association',label:'Association',icon:ShieldCheck},{id:'shipping',label:'Expédition',icon:Truck},
  {id:'replacements',label:'Remplacements & révocations',icon:RefreshCw},{id:'imports',label:'Imports fournisseur',icon:Upload},
  {id:'logs',label:'Journal d’activité',icon:Search},
];
const metrics = ['Cartes commandées','Cartes reçues','Stock disponible','Cartes associées','En attente d’association','À expédier','Livrées','Actives','Suspendues','Révoquées / remplacées','Puces NFC enregistrées','NFC non associé'];

export const AdminPhysicalCardsView: React.FC = () => {
  const [tab,setTab] = useState<Tab>('dashboard');
  const [status,setStatus] = useState<'loading'|'unavailable'>('unavailable');
  const [error,setError] = useState('Les endpoints de gestion physique/NFC ne sont pas encore disponibles. Aucun chiffre fictif n’est affiché.');
  const [uid,setUid] = useState('');
  const [reader,setReader] = useState<'disconnected'|'waiting'>('disconnected');
  const [file,setFile] = useState<File|null>(null);
  const active=tabs.find(t=>t.id===tab)!;
  return <section className="space-y-6 text-white">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[10px] uppercase tracking-[.25em] text-[#d4af37]">LUMARÉEL MANAGEMENT</p><h1 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">PHYSICAL CARD & NFC</h1><p className="mt-2 text-sm text-neutral-400">Gestion unifiée des cartes physiques, puces et livraisons.</p></div>
      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">Phase d’intégration backend</span>
    </header>
    <nav className="flex gap-2 overflow-x-auto pb-2">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${tab===t.id?'border-[#d4af37] bg-[#d4af37]/10 text-[#d4af37]':'border-white/10 bg-white/[.03] text-neutral-400 hover:text-white'}`}><t.icon size={14}/>{t.label}</button>)}</nav>
    {tab==='dashboard'&&<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(m=><div key={m} className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"><p className="text-xs text-neutral-400">{m}</p><p className="mt-3 text-2xl text-neutral-500">—</p><p className="mt-1 text-[10px] text-neutral-600">Donnée backend non connectée</p></div>)}</div>}
    {tab==='orders'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Commandes LUMARÉEL CARD</h2><p className="mt-2 text-sm text-neutral-400">Les commandes payées seront chargées depuis le système de paiement vérifié. Aucun statut client ne sera simulé.</p></div>}
    {tab==='inventory'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Inventaire physique</h2><p className="mt-2 text-sm text-neutral-400">Réception de lots, numéros LMR, contrôle qualité et allocation.</p></div>}
    {tab==='nfc'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 space-y-4"><h2 className="font-bold">Registre NFC & lecteur</h2><div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs ${reader==='waiting'?'bg-emerald-500/10 text-emerald-300':'bg-neutral-700/30 text-neutral-400'}`}>{reader==='waiting'?'Lecteur en attente (bridge requis)':'Lecteur déconnecté'}</span><button onClick={()=>setReader(reader==='waiting'?'disconnected':'waiting')} className="rounded-lg border border-white/15 px-3 py-2 text-xs">État de démonstration UI</button></div><label className="block text-xs text-neutral-400">UID (saisie manuelle de secours)<input value={uid} onChange={e=>setUid(e.target.value.toUpperCase().replace(/[^0-9A-F: -]/g,''))} placeholder="04:A3:8F:21:9B:72:80" className="mt-2 w-full rounded-xl border border-white/15 bg-black px-4 py-3 font-mono text-sm text-white"/></label><p className="text-xs text-amber-300">La saisie n’enregistre ni n’associe de puce. PC/SC bridge et validation serveur requis.</p></div>}
    {tab==='association'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Association carte ↔ membre</h2><p className="mt-2 text-sm text-neutral-400">Workflow prévu : commande PAID vérifiée, carte disponible, UID unique, confirmation atomique et audit.</p></div>}
    {tab==='shipping'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Production & livraison</h2><p className="mt-2 text-sm text-neutral-400">Préparation, contrôle qualité, tracking et confirmation de livraison.</p></div>}
    {tab==='replacements'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Remplacements & révocations</h2><p className="mt-2 text-sm text-neutral-400">Historique conservé, motif obligatoire et désactivation de l’ancien credential.</p></div>}
    {tab==='imports'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6 space-y-3"><h2 className="font-bold">Import fournisseur CSV / Excel</h2><input type="file" accept=".csv,.xlsx,.xls" onChange={e=>setFile(e.target.files?.[0]||null)} className="block text-sm text-neutral-400"/>{file&&<p className="text-xs text-neutral-300">{file.name} · {(file.size/1024).toFixed(1)} Ko — aperçu/validation serveur à connecter.</p>}<p className="text-xs text-amber-300">Sélectionner un fichier ne déclenche aucun import.</p></div>}
    {tab==='logs'&&<div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-6"><h2 className="font-bold">Journal d’activité</h2><p className="mt-2 text-sm text-neutral-400">Les opérations sensibles seront journalisées côté serveur.</p></div>}
    <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[.05] p-4 text-xs text-amber-200"><AlertCircle size={16} className="shrink-0"/><p>{error} — Les boutons d’écriture sont volontairement absents tant que les fonctions sécurisées et migrations ne sont pas validées.</p></div>
  </section>;
};
