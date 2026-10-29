import React from 'react';
import { 
  LayoutDashboard, 
  Ticket, 
  ShoppingBag, 
  Film, 
  Mail, 
  Settings, 
  ExternalLink, 
  Shield, 
  ArrowLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type AdminSection = 'overview' | 'events' | 'orders' | 'archives' | 'emails' | 'settings';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  selectedEventId: string | null;
  selectedEventTitle?: string;
  onClearSelectedEvent: () => void;
  eventsCount: number;
  ordersCount: number;
  archivesCount: number;
  onExitAdmin: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
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
  onExitAdmin,
  isMobileOpen,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'overview' as AdminSection,
      label: 'Tableau de bord',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'events' as AdminSection,
      label: 'Concerts & Événements',
      icon: Ticket,
      badge: eventsCount > 0 ? String(eventsCount) : null,
    },
    {
      id: 'orders' as AdminSection,
      label: 'Commandes & Ventes',
      icon: ShoppingBag,
      badge: ordersCount > 0 ? String(ordersCount) : null,
    },
    {
      id: 'archives' as AdminSection,
      label: 'Archives & CMS Vidéo',
      icon: Film,
      badge: archivesCount > 0 ? String(archivesCount) : null,
    },
    {
      id: 'emails' as AdminSection,
      label: 'Journal Transactionnel',
      icon: Mail,
      badge: null,
    },
    {
      id: 'settings' as AdminSection,
      label: 'Paramètres Généraux',
      icon: Settings,
      badge: null,
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
        {/* Brand Header */}
        <div>
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-[#d4af37]/40 flex items-center justify-center font-agrandir-extrabold text-sm text-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]">
                LR
              </div>
              <div className="flex flex-col">
                <span className="font-agrandir-extrabold text-sm tracking-wider uppercase text-white">
                  LUMARÉEL CO.
                </span>
                <span className="text-[9px] font-agrandir-semibold tracking-[0.2em] text-[#d4af37] uppercase">
                  CONSOLE DE GESTION
                </span>
              </div>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-agrandir-semibold text-emerald-400">
              LIVE
            </span>
          </div>

          {/* Quick Return when inside an Event */}
          {selectedEventId && (
            <div className="p-3 mx-3 my-3 rounded-2xl bg-white/5 border border-white/10">
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
                className="w-full py-1.5 px-3 rounded-xl bg-[#141414] hover:bg-white/10 border border-white/10 text-[10px] font-agrandir-semibold text-[#d4af37] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Tous les concerts</span>
              </button>
            </div>
          )}

          {/* Navigation Links Group */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#666] uppercase">
              GESTION CENTRALE
            </div>

            {navItems.map((item) => {
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
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#888]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-agrandir-bold ${
                        isActive
                          ? 'bg-black/10 text-black'
                          : 'bg-white/10 text-[#d4af37]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {/* Link back to public site */}
          <button
            onClick={onExitAdmin}
            className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-white flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Voir le site public</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#666]" />
          </button>

          {/* Admin Identity pill */}
          <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-[#666]">
            <span>SUPER ADMIN</span>
            <span className="text-[#888]">v2.4 PRO</span>
          </div>
        </div>
      </aside>
    </>
  );
};
