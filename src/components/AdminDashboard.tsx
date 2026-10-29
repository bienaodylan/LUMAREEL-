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
import { Plus, X } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    events, 
    refreshEvents, 
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

  // Backend Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [emails, setEmails] = useState<TransactionalEmail[]>([]);

  // New Event Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEventArtist, setNewEventArtist] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-12-25');
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

  // Save Event Handler (persists via PUT /api/events/:id and refreshes app context)
  const handleSaveEvent = async (updatedEvent: ConcertEvent) => {
    const res = await fetch(`/api/events/${updatedEvent.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedEvent),
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Erreur lors de la sauvegarde');
    }

    await refreshEvents();
  };

  // Delete Event Handler (deletes via DELETE /api/events/:id)
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }
      await refreshEvents();
      setSelectedEventId(null);
      setCurrentSection('events');
      showToast('Concert supprimé avec succès.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la suppression.', 'error');
    }
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
          currency: 'XOF' as const,
          quota: 3000,
          sold: 0,
          description: 'Accès fosse générale',
          perks: ['Entrée standard'],
        },
        {
          id: `cat_vip_${Date.now()}`,
          name: 'PASS VIP',
          price: 25000,
          currency: 'XOF' as const,
          quota: 800,
          sold: 0,
          description: 'Tribune VIP avec place assise et cocktail',
          perks: ['Coupe-file', 'Tribune assise'],
        },
      ];

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artist: newEventArtist.trim(),
          title: newEventTitle.trim(),
          subtitle: `En concert exceptionnel · ${newEventVenue}`,
          date: newEventDate,
          time: '18:00',
          doorsOpen: '16:30',
          venue: newEventVenue,
          city: newEventCity,
          country: 'Côte d’Ivoire',
          address: newEventVenue,
          description: `Production et scénographie officielle signée LUMARÉEL CO.`,
          artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
          officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
          bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
          status: 'published',
          isFeatured: true,
          genre: 'Concert Live',
          infoline: '+225 01 53 508 210',
          categories: defaultCategories,
        }),
      });

      const data = await res.json();
      if (data.success && data.event) {
        await refreshEvents();
        showToast(`Concert "${data.event.artist}" créé avec succès !`, 'success');
        setIsCreateModalOpen(false);
        // Navigate directly to Level 3 individual workspace for this new event
        setSelectedEventId(data.event.id);
        setCurrentSection('events');
      }
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la création du concert', 'error');
    }
  };

  const handlePreviewPublic = (slug: string) => {
    setSelectedEventSlug(slug);
    setCurrentPage('concert_detail');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex select-none font-agrandir-regular">
      
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

    </div>
  );
};
