import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { AdminStats, Order, ConcertEvent, TransactionalEmail, ArchiveProduction } from '../types';
import { 
  Shield, Plus, Edit3, Eye, Search, DollarSign, Ticket, Calendar, Mail, 
  CheckCircle2, Share2, Copy, Image as ImageIcon, TrendingUp, Users, 
  MapPin, Clock, Phone, AlertCircle, Save, Film, Play, Upload, Trash2, 
  X, Check
} from 'lucide-react';
import { convertToYouTubeEmbed, readFileAsDataURL } from '../utils/mediaUtils';

export const AdminDashboard: React.FC = () => {
  const { events, refreshEvents, archives, saveArchive, deleteArchive, showToast, setCurrentPage } = useApp();

  const [activeTab, setActiveTab] = useState<'events' | 'archives' | 'orders' | 'overview' | 'emails'>('events');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<TransactionalEmail[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<Partial<ConcertEvent> | null>(null);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  // Archive CMS state
  const [editingArchive, setEditingArchive] = useState<Partial<ArchiveProduction> | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Local state for instant category edits per event
  const [localEvents, setLocalEvents] = useState<ConcertEvent[]>(events);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const fetchAdminData = async () => {
    try {
      const [resStats, resOrders, resEmails] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/orders'),
        fetch('/api/admin/emails'),
      ]);

      const [dataStats, dataOrders, dataEmails] = await Promise.all([
        resStats.json(),
        resOrders.json(),
        resEmails.json(),
      ]);

      if (dataStats.success) setStats(dataStats.stats);
      if (dataOrders.success) setOrders(dataOrders.orders);
      if (dataEmails.success) setEmails(dataEmails.emails);
    } catch (err) {
      console.error('Error fetching admin data', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [events]);

  // Copy concert link
  const handleShareConcert = (event: ConcertEvent) => {
    const url = `${window.location.origin}/#concert-${event.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedEventId(event.id);
      showToast(`Lien du concert "${event.title}" copié dans le presse-papier !`, 'success');
      setTimeout(() => setCopiedEventId(null), 3000);
    }).catch(() => {
      showToast('Impossible de copier le lien.', 'error');
    });
  };

  // Update category quotas & sold in memory/backend
  const handleUpdateCategory = async (eventId: string, catId: string, field: 'quota' | 'sold' | 'price', value: number) => {
    const updatedEvents = localEvents.map(evt => {
      if (evt.id !== eventId) return evt;
      const updatedCategories = evt.categories.map(cat => {
        if (cat.id !== catId) return cat;
        return {
          ...cat,
          [field]: Math.max(0, value),
        };
      });
      return {
        ...evt,
        categories: updatedCategories,
      };
    });

    setLocalEvents(updatedEvents);

    const targetEvent = updatedEvents.find(e => e.id === eventId);
    if (!targetEvent) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetEvent),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Catégorie mise à jour pour ${targetEvent.artist}.`, 'success');
        await refreshEvents();
      }
    } catch (err) {
      console.warn('Backend update failed, kept in local state', err);
    }
  };

  // Update visual poster or portrait for an event
  const handleUpdateVisual = async (eventId: string, field: 'officialPoster' | 'artistPortrait' | 'bannerImage', value: string) => {
    const updatedEvents = localEvents.map(evt => {
      if (evt.id !== eventId) return evt;
      return {
        ...evt,
        [field]: value,
      };
    });
    setLocalEvents(updatedEvents);

    const targetEvent = updatedEvents.find(e => e.id === eventId);
    if (!targetEvent) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetEvent),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Visuel mis à jour pour ${targetEvent.artist}.`, 'success');
        await refreshEvents();
      }
    } catch (err) {
      console.warn('Backend visual update failed', err);
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.title) {
      showToast('Le titre du concert est obligatoire.', 'error');
      return;
    }

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Concert enregistré avec succès.', 'success');
        setEditingEvent(null);
        await refreshEvents();
        await fetchAdminData();
      } else {
        showToast(data.error || 'Erreur lors de la sauvegarde.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur réseau', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // ARCHIVE CMS HANDLERS (Prompt Requirement 3)
  // ---------------------------------------------------------------------------

  // Handle native file upload for Cover Image
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingCover(true);
      const dataUrl = await readFileAsDataURL(file);
      setEditingArchive((prev) => ({
        ...prev,
        coverImage: dataUrl,
      }));
      showToast('Couverture chargée avec succès depuis l’appareil.', 'success');
    } catch (err) {
      showToast('Erreur lors de la lecture du fichier image.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Handle native multiple file upload for Photo Gallery
  const handleGalleryFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingGallery(true);
      const readPromises = Array.from(files).map((f) => readFileAsDataURL(f));
      const newPhotos = await Promise.all(readPromises);

      setEditingArchive((prev) => ({
        ...prev,
        photos: [...(prev?.photos || []), ...newPhotos],
      }));
      showToast(`${newPhotos.length} photo(s) ajoutée(s) à la galerie.`, 'success');
    } catch (err) {
      showToast('Erreur lors du chargement des photos de galerie.', 'error');
    } finally {
      setUploadingGallery(false);
    }
  };

  // Handle YouTube URL change with auto embed conversion
  const handleYouTubeUrlChange = (url: string) => {
    const embedUrl = convertToYouTubeEmbed(url);
    setEditingArchive((prev) => ({
      ...prev,
      youtubeUrl: url,
      youtubeEmbedUrl: embedUrl,
    }));
  };

  // Save Archive
  const handleSaveArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArchive?.title) {
      showToast('Le titre de l’archive est requis.', 'error');
      return;
    }
    if (!editingArchive?.coverImage) {
      showToast('La couverture de l’archive est obligatoire.', 'error');
      return;
    }

    try {
      await saveArchive({
        id: editingArchive.id,
        title: editingArchive.title,
        coverImage: editingArchive.coverImage,
        year: editingArchive.year || '2026',
        date: editingArchive.date || '2026',
        city: editingArchive.city || 'Abidjan',
        country: editingArchive.country || 'Côte d’Ivoire',
        venue: editingArchive.venue || 'Palais de la Culture',
        artists: editingArchive.artists || [editingArchive.title],
        description: editingArchive.description || '',
        youtubeUrl: editingArchive.youtubeUrl || '',
        youtubeEmbedUrl: editingArchive.youtubeEmbedUrl || (editingArchive.youtubeUrl ? convertToYouTubeEmbed(editingArchive.youtubeUrl) : ''),
        duration: editingArchive.duration || 'Live HD',
        photos: editingArchive.photos || [],
        isPublished: true,
        orderIndex: editingArchive.orderIndex || archives.length + 1,
      });

      showToast('Récap de concert (Archive) enregistré avec succès !', 'success');
      setEditingArchive(null);
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la sauvegarde de l’archive', 'error');
    }
  };

  // Delete Archive
  const handleDeleteArchive = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer cette archive ?')) {
      await deleteArchive(id);
      showToast('Archive supprimée.', 'info');
    }
  };

  // Real-time calculations across LUMARÉEL's concerts
  const totalRevenueCalculated = localEvents.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + (cat.sold * cat.price), 0);
  }, 0);

  const totalTicketsSoldCalculated = localEvents.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + cat.sold, 0);
  }, 0);

  const totalQuotaCalculated = localEvents.reduce((acc, evt) => {
    return acc + evt.categories.reduce((catAcc, cat) => catAcc + cat.quota, 0);
  }, 0);

  const globalFillRate = totalQuotaCalculated > 0 ? Math.round((totalTicketsSoldCalculated / totalQuotaCalculated) * 100) : 0;

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.reference.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.eventTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 pb-20 select-none">
      
      {/* Admin Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase mb-2">
            <span className="w-2 h-2 rounded-full bg-[#d4af37] animate-pulse" />
            <span>LUMARÉEL CO. — ESPACE PRODUCTEUR &amp; CMS CENTRAL</span>
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase flex items-center gap-3">
            <Shield className="w-8 h-8 text-white" />
            <span>CONSOLE D’ADMINISTRATION CENTRALE</span>
          </h1>
          <p className="text-xs text-[#888] font-agrandir-regular mt-2 max-w-2xl">
            Gestion interne exclusive : nos concerts en production, billetterie, quotas, et gestion des récaps vidéo (Archives avec upload natif et lecteur YouTube).
          </p>
        </div>

        {/* Navigation Tabs Pill (Rounded) */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#121212] border border-white/15 rounded-full shadow-2xl self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'events' ? 'bg-white text-black font-agrandir-extrabold shadow-lg' : 'text-[#888] hover:text-white'
            }`}
          >
            Nos Concerts ({localEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('archives')}
            className={`px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'archives' ? 'bg-white text-black font-agrandir-extrabold shadow-lg' : 'text-[#888] hover:text-white'
            }`}
          >
            Archives &amp; Récaps ({archives.length})
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-black font-agrandir-extrabold shadow-lg' : 'text-[#888] hover:text-white'
            }`}
          >
            Indicateurs Clés
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-black font-agrandir-extrabold shadow-lg' : 'text-[#888] hover:text-white'
            }`}
          >
            Commandes ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'emails' ? 'bg-white text-black font-agrandir-extrabold shadow-lg' : 'text-[#888] hover:text-white'
            }`}
          >
            Journal E-mails
          </button>
        </div>
      </div>

      {/* --- GLOBAL LIVE METRICS BANNER (ROUNDED CARDS) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        
        <div className="p-5 bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#888] font-agrandir-semibold uppercase tracking-wider">
            <span>Chiffre d’Affaires Total</span>
            <DollarSign className="w-4 h-4 text-[#d4af37]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-agrandir-extrabold text-white tracking-tight">
              {totalRevenueCalculated.toLocaleString()} <span className="text-sm font-agrandir-regular text-[#888]">FCFA</span>
            </div>
            <div className="text-[11px] text-[#aaa] mt-1 font-agrandir-regular">
              Sur les 4 concerts officiels LUMARÉEL
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#888] font-agrandir-semibold uppercase tracking-wider">
            <span>Billets Vendus</span>
            <Ticket className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-agrandir-extrabold text-white tracking-tight">
              {totalTicketsSoldCalculated.toLocaleString()} <span className="text-sm font-agrandir-regular text-[#888]">/ {totalQuotaCalculated.toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-[#aaa] mt-1 font-agrandir-regular">
              Reste {Math.max(0, totalQuotaCalculated - totalTicketsSoldCalculated).toLocaleString()} billets disponibles
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#888] font-agrandir-semibold uppercase tracking-wider">
            <span>Taux de Remplissage</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-agrandir-extrabold text-white tracking-tight">
              {globalFillRate}%
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-white h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, globalFillRate)}%` }} 
              />
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-[#141414] to-[#0a0a0a] border border-white/10 rounded-2xl shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-[#888] font-agrandir-semibold uppercase tracking-wider">
            <span>Diffusion &amp; Partage</span>
            <Share2 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <button
              onClick={() => {
                const homeUrl = window.location.origin;
                navigator.clipboard.writeText(homeUrl);
                showToast('Lien de la billetterie générale copié !', 'success');
              }}
              className="w-full py-2 px-3 rounded-xl bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Partager Billetterie</span>
            </button>
            <div className="text-[10px] text-[#777] text-center mt-2 font-agrandir-regular">
              Lien direct sécurisé pour les acheteurs
            </div>
          </div>
        </div>

      </div>

      {/* --- TAB 1: GESTION DES CONCERTS PRODUITS PAR LUMARÉEL --- */}
      {activeTab === 'events' && (
        <div className="space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-agrandir-extrabold text-white uppercase tracking-wide">
                Nos 4 Concerts Officiels en Production
              </h2>
              <p className="text-xs text-[#777] font-agrandir-regular">
                Gérez pour chaque concert les affiches officielles, portraits artistes, quotas et ventes par catégorie.
              </p>
            </div>
            <button
              onClick={() =>
                setEditingEvent({
                  title: '',
                  subtitle: '',
                  artist: '',
                  date: '2026-12-25',
                  time: '18:00',
                  venue: 'Palais de la Culture d’Abidjan',
                  city: 'Abidjan',
                  country: 'Côte d’Ivoire',
                  status: 'published',
                  isFeatured: true,
                  infoline: '+225 07 00 00 00 00',
                })
              }
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-widest hover:bg-[#eaeaea] transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Concert</span>
            </button>
          </div>

          {/* Modal / Formulaire d'édition générale du concert */}
          {editingEvent && (
            <div className="p-6 sm:p-8 bg-[#111111] border border-white/20 rounded-3xl font-agrandir-regular text-xs space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 text-base font-agrandir-extrabold text-white uppercase">
                <span>{editingEvent.id ? `MODIFIER ${editingEvent.artist || 'LE CONCERT'}` : 'CRÉER UN NOUVEAU CONCERT'}</span>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 text-xs cursor-pointer"
                >
                  Fermer [X]
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Titre du Concert</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                      placeholder="ex: WANTCHÉ EN CONCERT"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Nom de l’Artiste</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.artist || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, artist: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                      placeholder="ex: WANTCHÉ"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Date (YYYY-MM-DD)</label>
                    <input
                      type="date"
                      value={editingEvent.date || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Horaire / Showtimes</label>
                    <input
                      type="text"
                      value={editingEvent.time || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                      placeholder="ex: 16:00 ou À partir de 15H"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Infoline Officielle</label>
                    <input
                      type="text"
                      value={editingEvent.infoline || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, infoline: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                      placeholder="ex: +225 01 53 508 210"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Lieu / Salle</label>
                    <input
                      type="text"
                      value={editingEvent.venue || ''}
                      onChange={(e) => setEditingEvent({ ...editingEvent, venue: e.target.value })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                      placeholder="ex: Esplanade du Palais de la Culture"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Statut Billetterie</label>
                    <select
                      value={editingEvent.status || 'published'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value as any })}
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    >
                      <option value="published">Publié (Ouvert à la vente)</option>
                      <option value="sold_out">Complet (Sold out)</option>
                      <option value="draft">Brouillon interne</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
                    className="px-5 py-2.5 rounded-full border border-white/20 text-[#aaa] hover:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-full bg-white text-black font-agrandir-extrabold uppercase tracking-wider hover:bg-[#eaeaea] transition-all cursor-pointer shadow-xl"
                  >
                    Enregistrer les Modifications
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LISTE DES 4 CONCERTS AVEC CONTRÔLES COMPLETS */}
          <div className="space-y-8">
            {localEvents.map((evt, idx) => {
              const totalQuota = evt.categories.reduce((acc, c) => acc + c.quota, 0);
              const totalSold = evt.categories.reduce((acc, c) => acc + c.sold, 0);
              const remaining = Math.max(0, totalQuota - totalSold);
              const eventRevenue = evt.categories.reduce((acc, c) => acc + (c.sold * c.price), 0);
              const fillPercent = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
              const isCopied = copiedEventId === evt.id;

              return (
                <div
                  key={evt.id}
                  className="bg-[#0e0e0e] border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6"
                >
                  
                  {/* Top Bar: Title, Artist, Share Button, Edit Button */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-agrandir-extrabold text-white text-sm shrink-0">
                        0{idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-agrandir-extrabold text-xl sm:text-2xl text-white uppercase tracking-tight">
                            {evt.artist}
                          </h3>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/10 text-white font-agrandir-semibold border border-white/20 uppercase">
                            {evt.status === 'published' ? 'En vente active' : evt.status}
                          </span>
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] font-agrandir-semibold border border-[#d4af37]/30">
                            Production LUMARÉEL
                          </span>
                        </div>
                        <p className="text-xs text-[#888] font-agrandir-regular mt-1 flex items-center gap-3 flex-wrap">
                          <span className="flex items-center gap-1 text-white">
                            <Calendar className="w-3.5 h-3.5 text-[#888]" />
                            {evt.date} à {evt.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#888]" />
                            {evt.venue}
                          </span>
                          {evt.infoline && (
                            <span className="flex items-center gap-1 text-[#aaa]">
                              <Phone className="w-3.5 h-3.5 text-[#888]" />
                              Infoline: {evt.infoline}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions: Share link & Quick edit */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
                      <button
                        onClick={() => handleShareConcert(evt)}
                        className={`px-4 py-2 rounded-full border text-xs font-agrandir-semibold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                          isCopied 
                            ? 'bg-emerald-500 border-emerald-500 text-black font-agrandir-extrabold' 
                            : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{isCopied ? 'Lien copié !' : 'Partager le concert'}</span>
                      </button>

                      <button
                        onClick={() => setEditingEvent(evt)}
                        className="px-4 py-2 rounded-full bg-white text-black hover:bg-[#eaeaea] text-xs font-agrandir-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Modifier infos</span>
                      </button>
                    </div>
                  </div>

                  {/* Middle Section: Visual Posters Management + Sales Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Visual 1: Affiche Officielle (Poster) */}
                    <div className="lg:col-span-4 bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-agrandir-semibold text-white uppercase">
                        <span className="flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                          Affiche Officielle
                        </span>
                        <span className="text-[10px] text-[#777]">Visuel Billetterie</span>
                      </div>
                      
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-black border border-white/10 group">
                        <img
                          src={evt.officialPoster}
                          alt={`Affiche ${evt.artist}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">URL / Fichier de l'affiche</label>
                        <input
                          type="text"
                          value={evt.officialPoster}
                          onChange={(e) => handleUpdateVisual(evt.id, 'officialPoster', e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-[#ccc] font-mono focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    {/* Visual 2: Portrait Artiste (Carrousel) */}
                    <div className="lg:col-span-3 bg-[#141414] border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-xs font-agrandir-semibold text-white uppercase">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          Portrait Artiste
                        </span>
                        <span className="text-[10px] text-[#777]">Hero &amp; Carrousel</span>
                      </div>
                      
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-black border border-white/10 group">
                        <img
                          src={evt.artistPortrait}
                          alt={`Portrait ${evt.artist}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">URL / Fichier du portrait</label>
                        <input
                          type="text"
                          value={evt.artistPortrait}
                          onChange={(e) => handleUpdateVisual(evt.id, 'artistPortrait', e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] text-[#ccc] font-mono focus:outline-none focus:border-white"
                        />
                      </div>
                    </div>

                    {/* Right Block: Live Revenue & Overall Progress */}
                    <div className="lg:col-span-5 bg-[#141414] border border-white/10 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-agrandir-semibold text-[#888] uppercase tracking-wider">
                          Performance Ventes
                        </span>
                        <span className="text-xs font-agrandir-extrabold text-white">
                          {fillPercent}% vendu
                        </span>
                      </div>

                      <div>
                        <div className="text-2xl font-agrandir-extrabold text-white">
                          {eventRevenue.toLocaleString()} <span className="text-xs font-agrandir-regular text-[#888]">FCFA</span>
                        </div>
                        <div className="text-xs text-[#aaa] mt-1 font-agrandir-regular">
                          <strong className="text-white">{totalSold.toLocaleString()}</strong> billets vendus sur un quota de <strong className="text-white">{totalQuota.toLocaleString()}</strong> ({remaining} restants)
                        </div>
                        
                        <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
                          <div
                            className="bg-[#d4af37] h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, fillPercent)}%` }}
                          />
                        </div>
                      </div>

                      {/* Direct Ticket Link Pill */}
                      <div className="pt-2 border-t border-white/10">
                        <div className="text-[11px] text-[#777] mb-1 font-agrandir-regular">Lien direct de billetterie :</div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-[#aaa]">
                          <span className="truncate flex-1">
                            {window.location.origin}/#concert-{evt.slug}
                          </span>
                          <button
                            onClick={() => handleShareConcert(evt)}
                            className="p-1 rounded-md bg-white/10 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
                            title="Copier le lien"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Section: Category Quotas & Number of Tickets Sold Table */}
                  <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-agrandir-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-[#d4af37]" />
                        <span>Gestion des Catégories &amp; Billets Vendus (Temps Réel)</span>
                      </h4>
                      <span className="text-[11px] text-[#777] font-agrandir-regular">
                        Modifiez directement les quotas et ventes ci-dessous
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-agrandir-regular">
                        <thead>
                          <tr className="border-b border-white/10 text-[10px] text-[#777] uppercase tracking-wider">
                            <th className="py-2.5 px-3">Catégorie</th>
                            <th className="py-2.5 px-3">Prix Unitaire</th>
                            <th className="py-2.5 px-3">Quota Total</th>
                            <th className="py-2.5 px-3">Billets Vendus</th>
                            <th className="py-2.5 px-3">Restants</th>
                            <th className="py-2.5 px-3 text-right">Recette Catégorie</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {evt.categories.map((cat) => {
                            const catRemaining = Math.max(0, cat.quota - cat.sold);
                            const catTotalRevenue = cat.sold * cat.price;

                            return (
                              <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-3">
                                  <div className="font-agrandir-semibold text-white">{cat.name}</div>
                                  <div className="text-[10px] text-[#777] truncate max-w-[200px]">{cat.description}</div>
                                </td>
                                
                                {/* Unit Price */}
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      value={cat.price}
                                      onChange={(e) => handleUpdateCategory(evt.id, cat.id, 'price', parseInt(e.target.value) || 0)}
                                      className="w-24 bg-black border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-mono focus:border-white focus:outline-none"
                                    />
                                    <span className="text-[11px] text-[#888]">FCFA</span>
                                  </div>
                                </td>

                                {/* Quota Total */}
                                <td className="py-3 px-3">
                                  <input
                                    type="number"
                                    value={cat.quota}
                                    onChange={(e) => handleUpdateCategory(evt.id, cat.id, 'quota', parseInt(e.target.value) || 0)}
                                    className="w-24 bg-black border border-white/20 rounded-lg px-2 py-1 text-white text-xs font-mono focus:border-white focus:outline-none"
                                  />
                                </td>

                                {/* Billets Vendus (sold) */}
                                <td className="py-3 px-3">
                                  <input
                                    type="number"
                                    value={cat.sold}
                                    onChange={(e) => handleUpdateCategory(evt.id, cat.id, 'sold', parseInt(e.target.value) || 0)}
                                    className="w-24 bg-black border border-white/20 rounded-lg px-2 py-1 text-emerald-400 font-bold text-xs font-mono focus:border-emerald-400 focus:outline-none"
                                  />
                                </td>

                                {/* Restants */}
                                <td className="py-3 px-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold ${
                                    catRemaining === 0 ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
                                  }`}>
                                    {catRemaining} places
                                  </span>
                                </td>

                                {/* Recette */}
                                <td className="py-3 px-3 text-right font-agrandir-semibold text-white font-mono">
                                  {catTotalRevenue.toLocaleString()} FCFA
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* --- TAB 2: ARCHIVES & RÉCAPS VIDÉO (CMS CONFORMÉMENT AU PROMPT 3) --- */}
      {activeTab === 'archives' && (
        <div className="space-y-10">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-agrandir-extrabold text-white uppercase tracking-wide flex items-center gap-2">
                <Film className="w-5 h-5 text-[#d4af37]" />
                <span>Gestion des Récaps de Concerts (Archives)</span>
              </h2>
              <p className="text-xs text-[#777] font-agrandir-regular mt-1">
                Uploadez la couverture nativement depuis votre téléphone ou ordinateur, collez l'URL YouTube (conversion automatique en embed) et chargez des photos de galerie.
              </p>
            </div>
            
            <button
              onClick={() =>
                setEditingArchive({
                  title: '',
                  year: '2026',
                  date: '2026',
                  city: 'Abidjan',
                  country: 'Côte d’Ivoire',
                  venue: 'Palais de la Culture d’Abidjan',
                  artists: ['LUMARÉEL CO.'],
                  description: '',
                  youtubeUrl: '',
                  youtubeEmbedUrl: '',
                  coverImage: '',
                  photos: [],
                  duration: '15:00',
                  isPublished: true,
                })
              }
              className="px-5 py-2.5 rounded-full bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-widest hover:bg-[#eaeaea] transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-xl"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Récap (Archive)</span>
            </button>
          </div>

          {/* Formulaire de création / édition d'Archive */}
          {editingArchive && (
            <div className="p-6 sm:p-8 bg-[#111111] border border-white/20 rounded-3xl font-agrandir-regular text-xs space-y-6 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 text-base font-agrandir-extrabold text-white uppercase">
                <span className="flex items-center gap-2">
                  <Film className="w-5 h-5 text-[#d4af37]" />
                  <span>{editingArchive.id ? `MODIFIER : ${editingArchive.title || 'ARCHIVE'}` : 'CRÉER UN RÉCAP DE CONCERT (ARCHIVE)'}</span>
                </span>
                <button
                  onClick={() => setEditingArchive(null)}
                  className="px-3 py-1 rounded-full bg-white/10 text-white hover:bg-white/20 text-xs cursor-pointer"
                >
                  Fermer [X]
                </button>
              </div>

              <form onSubmit={handleSaveArchive} className="space-y-6">
                
                {/* 1. UPLOAD DE LA COUVERTURE (OBLIGATOIRE - CHAMP NATIF) */}
                <div className="p-5 rounded-2xl bg-[#161616] border border-white/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-agrandir-extrabold text-white uppercase">
                        1. Upload de la Couverture de l'archive (Obligatoire) *
                      </label>
                      <p className="text-[11px] text-[#888] font-agrandir-regular mt-0.5">
                        Chargez une image au format 16:9 depuis votre galerie mobile ou disque dur. Elle sert de miniature sur la page d'accueil et la page archives.
                      </p>
                    </div>
                    {editingArchive.coverImage && (
                      <span className="text-[10px] text-emerald-400 font-agrandir-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Couverture prête
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Native File Input Button */}
                    <div className="md:col-span-6 space-y-2">
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/25 hover:border-white rounded-2xl cursor-pointer bg-black/40 transition-colors group">
                        <Upload className="w-6 h-6 text-[#aaa] group-hover:text-white transition-colors mb-2" />
                        <span className="text-xs font-agrandir-semibold text-white uppercase tracking-wider">
                          {uploadingCover ? 'Chargement en cours...' : 'Sélectionner une photo depuis l’appareil'}
                        </span>
                        <span className="text-[10px] text-[#777] mt-1">PNG, JPG, WEBP — Ratio 16:9 recommandé</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileUpload}
                          className="hidden"
                        />
                      </label>

                      {/* URL Fallback / Text Input */}
                      <div className="pt-1">
                        <span className="text-[10px] text-[#777] uppercase block mb-1">Ou saisir un chemin / URL d'image :</span>
                        <input
                          type="text"
                          value={editingArchive.coverImage || ''}
                          onChange={(e) => setEditingArchive({ ...editingArchive, coverImage: e.target.value })}
                          placeholder="/assets/aistudio/... ou https://..."
                          className="w-full bg-black border border-white/15 rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Image Preview 16:9 */}
                    <div className="md:col-span-6">
                      <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-white/20 relative shadow-xl flex items-center justify-center">
                        {editingArchive.coverImage ? (
                          <>
                            <img
                              src={editingArchive.coverImage}
                              alt="Aperçu couverture"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[9px] font-agrandir-semibold text-white">
                              APERÇU 16:9
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-[#666] text-xs p-4">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <span>Aucune image sélectionnée</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. LIEN VIDÉO YOUTUBE (OPTIONNEL AVEC CONVERSION AUTOMATIQUE EN EMBED) */}
                <div className="p-5 rounded-2xl bg-[#161616] border border-white/15 space-y-4">
                  <div>
                    <label className="block text-xs font-agrandir-extrabold text-white uppercase">
                      2. Lien Vidéo YouTube (Optionnel)
                    </label>
                    <p className="text-[11px] text-[#888] font-agrandir-regular mt-0.5">
                      Collez n'importe quel lien YouTube standard (watch?v=, youtu.be/ ou Shorts). Le système le convertit automatiquement en embed intégré sans redirection.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-[#888] uppercase mb-1">Lien YouTube standard :</label>
                      <input
                        type="text"
                        value={editingArchive.youtubeUrl || ''}
                        onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                        className="w-full bg-black border border-white/15 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:border-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-[#888] uppercase mb-1">Lien d'intégration généré automatiquement :</label>
                      <input
                        type="text"
                        readOnly
                        value={editingArchive.youtubeEmbedUrl || ''}
                        className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-3.5 py-2.5 text-[#aaa] font-mono text-xs cursor-default"
                        placeholder="https://www.youtube-nocookie.com/embed/..."
                      />
                    </div>
                  </div>

                  {/* Live Iframe Test */}
                  {editingArchive.youtubeEmbedUrl && (
                    <div className="pt-2">
                      <span className="text-[10px] text-[#888] uppercase block mb-1.5 font-agrandir-semibold">Aperçu du lecteur intégré :</span>
                      <div className="aspect-[16/9] max-w-lg rounded-2xl overflow-hidden bg-black border border-white/20 shadow-xl">
                        <iframe
                          src={editingArchive.youtubeEmbedUrl}
                          title="Aperçu YouTube"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. GALERIE D'IMAGES (OPTIONNEL - UPLOAD MULTIPLE DEPUIS TÉLÉPHONE/PC) */}
                <div className="p-5 rounded-2xl bg-[#161616] border border-white/15 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-agrandir-extrabold text-white uppercase">
                        3. Galerie de Photos de l'événement (Optionnel)
                      </label>
                      <p className="text-[11px] text-[#888] font-agrandir-regular mt-0.5">
                        Sélectionnez plusieurs photos depuis votre galerie. Elles apparaîtront lorsque le visiteur clique sur "Voir les photos".
                      </p>
                    </div>
                    <span className="text-xs font-mono text-[#aaa]">
                      {(editingArchive.photos || []).length} photo(s)
                    </span>
                  </div>

                  <div>
                    <label className="flex items-center justify-center p-4 border border-dashed border-white/20 hover:border-white rounded-xl cursor-pointer bg-black/40 transition-colors group">
                      <Upload className="w-5 h-5 text-[#aaa] group-hover:text-white mr-2" />
                      <span className="text-xs font-agrandir-semibold text-white uppercase">
                        {uploadingGallery ? 'Chargement des photos...' : 'Ajouter des photos à la galerie (sélection multiple)'}
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleGalleryFilesUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Photos Grid Thumbnails */}
                  {editingArchive.photos && editingArchive.photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                      {editingArchive.photos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden bg-black border border-white/15 group">
                          <img src={photo} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = (editingArchive.photos || []).filter((_, i) => i !== pIdx);
                              setEditingArchive({ ...editingArchive, photos: updated });
                            }}
                            className="absolute top-1 right-1 p-1 rounded-full bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Supprimer la photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. INFORMATIONS TEXTUELLES DU CONCERT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Titre du Récap / Concert *</label>
                    <input
                      type="text"
                      required
                      value={editingArchive.title || ''}
                      onChange={(e) => setEditingArchive({ ...editingArchive, title: e.target.value })}
                      placeholder="ex: WANTCHÉ — NOUVELLE VAGUE IVOIRE"
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Date textuelle / Année</label>
                    <input
                      type="text"
                      value={editingArchive.date || editingArchive.year || ''}
                      onChange={(e) => setEditingArchive({ ...editingArchive, date: e.target.value, year: e.target.value.substring(0, 4) })}
                      placeholder="ex: 23 Décembre 2026"
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Lieu / Salle</label>
                    <input
                      type="text"
                      value={editingArchive.venue || ''}
                      onChange={(e) => setEditingArchive({ ...editingArchive, venue: e.target.value })}
                      placeholder="ex: Esplanade du Palais de la Culture"
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Ville &amp; Pays</label>
                    <input
                      type="text"
                      value={editingArchive.city || ''}
                      onChange={(e) => setEditingArchive({ ...editingArchive, city: e.target.value })}
                      placeholder="Abidjan"
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Durée affichée du récap</label>
                    <input
                      type="text"
                      value={editingArchive.duration || ''}
                      onChange={(e) => setEditingArchive({ ...editingArchive, duration: e.target.value })}
                      placeholder="ex: 18:42 ou Live HD"
                      className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-agrandir-semibold text-[#888] uppercase mb-1.5">Résumé / Description de l'Archive</label>
                  <textarea
                    rows={3}
                    value={editingArchive.description || ''}
                    onChange={(e) => setEditingArchive({ ...editingArchive, description: e.target.value })}
                    placeholder="Retour en images sur la performance scénique, l'acoustique et la communion avec le public..."
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-white"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditingArchive(null)}
                    className="px-5 py-2.5 rounded-full border border-white/20 text-[#aaa] hover:text-white cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-7 py-2.5 rounded-full bg-white text-black font-agrandir-extrabold uppercase tracking-wider hover:bg-[#eaeaea] transition-all cursor-pointer shadow-xl flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Enregistrer l'Archive</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* LISTE DES ARCHIVES EXISTANTES DANS L'ADMIN */}
          <div className="space-y-6">
            {archives.map((item, idx) => (
              <div
                key={item.id}
                className="p-6 bg-[#0e0e0e] border border-white/10 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl"
              >
                {/* 16:9 Thumbnail Preview */}
                <div className="flex items-start gap-4">
                  <div className="w-36 sm:w-44 aspect-[16/9] rounded-2xl overflow-hidden bg-black border border-white/15 relative shrink-0">
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.youtubeEmbedUrl && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-current" />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/80 text-[9px] font-mono text-white">
                      {item.duration || 'HD'}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-agrandir-semibold text-[#d4af37] uppercase">
                        ARCHIVE 0{idx + 1}
                      </span>
                      <span className="text-xs text-[#777]">
                        {item.date || item.year} · {item.venue}
                      </span>
                    </div>

                    <h4 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                      {item.title}
                    </h4>

                    <p className="text-xs text-[#888] line-clamp-2 mt-1 max-w-xl">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-[#aaa]">
                      <span>{item.youtubeUrl ? '✓ Vidéo YouTube intégrée' : 'Pas de vidéo'}</span>
                      <span>·</span>
                      <span>{(item.photos || []).length} photo(s) dans la galerie</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-auto">
                  <button
                    onClick={() => {
                      setCurrentPage('archive');
                    }}
                    className="px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-agrandir-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Voir sur le site"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Voir sur le site</span>
                  </button>

                  <button
                    onClick={() => setEditingArchive(item)}
                    className="px-4 py-2 rounded-full bg-white text-black hover:bg-[#eaeaea] text-xs font-agrandir-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </button>

                  <button
                    onClick={() => handleDeleteArchive(item.id)}
                    className="p-2 rounded-full bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 cursor-pointer transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* --- TAB 3: OVERVIEW INDICATEURS CLÉS --- */}
      {activeTab === 'overview' && (
        <div className="space-y-8 font-agrandir-regular text-xs">
          
          <div className="p-6 bg-[#0e0e0e] border border-white/10 rounded-3xl space-y-4">
            <h3 className="text-base font-agrandir-extrabold text-white uppercase tracking-wider">
              Répartition des Ventes par Concert
            </h3>
            
            <div className="space-y-4 pt-2">
              {localEvents.map((evt) => {
                const totalQuota = evt.categories.reduce((acc, c) => acc + c.quota, 0);
                const totalSold = evt.categories.reduce((acc, c) => acc + c.sold, 0);
                const percent = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
                const rev = evt.categories.reduce((acc, c) => acc + (c.sold * c.price), 0);

                return (
                  <div key={evt.id} className="p-4 bg-[#141414] border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-agrandir-extrabold text-white text-sm">{evt.artist}</span>
                        <span className="text-[10px] text-[#888] font-mono">{evt.date} · {evt.venue}</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                        <div className="bg-white h-full rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-agrandir-extrabold text-white font-mono">
                        {rev.toLocaleString()} FCFA
                      </div>
                      <div className="text-[11px] text-[#888]">
                        {totalSold} / {totalQuota} billets ({percent}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Access to Gate Control Scanner */}
          <div className="p-6 bg-gradient-to-r from-blue-950/30 to-[#0e0e0e] border border-blue-500/20 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-agrandir-extrabold text-white uppercase text-sm">
                Scanner Portes &amp; Contrôle d'Accès aux Concerts
              </h4>
              <p className="text-[#888] text-xs mt-1">
                Activez la caméra ou saisissez le jeton sécurisé pour valider l'entrée des spectateurs aux portes.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('gate_scanner')}
              className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-agrandir-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer self-start sm:self-auto shadow-lg"
            >
              Ouvrir Scanner de Portes
            </button>
          </div>

        </div>
      )}

      {/* --- TAB 4: COMMANDES CLIENTS --- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Rechercher par référence, nom client, e-mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#121212] border border-white/15 rounded-xl pl-10 pr-4 py-2.5 text-xs font-agrandir-regular text-white focus:outline-none focus:border-white"
              />
            </div>
            <div className="text-xs font-agrandir-regular text-[#888]">
              {filteredOrders.length} commande(s) répertoriée(s)
            </div>
          </div>

          <div className="space-y-3 font-agrandir-regular text-xs">
            {filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 bg-[#0e0e0e] border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-agrandir-extrabold text-white text-sm">{ord.reference}</span>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-agrandir-semibold border border-emerald-500/30">
                      {ord.paymentStatus.toUpperCase()}
                    </span>
                    <span className="text-[#666] text-[10px] font-mono">
                      {new Date(ord.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  <div className="text-white mt-1.5 font-agrandir-semibold">
                    {ord.customerName} &lt;{ord.customerEmail}&gt; {ord.customerPhone && `· ${ord.customerPhone}`}
                  </div>

                  <div className="text-[#888] text-[11px] mt-0.5">
                    {ord.eventTitle} — {ord.quantity}x {ord.categoryName}
                  </div>

                  {ord.tickets && ord.tickets.length > 0 && (
                    <div className="mt-2 text-[11px] text-[#aaa] font-mono">
                      Billets émis : {ord.tickets.map((t) => t.serialNumber).join(', ')}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-base font-agrandir-extrabold text-white font-mono">
                    {ord.totalAmount.toLocaleString()} {ord.currency}
                  </div>
                  <div className="text-[10px] text-[#666] mt-1 font-mono">
                    Réf paiement : {ord.paymentProvider.toUpperCase()} ({ord.paymentRef})
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TAB 5: JOURNAL DES EMAILS TRANSACTIONNELS --- */}
      {activeTab === 'emails' && (
        <div className="space-y-4 font-agrandir-regular text-xs">
          <div className="text-xs text-[#888] uppercase tracking-wider mb-2 font-agrandir-semibold">
            Historique d’envoi des billets électroniques
          </div>

          {emails.map((eml) => (
            <div key={eml.id} className="p-4 bg-[#0e0e0e] border border-white/10 rounded-2xl space-y-1 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-white font-agrandir-semibold">{eml.subject}</span>
                <span className="text-emerald-400 text-[10px] font-mono">{eml.status.toUpperCase()}</span>
              </div>
              <div className="text-[#888] text-[11px]">
                Destinataire : <strong className="text-[#ccc]">{eml.recipient}</strong> · {new Date(eml.timestamp).toLocaleString('fr-FR')}
              </div>
              <div className="text-[#666] text-[11px] pt-1 border-t border-white/5">
                Aperçu : {eml.contentPreview}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
