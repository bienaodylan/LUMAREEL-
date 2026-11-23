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
  const { currentUser, setCurrentUser, setCurrentPage, goBack, setIsAuthModalOpen, showToast, language, setLanguage, t } = useApp();

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
      showToast(t('profile.deleteSuccess'), 'success');
      setCurrentPage('home');
    } catch (err: any) {
      showToast(err.message || t('profile.deleteError'), 'error');
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
    <div className="min-h-screen w-full max-w-2xl mx-auto bg-transparent text-white font-agrandir-regular select-none pb-20 pt-4 sm:pt-10 px-4 sm:px-6 overflow-x-clip">
      {/* INFORMATIONS COMPTE ACTIF */}
      <div className="px-2 sm:px-4 py-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-full bg-white/10 border border-white/15 flex items-center justify-center font-agrandir-extrabold text-sm text-white shadow-inner shrink-0">
            {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'LR'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-agrandir-bold text-sm sm:text-base text-white truncate">
              {currentUser?.name || t('profile.visitor')}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5 truncate">
              {currentUser?.email || t('profile.notConnected')}
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setCurrentPage('admin')}
            className="min-h-[40px] flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-bold transition-all cursor-pointer shadow-md active:scale-95 shrink-0"
            title={t('nav.admin')}
          >
            <span>{t('nav.admin')}</span>
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

        {/* Ma LUMARÉEL Black Card */}
        <button
          type="button"
          onClick={() => setCurrentPage('card')}
          className="flex justify-between items-center w-full py-4 px-6 hover:bg-[#d4af37]/10 active:bg-[#d4af37]/20 cursor-pointer transition-colors text-left border-t border-white/5 group"
        >
          <div className="flex items-center gap-3.5">
            <Crown className="w-5 h-5 text-[#d4af37] stroke-[1.8]" />
            <div>
              <span className="text-sm font-agrandir-bold text-white group-hover:text-[#d4af37] transition-colors block">
                {t('profile.myCard')}
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
                {t('nav.admin')}
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
          {t('profile.session')}
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
                {t('profile.sensitiveZone')}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (currentUser.email?.toLowerCase() === 'bienaodylan428@gmail.com') {
                    showToast(t('profile.founderProtected'), 'info');
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
                      {t('profile.deleteAccount')}
                    </span>
                    <p className="text-[11px] text-rose-400/60 font-agrandir-regular">
                      {t('profile.deleteAccountDesc')}
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
                {t('profile.login')}
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
                  {t('profile.deleteTitle')}
                </h3>
                <p className="text-[11px] text-rose-400/80 font-mono">
                  {currentUser?.email}
                </p>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-agrandir-regular">
              {t('profile.deleteConfirm')}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 rounded-full border border-white/15 hover:border-white text-xs font-agrandir-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                {t('profile.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount}
                className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingAccount ? (
                  <span>{t('profile.deleting')}</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('profile.confirmDelete')}</span>
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
