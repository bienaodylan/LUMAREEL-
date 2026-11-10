import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronRight,
  User,
  Bell,
  Globe,
  LogOut,
  Shield,
  ArrowLeft,
  X,
  Trash2,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/**
 * ProfileView.tsx — Espace Compte & Préférences de l'application LUMARÉEL.
 * Permet de basculer la langue directement (Français / Anglais), de gérer le compte et l'accès Super Admin.
 */
export const ProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, setCurrentPage, setIsAuthModalOpen, showToast, language, setLanguage, t } = useApp();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  const handleLogout = () => {
    setCurrentUser(null);
    showToast(language === 'en' ? 'You have been logged out.' : 'Vous avez été déconnecté.', 'info');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.email) return;
    try {
      setIsDeletingAccount(true);
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la suppression du compte.');
      }

      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
      }

      setCurrentUser(null);
      setShowDeleteConfirm(false);
      showToast('Votre compte a été supprimé avec succès.', 'success');
      setCurrentPage('home');
    } catch (err: any) {
      showToast(err.message || 'Impossible de supprimer le compte.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleToggleLanguage = () => {
    const nextLang = language === 'fr' ? 'en' : 'fr';
    setLanguage(nextLang);
    showToast(nextLang === 'fr' ? 'Langue changée en Français.' : 'Language switched to English.', 'success');
  };

  return (
    <div className="min-h-screen bg-transparent text-white font-agrandir-regular select-none pb-36 pt-6 sm:pt-10 max-w-2xl mx-auto px-4 sm:px-0">
      
      {/* Barre de retour supérieure */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group"
          title="Retourner à l'accueil"
        >
          <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-0.5 transition-transform" />
          <span>RETOUR</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md group"
          title="Fermer et revenir à l'accueil"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>
      
      {/* INFORMATIONS COMPTE ACTIF */}
      <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-agrandir-extrabold text-base text-white shadow-inner">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'LR'}
          </div>
          <div>
            <div className="font-agrandir-bold text-base text-white flex items-center gap-2">
              <span>{currentUser?.name || t('profile.visitor')}</span>
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              {currentUser?.email || t('profile.notConnected')}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCurrentPage('admin')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-bold transition-all cursor-pointer shadow-md active:scale-95"
            title="Accéder à l'espace administrateur"
          >
            <span>Administrateur</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* GROUPE 1 : ESPACE COMPTE */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          {t('profile.accountSpace')}
        </div>

        <button
          type="button"
          onClick={() => {
            if (!currentUser) setIsAuthModalOpen(true);
            else showToast(`${t('orders.account')} ${currentUser.email}`, 'info');
          }}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <User className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              {t('profile.manageAccount')}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Ma LUMARÉEL CARD */}
        <button
          type="button"
          onClick={() => setCurrentPage('card')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-[#d4af37]/10 active:bg-[#d4af37]/20 cursor-pointer transition-colors text-left border-t border-white/5 group"
        >
          <div className="flex items-center gap-3.5">
            <Crown className="w-5 h-5 text-[#d4af37] stroke-[1.8]" />
            <div>
              <span className="text-sm font-agrandir-bold text-white group-hover:text-[#d4af37] transition-colors block">
                Ma LUMARÉEL CARD
              </span>
              <span className="text-[10px] text-neutral-400 font-mono block">
                Founders Edition · Carte PVC Gravée &amp; Privilèges
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#d4af37] group-hover:translate-x-0.5 transition-transform" />
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCurrentPage('admin')}
            className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left border-t border-white/5"
          >
            <div className="flex items-center gap-3.5">
              <Shield className="w-5 h-5 text-white stroke-[1.8]" />
              <span className="text-sm font-agrandir-regular text-white">
                Administrateur
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
        )}
      </div>

      {/* GROUPE 2 : PRÉFÉRENCES */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          {t('profile.preferences')}
        </div>

        {/* Notifications */}
        <button
          type="button"
          onClick={() => showToast(language === 'en' ? 'Push notifications active.' : 'Notifications et alertes push actives.', 'info')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <Bell className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              {t('profile.notifications')}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500" />
        </button>

        {/* Langue interactive */}
        <button
          type="button"
          onClick={handleToggleLanguage}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
        >
          <div className="flex items-center gap-3.5">
            <Globe className="w-5 h-5 text-white stroke-[1.8]" />
            <span className="text-sm font-agrandir-regular text-white">
              {t('profile.language')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#d4af37] font-agrandir-bold">
              {language === 'fr' ? 'Français' : 'English'}
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </div>
        </button>
      </div>

      {/* GROUPE 3 : CONNEXION */}
      <div className="pt-6">
        <div className="px-6 pb-2 text-[11px] font-agrandir-bold tracking-widest text-[#888] uppercase">
          Session
        </div>

        {currentUser ? (
          <>
            <button
              type="button"
              onClick={handleLogout}
              className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left text-neutral-300 hover:text-white"
            >
              <div className="flex items-center gap-3.5">
                <LogOut className="w-5 h-5 text-neutral-400 stroke-[1.8]" />
                <span className="text-sm font-agrandir-regular">
                  {t('profile.logout')}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>

            {/* Zone de Danger : Suppression du compte */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="px-6 pb-2 text-[10px] font-agrandir-bold tracking-widest text-rose-500/80 uppercase">
                Zone sensible
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentUser.email?.toLowerCase() === 'bienaodylan428@gmail.com') {
                    showToast('Le compte fondateur est protégé contre la suppression.', 'info');
                    return;
                  }
                  setShowDeleteConfirm(true);
                }}
                className="flex justify-between items-center w-full py-4 px-6 hover:bg-rose-500/10 active:bg-rose-500/20 cursor-pointer transition-colors text-left text-rose-400 group"
              >
                <div className="flex items-center gap-3.5">
                  <Trash2 className="w-5 h-5 text-rose-400 stroke-[1.8] group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-sm font-agrandir-bold text-rose-400">
                      Supprimer mon compte
                    </span>
                    <p className="text-[11px] text-rose-400/60 font-agrandir-regular">
                      Supprime définitivement votre compte et vos données
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400/50" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <User className="w-5 h-5 text-white stroke-[1.8]" />
              <span className="text-sm font-agrandir-regular text-white">
                Se connecter
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
        )}
      </div>

      {/* MODAL DE CONFIRMATION DE SUPPRESSION DE COMPTE */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight">
                  Supprimer votre compte ?
                </h3>
                <p className="text-[11px] text-rose-400/80 font-mono">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-agrandir-regular">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte LUMARÉEL ? Cette action est irréversible et supprimera l'ensemble de votre profil.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 rounded-full border border-white/15 hover:border-white text-xs font-agrandir-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingAccount ? (
                  <span>Suppression...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmer la suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
