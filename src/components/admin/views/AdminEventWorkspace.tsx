import React, { useState } from 'react';
import { ConcertEvent, Order, TicketCategory } from '../../../types';
import { 
  ArrowLeft, 
  Save, 
  ExternalLink, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Ticket, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Calendar, 
  MapPin, 
  Clock, 
  Phone, 
  Sparkles, 
  Eye, 
  ShieldAlert,
  Printer
} from 'lucide-react';
import { readFileAsDataURL } from '../../../utils/mediaUtils';
import { ScannerLinkGenerator } from '../ScannerLinkGenerator';

export type EventSubTab = 'overview' | 'details' | 'media' | 'tickets' | 'orders' | 'analytics' | 'settings';

interface AdminEventWorkspaceProps {
  event: ConcertEvent;
  orders: Order[];
  onBackToEvents: () => void;
  onSaveEvent: (updatedEvent: ConcertEvent) => Promise<void>;
  onDeleteEvent?: (eventId: string) => Promise<void>;
  onPreviewPublic: (slug: string) => void;
  showToast: (msg: string, type?: 'info' | 'success' | 'error') => void;
  onOpenBatchPrint?: (eventId?: string) => void;
}

export const AdminEventWorkspace: React.FC<AdminEventWorkspaceProps> = ({
  event,
  orders,
  onBackToEvents,
  onSaveEvent,
  onDeleteEvent,
  onPreviewPublic,
  showToast,
  onOpenBatchPrint,
}) => {
  const [currentTab, setCurrentTab] = useState<EventSubTab>('overview');
  const [formData, setFormData] = useState<ConcertEvent>({ ...event });
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Filter orders for this event
  const eventOrders = orders.filter((o) => o.eventId === event.id || o.eventTitle === event.title);

  // Real KPI calculations for this event
  const totalRevenue = formData.categories.reduce((acc, c) => acc + c.sold * c.price, 0);
  const totalSold = formData.categories.reduce((acc, c) => acc + c.sold, 0);
  const totalQuota = formData.categories.reduce((acc, c) => acc + c.quota, 0);
  const fillRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
  const remainingTickets = Math.max(0, totalQuota - totalSold);
  const completedOrders = eventOrders.filter((o) => o.paymentStatus === 'completed');
  const averageBasket = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  // Handle Form Change
  const handleChange = (field: keyof ConcertEvent, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  // Handle Save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSaveEvent(formData);
      setIsDirty(false);
      showToast(`Concert "${formData.artist}" enregistré et mis à jour en direct !`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Direct image file upload handler for visual assets
  const handleUploadVisual = async (field: 'officialPoster' | 'artistPortrait' | 'bannerImage', file: File) => {
    try {
      let fileUrl = '';
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) {
            fileUrl = data.url;
          }
        }
      } catch (uploadErr) {
        console.warn('API upload fallback', uploadErr);
      }

      if (!fileUrl) {
        fileUrl = await readFileAsDataURL(file);
      }

      const updated = { ...formData, [field]: fileUrl };
      setFormData(updated);
      setIsDirty(true);
      // Auto-save visual directly for instant public update
      await onSaveEvent(updated);
      setIsDirty(false);
      showToast(`Visuel ${field === 'officialPoster' ? 'Affiche officielle' : field === 'artistPortrait' ? 'Portrait artiste' : 'Bannière'} synchronisé avec succès !`, 'success');
    } catch {
      showToast("Erreur lors de l'import de l'image.", 'error');
    }
  };

  // NOUVEAU : Gérer l'upload du design spécifique d'un billet de catégorie
  const handleCategoryTicketImageUpload = async (catId: string, file: File) => {
    try {
      const fileUrl = await readFileAsDataURL(file);
      setFormData((prev) => {
        const updatedCategories = prev.categories.map((c) => {
          if (c.id !== catId) return c;
          return { ...c, ticketImageUrl: fileUrl, ticketImageFile: file };
        });
        return { ...prev, categories: updatedCategories };
      });
      setIsDirty(true);
      showToast(`Design du billet importé. N'oubliez pas de sauvegarder.`, 'info');
    } catch (error) {
      showToast("Erreur lors de l'import de l'image du billet.", 'error');
    }
  };

  // Ticket categories handlers
  const handleCategoryChange = (catId: string, field: keyof TicketCategory, value: any) => {
    setFormData((prev) => {
      const updatedCategories = prev.categories.map((c) => {
        if (c.id !== catId) return c;
        if (field === 'quota') {
          // Integrity check: quota cannot be less than tickets already sold
          const numVal = Math.max(0, Number(value));
          if (numVal < c.sold) {
            showToast(`Le quota (${numVal}) ne peut pas être inférieur aux billets déjà vendus (${c.sold}).`, 'error');
            return c;
          }
          return { ...c, quota: numVal };
        }
        return { ...c, [field]: value };
      });
      return { ...prev, categories: updatedCategories };
    });
    setIsDirty(true);
  };

  const handleAddCategory = () => {
    const newCat: TicketCategory = {
      id: `cat_${Date.now()}`,
      name: 'NOUVELLE CATÉGORIE',
      price: 15000,
      currency: 'FCFA',
      quota: 500,
      sold: 0,
      description: 'Accès standard événement',
      perks: ['Entrée officielle'],
    };
    setFormData((prev) => ({
      ...prev,
      categories: [...prev.categories, newCat],
    }));
    setIsDirty(true);
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = formData.categories.find((c) => c.id === catId);
    if (cat && cat.sold > 0) {
      showToast(`Impossible de supprimer la catégorie "${cat.name}" car ${cat.sold} billet(s) ont déjà été vendus.`, 'error');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== catId),
    }));
    setIsDirty(true);
  };

  const tabs: Array<{ id: EventSubTab; label: string }> = [
    { id: 'overview', label: 'Vue générale' },
    { id: 'details', label: 'Informations' },
    { id: 'media', label: 'Médias & Affiches' },
    { id: 'tickets', label: 'Billetterie & Tarifs' },
    { id: 'orders', label: `Commandes (${eventOrders.length})` },
    { id: 'analytics', label: 'Statistiques' },
    { id: 'settings', label: 'Paramètres' },
  ];

  return (
    <div className="space-y-6 select-none">
      
      {/* 1. Header Fiche Produit (Inspiré de Shopify) */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        
        {/* Top return link & status toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={onBackToEvents}
            className="self-start text-xs font-agrandir-semibold text-[#888] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Retour aux concerts</span>
          </button>

          <div className="flex items-center gap-2.5">
            {/* Status Selector Pill */}
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as any)}
              className="bg-[#181818] border border-white/15 rounded-xl px-3 py-1.5 text-xs font-agrandir-bold text-white focus:outline-none focus:border-white uppercase tracking-wider"
            >
              <option value="published">● Publié (En ligne)</option>
              <option value="draft">● Brouillon (Privé)</option>
              <option value="completed">● Clôturé / Terminé</option>
            </select>

            {/* Public preview button */}
            <button
              onClick={() => onPreviewPublic(formData.slug)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Voir sur le site public"
            >
              <Eye className="w-3.5 h-3.5 text-[#d4af37]" />
              <span className="hidden sm:inline">Aperçu direct</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-5 py-1.5 rounded-xl text-xs font-agrandir-extrabold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isDirty
                  ? 'bg-[#d4af37] hover:bg-[#c29d2b] text-black ring-2 ring-[#d4af37]/50 animate-pulse'
                  : 'bg-white hover:bg-neutral-200 text-black'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : isDirty ? 'Sauvegarder *' : 'Enregistré'}</span>
            </button>
          </div>
        </div>

        {/* Concert Identity Title & Venue */}
        <div className="flex items-center gap-4 pt-2">
          <img
            src={formData.officialPoster || formData.artistPortrait}
            alt={formData.artist}
            className="w-16 h-16 rounded-2xl object-cover border border-white/15 shrink-0"
          />
          <div>
            <div className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#d4af37] uppercase">
              FICHE DE PRODUCTION
            </div>
            <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              {formData.artist} — {formData.title}
            </h1>
            <p className="text-xs text-[#888] font-agrandir-regular mt-0.5">
              {formData.date} · {formData.time} · {formData.venue}, {formData.city}
            </p>
          </div>
        </div>

        {/* Secondary Sub-navigation Tabs (Shopify Style) */}
        <div className="pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                currentTab === tab.id
                  ? 'bg-white text-black font-agrandir-extrabold shadow-md'
                  : 'text-[#888] hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* 2. TAB CONTENT PANELS */}

      {/* TAB 1: OVERVIEW */}
      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* 4 KPIs of this concert */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-1 shadow-lg">
              <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase">RECETTES DU CONCERT</div>
              <div className="font-agrandir-extrabold text-2xl text-white">
                {totalRevenue.toLocaleString()} <span className="text-xs text-[#d4af37]">FCFA</span>
              </div>
              <div className="text-[11px] text-[#666]">Générées par les places vendues</div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-1 shadow-lg">
              <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase">BILLETS VENDUS</div>
              <div className="font-agrandir-extrabold text-2xl text-white">
                {totalSold.toLocaleString()} <span className="text-xs text-[#888]">/ {totalQuota.toLocaleString()}</span>
              </div>
              <div className="text-[11px] text-[#666]">{remainingTickets.toLocaleString()} places disponibles</div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-1 shadow-lg">
              <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase">REMPLISSAGE SALLE</div>
              <div className="font-agrandir-extrabold text-2xl text-white">{fillRate} %</div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className="bg-gradient-to-r from-[#d4af37] to-white h-full rounded-full"
                  style={{ width: `${Math.min(100, fillRate)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-5 space-y-1 shadow-lg">
              <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase">COMMANDES VALIDÉES</div>
              <div className="font-agrandir-extrabold text-2xl text-white">{eventOrders.length}</div>
              <div className="text-[11px] text-[#666]">Panier moyen : {averageBasket.toLocaleString()} FCFA</div>
            </div>
          </div>

          {/* Identity & Visual Preview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-[#0c0c0c] border border-white/10 rounded-3xl p-5 space-y-3">
              <div className="text-[10px] font-agrandir-semibold tracking-wider text-[#888] uppercase">
                AFFICHE DU CONCERT
              </div>
              <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black border border-white/10">
                <img
                  src={formData.officialPoster || formData.artistPortrait}
                  alt={formData.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setCurrentTab('media')}
                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-[#d4af37] transition-colors cursor-pointer"
              >
                Gérer les affiches &amp; photos &rarr;
              </button>
            </div>

            <div className="lg:col-span-8 bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="text-[10px] font-agrandir-semibold tracking-wider text-[#888] uppercase border-b border-white/10 pb-2">
                DERNIÈRES COMMANDES POUR CE CONCERT
              </div>

              {eventOrders.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#666]">
                  Aucune commande enregistrée pour ce concert pour le moment.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventOrders.slice(0, 5).map((ord) => (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#121212] border border-white/5 text-xs"
                    >
                      <div>
                        <div className="font-agrandir-bold text-white">{ord.customerName}</div>
                        <div className="text-[11px] text-[#888]">{ord.categoryName} ({ord.quantity} place(s))</div>
                      </div>
                      <div className="text-right">
                        <div className="font-agrandir-bold text-white">{ord.totalAmount.toLocaleString()} FCFA</div>
                        <div className="text-[10px] text-[#666] font-mono">{ord.reference}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INFORMATIONS (DETAILS) */}
      {currentTab === 'details' && (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
              INFORMATIONS PRINCIPALES DU SPECTACLE
            </h2>
            <p className="text-xs text-[#888] mt-0.5">
              Édition des métadonnées artistiques et des indications pratiques affichées aux spectateurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Nom de l'Artiste / Tête d'Affiche
              </label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => handleChange('artist', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Titre Officiel du Concert
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Sous-titre / Slogan de Tournée
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Date du Concert (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Heure du Spectacle (HH:mm)
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Lieu / Salle
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => handleChange('venue', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Ville &amp; Pays
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ville"
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Pays"
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Infoline &amp; Réservations Téléphoniques
              </label>
              <input
                type="text"
                value={formData.infoline || ''}
                onChange={(e) => handleChange('infoline', e.target.value)}
                placeholder="+225 07 03 847 316"
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Genre Musical
              </label>
              <input
                type="text"
                value={formData.genre}
                onChange={(e) => handleChange('genre', e.target.value)}
                placeholder="Rap / Hip-Hop, Afrobeats..."
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-agrandir-semibold uppercase tracking-wider text-[#888] mb-1.5">
                Description &amp; Note Scénique
              </label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl p-4 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MÉDIAS (VISUELS, AFFICHES, PORTRAITS) */}
      {currentTab === 'media' && (
        <div className="space-y-6">
          <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="text-[10px] font-agrandir-semibold tracking-wider text-[#d4af37] uppercase">
                RÉGIE VISUELLE ET DIRECTION ARTISTIQUE
              </div>
              <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                GESTION DES AFFICHES ET VISUELS OFFICIELS
              </h2>
              <p className="text-xs text-[#888] mt-0.5">
                Chaque image modifiée ici se répercute instantanément sur la bannière Hero et la section « Prochains concerts » du site public.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              
              {/* 1. AFFICHE OFFICIELLE DU CONCERT */}
              <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-agrandir-bold text-sm text-white uppercase">AFFICHE OFFICIELLE</h3>
                    <p className="text-[11px] text-[#888]">Affichée dans le carrousel « Prochains concerts » et sur les billets clients.</p>
                  </div>
                  <span className="text-[10px] text-[#d4af37] font-mono">16:9 / 4:3</span>
                </div>

                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black border border-white/15 relative group">
                  <img
                    src={formData.officialPoster || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg'}
                    alt="Affiche officielle"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-[#888] uppercase tracking-wider font-agrandir-semibold">
                    Importer un nouveau fichier affiche
                  </label>
                  <label className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-agrandir-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Choisir une image sur l'ordinateur</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadVisual('officialPoster', file);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="pt-1">
                    <span className="text-[9px] text-[#666] uppercase">Ou coller une URL d'image :</span>
                    <input
                      type="text"
                      value={formData.officialPoster}
                      onChange={(e) => handleChange('officialPoster', e.target.value)}
                      placeholder="/assets/... ou https://..."
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#555] font-mono mt-1 focus:outline-none focus:border-white"
                    />
                  </div>
                </div>
              </div>

              {/* 2. PORTRAIT DE L'ARTISTE */}
              <div className="bg-[#121212] border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-agrandir-bold text-sm text-white uppercase">PORTRAIT DE L'ARTISTE</h3>
                    <p className="text-[11px] text-[#888]">Affiché en plein écran sur la bannière Hero supérieure à l'accueil.</p>
                  </div>
                  <span className="text-[10px] text-[#d4af37] font-mono">Plein écran</span>
                </div>

                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black border border-white/15 relative group">
                  <img
                    src={formData.artistPortrait || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg'}
                    alt="Portrait de l'artiste"
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] text-[#888] uppercase tracking-wider font-agrandir-semibold">
                    Importer un nouveau portrait d'artiste
                  </label>
                  <label className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-agrandir-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Choisir une image sur l'ordinateur</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadVisual('artistPortrait', file);
                      }}
                      className="hidden"
                    />
                  </label>

                  <div className="pt-1">
                    <span className="text-[9px] text-[#666] uppercase">Ou coller une URL d'image :</span>
                    <input
                      type="text"
                      value={formData.artistPortrait}
                      onChange={(e) => handleChange('artistPortrait', e.target.value)}
                      placeholder="/assets/... ou https://..."
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-[#555] font-mono mt-1 focus:outline-none focus:border-white"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BILLETTERIE & TARIFS (TICKETS) */}
      {currentTab === 'tickets' && (
        <div className="space-y-6">
          {/* CARTE PROFESSIONNELLE LUMARÉEL : IMPRESSION BILLETS PHYSIQUES */}
          <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-[#d4af37]/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-4 z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] shrink-0 shadow-lg">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                  Service Régie &amp; Guichet Officiel LUMARÉEL
                </div>
                <h3 className="font-agrandir-extrabold text-base text-white tracking-wide mt-0.5">
                  Demande d'impression des billets physiques
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  Générez les planches d'impression thermique officielles (format sécurisé Recto / Verso avec filigrane anti-fraude, talon détachable et QR code unitaire cryptographique) pour guichets et vigiles.
                </p>
              </div>
            </div>

            {onOpenBatchPrint && (
              <button
                type="button"
                onClick={() => onOpenBatchPrint(formData.id)}
                className="z-10 px-6 py-3 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-xl shrink-0 transition-all hover:scale-102 active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer les billets</span>
              </button>
            )}
          </div>

          <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
                  TARIFS, QUOTAS &amp; CATÉGORIES DE PLACES
                </h2>
                <p className="text-xs text-[#888] mt-0.5">
                  Contrôle des jauges par catégorie. Le quota ne peut être abaissé sous le nombre de billets déjà vendus.
                </p>
              </div>

              <button
                onClick={handleAddCategory}
                className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une catégorie</span>
              </button>
            </div>

          <div className="space-y-4">
            {formData.categories.map((cat, idx) => {
              const remaining = Math.max(0, cat.quota - cat.sold);
              const catFill = cat.quota > 0 ? Math.round((cat.sold / cat.quota) * 100) : 0;

              return (
                <div
                  key={cat.id || idx}
                  className="p-5 rounded-2xl bg-[#121212] border border-white/10 space-y-4 shadow-lg"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-white/10 text-white flex items-center justify-center font-mono text-xs font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => handleCategoryChange(cat.id, 'name', e.target.value)}
                        className="font-agrandir-extrabold text-sm text-white uppercase bg-transparent border-b border-dashed border-white/20 focus:border-white focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {cat.sold.toLocaleString()} vendus / {cat.quota.toLocaleString()} ({catFill}%)
                      </span>

                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-neutral-500 hover:text-rose-400 transition-colors"
                        title="Supprimer la catégorie"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                        Prix Unitaire (FCFA)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={cat.price}
                        onChange={(e) => handleCategoryChange(cat.id, 'price', Number(e.target.value))}
                        className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                        Quota Total Alloué
                      </label>
                      <input
                        type="number"
                        min={cat.sold}
                        value={cat.quota}
                        onChange={(e) => handleCategoryChange(cat.id, 'quota', Number(e.target.value))}
                        className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                        Places Restantes
                      </label>
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-[#d4af37] font-bold">
                        {remaining.toLocaleString()} places disponibles
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                      Description &amp; Avantages de la place
                    </label>
                    <input
                      type="text"
                      value={cat.description}
                      onChange={(e) => handleCategoryChange(cat.id, 'description', e.target.value)}
                      placeholder="Ex: Accès loge VIP, boisson comprise, place assise..."
                      className="w-full bg-[#181818] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 focus:outline-none focus:border-white font-agrandir-regular"
                    />
                  </div>

                  {/* NOUVEAU : ZONE D'IMPORT DU DESIGN DU BILLET PAR CATÉGORIE */}
                  <div className="sm:col-span-3 pt-3 border-t border-white/5 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888]">
                        Design du Billet Physique pour l'impression (Recto)
                      </label>
                      <span className="text-[9px] font-mono font-bold text-[#d4af37] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/30">
                        Format recommandé : 1536 × 548 px
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                      {cat.ticketImageUrl ? (
                        <div className="w-48 aspect-[1536/548] rounded-lg overflow-hidden border border-white/20 shrink-0 bg-black">
                           <img src={cat.ticketImageUrl} alt="Aperçu Billet" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-48 aspect-[1536/548] rounded-lg bg-black/40 border border-dashed border-white/20 flex flex-col items-center justify-center text-[#555] shrink-0">
                           <ImageIcon className="w-5 h-5 mb-1" />
                           <span className="text-[9px] uppercase font-bold">Aucun design (1536 × 548)</span>
                        </div>
                      )}
                      
                      <label className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-agrandir-semibold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors w-full sm:w-auto">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{cat.ticketImageUrl ? 'Changer le design du billet' : 'Importer une image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleCategoryTicketImageUpload(cat.id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {/* FIN NOUVEAU */}
                  
                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* TAB 5: COMMANDES SPÉCIFIQUES (ORDERS) */}
      {currentTab === 'orders' && (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
              COMMANDES ASSOCIÉES À {formData.artist} ({eventOrders.length})
            </h2>
            <p className="text-xs text-[#888] mt-0.5">
              Historique des spectateurs ayant réservé spécifiquement pour ce concert.
            </p>
          </div>

          {eventOrders.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#666]">
              Aucune commande trouvée pour cet événement.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-agrandir-regular">
                <thead>
                  <tr className="border-b border-white/10 bg-[#121212] text-[10px] text-[#777] uppercase">
                    <th className="py-3 px-4">Réf. Commande</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4">Quantité</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {eventOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-white">{ord.reference}</td>
                      <td className="py-3 px-4">
                        <div className="text-white font-agrandir-bold">{ord.customerName}</div>
                        <div className="text-[10px] text-[#777]">{ord.customerEmail}</div>
                      </td>
                      <td className="py-3 px-4 text-neutral-300">{ord.categoryName}</td>
                      <td className="py-3 px-4 font-mono">{ord.quantity} place(s)</td>
                      <td className="py-3 px-4 font-agrandir-bold text-white">
                        {ord.totalAmount.toLocaleString()} FCFA
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-agrandir-bold uppercase">
                          {ord.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: STATISTIQUES (ANALYTICS) */}
      {currentTab === 'analytics' && (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
              PERFORMANCES &amp; VENTILATION PAR CATÉGORIE
            </h2>
            <p className="text-xs text-[#888] mt-0.5">
              Analyse détaillée des recettes et des ventes pour {formData.artist}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#121212] border border-white/10 space-y-3">
              <div className="text-xs font-agrandir-bold text-white uppercase">RÉPARTITION DU CHIFFRE D'AFFAIRES</div>
              <div className="space-y-3 pt-2">
                {formData.categories.map((c) => {
                  const catRevenue = c.sold * c.price;
                  const percent = totalRevenue > 0 ? Math.round((catRevenue / totalRevenue) * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300">{c.name}</span>
                        <span className="font-mono text-white font-bold">{catRevenue.toLocaleString()} FCFA ({percent}%)</span>
                      </div>
                      <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-[#d4af37] h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#121212] border border-white/10 space-y-3">
              <div className="text-xs font-agrandir-bold text-white uppercase">REMPLISSAGE PAR JAUGE DE PLACE</div>
              <div className="space-y-3 pt-2">
                {formData.categories.map((c) => {
                  const percent = c.quota > 0 ? Math.round((c.sold / c.quota) * 100) : 0;
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-300">{c.name}</span>
                        <span className="font-mono text-white font-bold">{c.sold} / {c.quota} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-black/60 h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="bg-white h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: PARAMÈTRES & CYCLE DE VIE (SETTINGS) */}
      {currentTab === 'settings' && (
        <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight">
              CYCLE DE VIE &amp; PUBLICATION
            </h2>
            <p className="text-xs text-[#888] mt-0.5">
              Gestion de la visibilité sur la plateforme et politiques de billetterie.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121212] border border-white/10">
              <div>
                <div className="font-agrandir-bold text-sm text-white">Mise en avant sur l'accueil (Bannière Hero)</div>
                <div className="text-xs text-[#888]">Active le passage de l'artiste dans le carrousel supérieur.</div>
              </div>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => handleChange('isFeatured', e.target.checked)}
                className="w-5 h-5 accent-[#d4af37] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#121212] border border-white/10">
              <div>
                <div className="font-agrandir-bold text-sm text-white">Statut de la billetterie</div>
                <div className="text-xs text-[#888]">Ouvre ou ferme la possibilité d'acheter des places en ligne.</div>
              </div>
              <button
                onClick={() => handleChange('status', formData.status === 'published' ? 'draft' : 'published')}
                className={`px-4 py-2 rounded-xl text-xs font-agrandir-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  formData.status === 'published'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                }`}
              >
                {formData.status === 'published' ? 'Suspendre la vente' : 'Ouvrir la billetterie'}
              </button>
            </div>

            {/* Générateur de Lien Magique Vigile */}
            <div className="pt-2">
              <ScannerLinkGenerator
                eventId={formData.id}
                eventTitle={formData.title}
                artistName={formData.artist}
                showToast={showToast}
              />
            </div>

            {/* Zone de Danger : Suppression */}
            {onDeleteEvent && (
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                <div>
                  <div className="font-agrandir-bold text-sm text-rose-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Zone Critique · Suppression Définitive</span>
                  </div>
                  <div className="text-xs text-[#888] mt-1 max-w-lg">
                    Cette action supprimera le concert de la base de données et retirera l’événement du catalogue public et de l'accueil.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le concert "${formData.artist}" ?`)) {
                      await onDeleteEvent(formData.id);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Supprimer le concert</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};