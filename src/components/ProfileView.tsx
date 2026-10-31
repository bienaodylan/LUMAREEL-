import React from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronRight,
  User,
  Bell,
  Globe,
  Coins,
  UserPlus,
  LogOut,
  Shield,
  Sparkles
} from 'lucide-react';

/**
 * ProfileView.tsx — Espace Compte & Préférences de l'application mobile LUMARÉEL.
 * Conçu sans flèche retour supérieure (intégration native avec la barre de navigation flottante).
 * Affiche l'identité du compte, l'accès réservé Super Admin, les préférences et la gestion de session.
 */
export const ProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, setCurrentPage, setIsAuthModalOpen, showToast } = useApp();

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Vous avez été déconnecté.', 'info');
  };

  return (
    <div className="min-h-screen bg-black text-white font-agrandir-regular select-none pb-36 pt-8 sm:pt-12 max-w-2xl mx-auto">
      
      {/* INFORMATIONS COMPTE ACTIF (Épuré sans boîte) */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-agrandir-extrabold text-base text-white shadow-inner">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'LR'}
          </div>
          <div>
            <div className="font-agrandir-bold text-base text-white flex items-center gap-2">
              <span>{currentUser?.name || 'Visiteur'}</span>
              {isSuperAdmin && (
                <span className="text-[10px] font-agrandir-extrabold text-[#d4af37] px-2 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 uppercase tracking-wider">
                  Super Admin
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              {currentUser?.email || 'Non connecté'}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCurrentPage('admin')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/30 text-xs font-agrandir-bold text-[#d4af37] hover:bg-[#d4af37]/20 transition-all cursor-pointer uppercase tracking-wider"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* GROUPE 1 : ESPACE COMPTE */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          Espace Compte
        </div>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else showToast(`Compte actif : ${currentUser.email}`, 'info');
          }}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <User className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              Gérer mon compte
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      {/* GROUPE 2 : PRÉFÉRENCES */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          Préférences
        </div>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => showToast('Notifications billetterie et alertes push actives.', 'info')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <Bell className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              Notifications
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Langue */}
        <button
          type="button"
          onClick={() => showToast('Langue actuelle : Français (Afrique / Europe).', 'info')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <Globe className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              Langue
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-agrandir-regular">
              Français
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
        </button>

        {/* Devise */}
        <button
          type="button"
          onClick={() => showToast('Devise de billetterie officielle : Francs CFA (FCFA).', 'info')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <Coins className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              Devise
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-agrandir-regular">
              Francs CFA (FCFA)
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
        </button>
      </div>

      {/* GROUPE 3 : CONNEXION */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          Connexion
        </div>

        {/* Ajouter un compte */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(true)}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <UserPlus className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              Ajouter un compte
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Se déconnecter */}
        {currentUser && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex justify-between items-center w-full py-4 px-6 hover:bg-rose-950/20 active:bg-rose-950/40 cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <LogOut className="w-5 h-5 text-rose-500 stroke-[1.8]" />
              <span className="text-sm font-agrandir-regular text-rose-500">
                Se déconnecter
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-500/50" />
          </button>
        )}
      </div>

    </div>
  );
};
