import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent, Order, TransactionalEmail, AdminStats, ArchiveProduction } from '../types';
import { AdminSidebar, AdminSection } from './admin/AdminSidebar';
import { AdminHeader } from './admin/AdminHeader';
import { AdminOverviewView } from './admin/views/AdminOverviewView';
import { AdminEventsListView } from './admin/views/AdminEventsListView';
import { AdminEventWorkspace } from './admin/views/AdminEventWorkspace';
import { AdminOrdersView } from './admin/views/AdminOrdersView';
import { AdminArchivesView } from './admin/views/AdminArchivesView';
import { AdminEmailsView } from './admin/views/AdminEmailsView';
import { AdminSettingsView } from './admin/views/AdminSettingsView';
import { AdminMembershipView } from './admin/views/AdminMembershipView';
import { AdminPhysicalCardsView } from './admin/views/AdminPhysicalCardsView';
import { AdminWorkshopView } from './admin/views/AdminWorkshopView';
import { TicketBatchPrintModal } from './TicketBatchPrintModal';
import { Plus, X } from 'lucide-react';

const AdminDashboardContent: React.FC = () => {
  const { 
    events, 
    refreshEvents, 
    saveEvent,
    deleteEvent,
    archives, 
    saveArchive, 
    deleteArchive, 
    showToast, 
    setCurrentPage, 
    setSelectedEventSlug 
  } = useApp();

  // Navigation State (Shopify 3-Level Architecture)
  const [currentSection, setCurrentSection] = useState<AdminSection>('overview');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Batch Physical Ticket Printing Modal State
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [batchPrintEventId, setBatchPrintEventId] = useState<string | undefined>(undefined);

  // Backend Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<TransactionalEmail[]>([]);

  // New Event Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEventArtist, setNewEventArtist] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-12-25');
  const [newEventTime, setNewEventTime] = useState('18:00');
  const [newEventVenue, setNewEventVenue] = useState('Palais de la Culture Bernard Binlin-Dadié');
  const [newEventCity, setNewEventCity] = useState('Abidjan');

  // Fetch admin stats, orders, and emails
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
      console.warn('Admin data fetch warning', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [events]);

  // Find currently active event if in Level 3 workspace
  const activeEvent = events.find((e) => e.id === selectedEventId);

  // Save Event Handler (persists via AppContext Supabase Cloud DB + mirror)
  const handleSaveEvent = async (updatedEvent: ConcertEvent) => {
    await saveEvent(updatedEvent);
  };

  // Delete Event Handler (persists via AppContext Supabase Cloud DB)
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteEvent(eventId);
      setSelectedEventId(null);
      setCurrentSection('events');
      showToast('Concert supprimé avec succès.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression.', 'error');
    }
  };

  // Batch print modal opener
  const handleOpenBatchPrint = (eventId?: string) => {
    setBatchPrintEventId(eventId || selectedEventId || undefined);
    setIsBatchPrintModalOpen(true);
  };

  // Create New Event Handler
  const handleCreateNewEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventArtist.trim() || !newEventTitle.trim()) {
      showToast('Le nom de l’artiste et le titre sont obligatoires.', 'error');
      return;
    }

    try {
      const defaultCategories = [
        {
          id: `cat_gp_${Date.now()}`,
          name: 'PASS GP',
          price: 10000,
          currency: 'FCFA' as const,
          quota: 3000,
          sold: 0,
          description: 'Accès fosse générale',
          perks: ['Entrée standard'],
        },
        {
          id: `cat_vip_${Date.now()}`,
          name: 'PASS VIP',
          price: 25000,
          currency: 'FCFA' as const,
          quota: 800,
          sold: 0,
          description: 'Tribune VIP avec place assise et cocktail',
          perks: ['Coupe-file', 'Tribune assise'],
        },
      ];

      const newEvt: ConcertEvent = {
        id: `evt_${Date.now()}`,
        slug: newEventTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        artist: newEventArtist.trim(),
        title: newEventTitle.trim(),
        subtitle: `En concert exceptionnel · ${newEventVenue}`,
        date: newEventDate,
        time: newEventTime,
        doorsOpen: '16:30',
        venue: newEventVenue,
        city: newEventCity,
        country: 'Côte d’Ivoire',
        address: newEventVenue,
        description: `Concert live exceptionnel et performance scénique.`,
        artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
        officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
        bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
        status: 'published',
        isFeatured: true,
        organizerType: 'lumareel',
        organizerName: 'LUMARÉEL CO.',
        genre: 'Concert Live',
        platformFeePercent: 0,
        infoline: '+225 01 53 508 210',
        categories: defaultCategories,
      };

      await saveEvent(newEvt);
      showToast(`Concert "${newEvt.artist}" créé avec succès !`, 'success');
      setIsCreateModalOpen(false);
      setSelectedEventId(newEvt.id);
      setCurrentSection('events');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création du concert', 'error');
    }
  };

  const handlePreviewPublic = (slug: string) => {
    setSelectedEventSlug(slug);
    setCurrentPage('concert_detail');
  };

  return (
    <div className="min-h-screen bg-black text-white flex select-none font-agrandir-regular relative">
      
      {/* 1. Persistent Sidebar (Inspirée de Shopify) */}
      <AdminSidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setCurrentSection(sec);
          setSelectedEventId(null);
        }}
        selectedEventId={selectedEventId}
        selectedEventTitle={activeEvent ? `${activeEvent.artist} — ${activeEvent.title}` : undefined}
        onClearSelectedEvent={() => setSelectedEventId(null)}
        eventsCount={events.length}
        ordersCount={orders.length}
        archivesCount={archives.length}
        onExitAdmin={() => setCurrentPage('home')}
        isMobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenBatchPrint={() => handleOpenBatchPrint()}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header with Breadcrumbs */}
        <AdminHeader
          currentSection={currentSection}
          selectedEventTitle={activeEvent ? activeEvent.artist : undefined}
          onOpenMobileMenu={() => setMobileSidebarOpen(true)}
          onCreateEventClick={
            !selectedEventId
              ? () => {
                  setNewEventArtist('');
                  setNewEventTitle('');
                  setIsCreateModalOpen(true);
                }
              : undefined
          }
          onNavigateScanner={() => setCurrentPage('gate_scanner')}
          onNavigatePublic={() => setCurrentPage('home')}
          onOpenBatchPrint={() => handleOpenBatchPrint()}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto pb-20">
          
          {/* LEVEL 3 : Espace individuel d'un événement sélectionné */}
          {selectedEventId && activeEvent ? (
            <AdminEventWorkspace
              key={activeEvent.id}
              event={activeEvent}
              orders={orders}
              onBackToEvents={() => {
                setSelectedEventId(null);
                setCurrentSection('events');
              }}
              onSaveEvent={handleSaveEvent}
              onDeleteEvent={handleDeleteEvent}
              onPreviewPublic={handlePreviewPublic}
              showToast={showToast}
              onOpenBatchPrint={handleOpenBatchPrint}
            />
          ) : (
            /* LEVEL 1 & 2 : Vues transversales */
            <>
              {currentSection === 'overview' && (
                <AdminOverviewView
                  events={events}
                  orders={orders}
                  stats={stats}
                  onSelectEvent={(eventId) => {
                    setSelectedEventId(eventId);
                    setCurrentSection('events');
                  }}
                  onNavigateSection={(sec) => setCurrentSection(sec)}
                  onCreateEvent={() => setIsCreateModalOpen(true)}
                />
              )}

              {currentSection === 'membership' && (
                <AdminMembershipView />
              )}

              {currentSection === 'physicalCards' && <AdminPhysicalCardsView />}

              {currentSection === 'workshop' && (
                <AdminWorkshopView />
              )}

              {currentSection === 'events' && (
                <AdminEventsListView
                  events={events}
                  onSelectEvent={(eventId) => setSelectedEventId(eventId)}
                  onCreateEvent={() => setIsCreateModalOpen(true)}
                  onPreviewPublic={handlePreviewPublic}
                />
              )}

              {currentSection === 'orders' && (
                <AdminOrdersView orders={orders} />
              )}

              {currentSection === 'archives' && (
                <AdminArchivesView
                  archives={archives}
                  onSaveArchive={saveArchive}
                  onDeleteArchive={deleteArchive}
                  showToast={showToast}
                />
              )}

              {currentSection === 'emails' && (
                <AdminEmailsView emails={emails} />
              )}

              {currentSection === 'settings' && (
                <AdminSettingsView showToast={showToast} />
              )}
            </>
          )}

        </main>

      </div>

      {/* 3. Modal de Création Rapide de Concert (Shopify Style) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0e0e] border border-white/20 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <div className="text-[10px] font-agrandir-semibold text-[#d4af37] uppercase">
                  NOUVEAU PRODUIT / ÉVÉNEMENT
                </div>
                <h2 className="font-agrandir-extrabold text-xl text-white uppercase">
                  CRÉER UN CONCERT OFFICIEL
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewEvent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Nom de l'Artiste / Tête d'Affiche *
                </label>
                <input
                  type="text"
                  required
                  value={newEventArtist}
                  onChange={(e) => setNewEventArtist(e.target.value)}
                  placeholder="Ex: TIAKOLA, JEUNE LION, WANTCHÉ..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Titre du Concert *
                </label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Ex: M’POINT M ABIDJAN, LIVE AU PALAIS..."
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                    Date de l'événement
                  </label>
                  <input
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                  <label className="block text-[10px] uppercase tracking-widest text-[#888] mb-2 mt-4">Heure du concert</label>
                  <input
                    type="time"
                    required
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventCity}
                    onChange={(e) => setNewEventCity(e.target.value)}
                    className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-agrandir-semibold uppercase text-[#888] mb-1">
                  Salle / Lieu de la Scène
                </label>
                <input
                  type="text"
                  required
                  value={newEventVenue}
                  onChange={(e) => setNewEventVenue(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-[#888] leading-relaxed">
                Une fois le concert initialisé, sa fiche complète s'ouvrira automatiquement pour vous permettre de téléverser l'affiche officielle, le portrait d'artiste et de configurer vos tarifs &amp; quotas.
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#888] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors shadow-lg"
                >
                  Créer et ouvrir la fiche &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Batch Print Modal (Régie & Guichet LUMARÉEL) */}
      <TicketBatchPrintModal
        isOpen={isBatchPrintModalOpen}
        onClose={() => setIsBatchPrintModalOpen(false)}
        initialEventId={batchPrintEventId || selectedEventId || undefined}
      />

    </div>
  );
};


/**
 * Secours de la console : si une vue de gestion plante au rendu,
 * l'administrateur conserve un accès direct au générateur de billets.
 */
const AdminDashboardRecovery: React.FC<{ error: Error }> = ({ error }) => {
  const { events, setCurrentPage } = useApp();
  const [printOpen, setPrintOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-agrandir-regular">
      <div className="max-w-3xl mx-auto border border-amber-500/30 bg-[#101010] rounded-3xl p-6 sm:p-8">
        <div className="text-[#d4af37] text-xs font-bold uppercase tracking-widest mb-3">
          Console LUMARÉEL — mode de récupération
        </div>
        <h1 className="text-2xl font-bold mb-3">Accès impression disponible</h1>
        <p className="text-sm text-neutral-300 mb-5">
          Une erreur empêche le chargement complet du tableau de bord. Le générateur de billets reste accessible ci-dessous.
        </p>
        <div className="text-xs text-neutral-500 bg-black rounded-xl p-3 mb-5 break-words">
          {error.message || 'Erreur de rendu inconnue'}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPrintOpen(true)}
            className="px-5 py-3 rounded-xl bg-[#d4af37] text-black font-bold text-sm"
          >
            Ouvrir l'impression des billets
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-5 py-3 rounded-xl border border-white/20 text-white text-sm"
          >
            Recharger la console
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="px-5 py-3 rounded-xl border border-white/20 text-white text-sm"
          >
            Retour au site
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-5">
          {events.length} événement(s) actuellement disponibles dans cette session.
        </p>
      </div>
      <TicketBatchPrintModal
        isOpen={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </div>
  );
};

class AdminDashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LUMAREEL ADMIN RENDER ERROR]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <AdminDashboardRecovery error={this.state.error} />;
    }
    return this.props.children;
  }
}

export const AdminDashboard: React.FC = () => (
  <AdminDashboardErrorBoundary>
    <AdminDashboardContent />
  </AdminDashboardErrorBoundary>
);
