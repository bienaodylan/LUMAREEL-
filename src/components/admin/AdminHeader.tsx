import React from 'react';
import { Menu, Plus, ChevronRight, ExternalLink, QrCode } from 'lucide-react';
import { AdminSection } from './AdminSidebar';

interface AdminHeaderProps {
  currentSection: AdminSection;
  selectedEventTitle?: string;
  eventSubTab?: string;
  onOpenMobileMenu: () => void;
  onCreateEventClick?: () => void;
  onNavigateScanner?: () => void;
  onNavigatePublic?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentSection,
  selectedEventTitle,
  eventSubTab,
  onOpenMobileMenu,
  onCreateEventClick,
  onNavigateScanner,
  onNavigatePublic,
}) => {
  const getSectionTitle = () => {
    switch (currentSection) {
      case 'overview':
        return 'Tableau de bord';
      case 'events':
        return 'Concerts & Événements';
      case 'orders':
        return 'Commandes & Ventes';
      case 'archives':
        return 'Archives & CMS Vidéo';
      case 'emails':
        return 'Journal Transactionnel';
      case 'settings':
        return 'Paramètres';
      default:
        return 'Administration';
    }
  };

  const getSubTabLabel = () => {
    switch (eventSubTab) {
      case 'overview': return 'Vue générale';
      case 'details': return 'Informations';
      case 'media': return 'Médias & Visuels';
      case 'tickets': return 'Billetterie & Tarifs';
      case 'orders': return 'Commandes';
      case 'analytics': return 'Statistiques';
      case 'settings': return 'Paramètres';
      default: return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#060606]/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      
      {/* Left: Mobile hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10"
          aria-label="Menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Hierarchical Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-xs font-agrandir-regular">
          <span className="text-[#666]">Administration</span>
          <ChevronRight className="w-3 h-3 text-[#444]" />

          {selectedEventTitle ? (
            <>
              <span className="text-[#888]">Événements</span>
              <ChevronRight className="w-3 h-3 text-[#444]" />
              <span className="text-white font-agrandir-bold truncate max-w-[140px] sm:max-w-[220px]">
                {selectedEventTitle}
              </span>
              {eventSubTab && (
                <>
                  <ChevronRight className="w-3 h-3 text-[#444]" />
                  <span className="text-[#d4af37] font-agrandir-semibold">
                    {getSubTabLabel()}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-white font-agrandir-bold">
              {getSectionTitle()}
            </span>
          )}
        </nav>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2.5">
        {onNavigateScanner && (
          <button
            onClick={onNavigateScanner}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-white transition-colors cursor-pointer"
            title="Ouvrir le terminal vigile"
          >
            <QrCode className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Scanner Portes</span>
          </button>
        )}

        {onCreateEventClick && (
          <button
            onClick={onCreateEventClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Créer un événement</span>
          </button>
        )}
      </div>

    </header>
  );
};
