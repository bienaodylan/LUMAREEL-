import React from 'react';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  Ticket, 
  ShoppingBag, 
  Film, 
  Mail, 
  ExternalLink, 
  ArrowLeft,
  ChevronRight,
  Printer,
  Crown,
  Cpu,
  Camera,
  Sliders,
  FolderOpen,
  Images,
  Gift
} from 'lucide-react';

export type AdminSection =
  | 'overview'
  | 'cms'
  | 'media_library'
  | 'events'
  | 'souvenirs'
  | 'loyalty'
  | 'membership'
  | 'workshop'
  | 'orders'
  | 'media'
  | 'archives'
  | 'emails';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  selectedEventId: string | null;
  selectedEventTitle?: string;
  onClearSelectedEvent: () => void;
  eventsCount: number;
  ordersCount: number;
  archivesCount: number;
  pendingMediaCount?: number;
  onExitAdmin: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenBatchPrint?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSelectSection,
  selectedEventId,
  selectedEventTitle,
  onClearSelectedEvent,
  eventsCount,
  ordersCount,
  archivesCount,
  pendingMediaCount = 0,
  onExitAdmin,
  isMobileOpen,
  onCloseMobile,
  onOpenBatchPrint,
}) => {
  const { platformSettings } = useApp();

  const navGroups: {
    heading: string;
    items: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; badge: string | null }[];
  }[] = [
    {
      heading: 'PILOTAGE',
      items: [
        { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard, badge: null },
        { id: 'events', label: 'Concerts & Billetterie', icon: Ticket, badge: eventsCount > 0 ? String(eventsCount) : null },
        { id: 'orders', label: 'Commandes & Ventes', icon: ShoppingBag, badge: ordersCount > 0 ? String(ordersCount) : null },
      ],
    },
    {
      heading: 'CONTENU & MÉDIAS',
      items: [
        { id: 'cms', label: 'CMS · Accueil & LUMARÉEL Black Card', icon: Sliders, badge: 'LIVE' },
        { id: 'media_library', label: 'Médiathèque Centrale', icon: FolderOpen, badge: null },
        { id: 'souvenirs', label: 'Souvenirs & Collections', icon: Images, badge: null },
        { id: 'archives', label: 'Archives & Vidéos', icon: Film, badge: archivesCount > 0 ? String(archivesCount) : null },
      ],
    },
    {
      heading: 'CLUB & FIDÉLITÉ',
      items: [
        { id: 'loyalty', label: 'Gift Points & Parrainage', icon: Gift, badge: 'AUTO' },
        { id: 'media', label: 'Club · Communauté & Backstage', icon: Camera, badge: pendingMediaCount > 0 ? `${pendingMediaCount}` : null },
        { id: 'membership', label: 'Adhésions & Membres', icon: Crown, badge: null },
        { id: 'workshop', label: 'Atelier Cartes & NFC', icon: Cpu, badge: 'DESFire' },
      ],
    },
    {
      heading: 'COMMUNICATION',
      items: [
        { id: 'emails', label: 'Journal Transactionnel', icon: Mail, badge: null },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-[#090909] border-r border-white/10 z-50 flex flex-col justify-between transition-transform duration-300 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header & Scrollable Nav */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col gap-1.5 min-w-0">
              <img
                src="/assets/logo-lumareel.png"
                alt={platformSettings.platformName || 'LUMARÉEL CO.'}
                className="h-7 w-auto object-contain"
              />
              <span className="text-[9px] font-agrandir-semibold tracking-[0.2em] text-neutral-400 uppercase">
                CONSOLE DE GESTION
              </span>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-agrandir-semibold text-emerald-400 shrink-0">
              LIVE
            </span>
          </div>

          {/* Quick Return when inside an Event */}
          {selectedEventId && (
            <div className="p-3 mx-3 my-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
              <div className="text-[9px] font-agrandir-semibold tracking-wider text-[#888] uppercase mb-1">
                ÉVÉNEMENT ACTIF
              </div>
              <div className="text-xs font-agrandir-extrabold text-white truncate mb-2">
                {selectedEventTitle || 'Concert sélectionné'}
              </div>
              <button
                onClick={() => {
                  onClearSelectedEvent();
                  onSelectSection('events');
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-[#141414] hover:bg-white/10 border border-white/10 text-[10px] font-agrandir-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Tous les concerts</span>
              </button>
            </div>
          )}

          {/* Navigation Links Groups */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {navGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <div className="px-3 py-1 text-[9px] font-agrandir-semibold tracking-[0.2em] text-[#666] uppercase">
                  {group.heading}
                </div>

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id && !selectedEventId;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onClearSelectedEvent();
                        onSelectSection(item.id);
                        onCloseMobile();
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-agrandir-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white text-black shadow-lg font-agrandir-extrabold'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-black' : 'text-[#888]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-agrandir-bold shrink-0 ${
                            isActive
                              ? 'bg-black/10 text-black'
                              : 'bg-white/10 text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* Quick Action: Batch print physical tickets */}
          {onOpenBatchPrint && (
            <button
              type="button"
              onClick={() => {
                onOpenBatchPrint();
                onCloseMobile();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-xs font-agrandir-bold text-white flex items-center justify-between transition-colors cursor-pointer group"
              title="Générer et imprimer des planches de billets physiques"
            >
              <div className="flex items-center gap-2">
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>Impression Billets</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}

          {/* Link back to public site */}
          <button
            onClick={onExitAdmin}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-white flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-neutral-300" />
              <span>Voir le site public</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#666]" />
          </button>
        </div>
      </aside>
    </>
  );
};
