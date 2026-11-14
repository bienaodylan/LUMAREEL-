import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ChevronRight,
  ChevronDown,
  User,
  Bell,
  BellRing,
  BellOff,
  Globe,
  LogOut,
  Shield,
  ArrowLeft,
  X,
  Trash2,
  AlertTriangle,
  Crown,
  Heart,
  Clock,
  CheckCircle2,
  Send,
  Calendar,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { formatDateLong } from '../utils/dateUtils';
import { getAuthHeaders, clearLocalAuthToken } from '../utils/authSession';
import { getConcertReminderInfo, parseConcertStartTimestamp } from '../utils/concertNotifications';

/**
 * ProfileView.tsx — Espace Compte & Préférences de l'application LUMARÉEL.
 * Permet de basculer la langue directement (Français / Anglais), de gérer le compte et l'accès Super Admin.
 */
export const ProfileView: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    setCurrentPage,
    setIsAuthModalOpen,
    showToast,
    language,
    setLanguage,
    t,
    events,
    setSelectedEventSlug,
    favoriteEventIds,
    toggleFavoriteEvent,
    notificationsEnabled,
    setNotificationsEnabled,
    notificationPermission,
    refreshNotificationPermission,
    requestNotificationPermission,
    notifiedEventIds,
    sendTestNotification,
  } = useApp();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  useEffect(() => {
    refreshNotificationPermission();
  }, [refreshNotificationPermission]);

  const favoritedEvents = events
    .filter((evt) => favoriteEventIds.includes(evt.id))
    .sort((a, b) => {
      const tsA = parseConcertStartTimestamp(a.date, a.time) ?? Number.MAX_SAFE_INTEGER;
      const tsB = parseConcertStartTimestamp(b.date, b.time) ?? Number.MAX_SAFE_INTEGER;
      return tsA - tsB;
    });

  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        showToast(
          language === 'en'
            ? 'Browser push notifications authorized! 30-min alerts active.'
            : 'Notifications push autorisées ! Vos rappels 30 min avant sont actifs.',
          'success'
        );
      } else if (result === 'denied') {
        showToast(
          language === 'en'
            ? 'Permission denied by browser. Follow the guide below to unblock.'
            : 'Permission refusée par le navigateur. Suivez le guide ci-dessous pour débloquer.',
          'error'
        );
      } else if (result === 'unsupported') {
        showToast(
          language === 'en'
            ? 'System push not supported here; in-app alerts remain active.'
            : 'Push système non supporté ici ; les alertes dans l’application restent actives.',
          'info'
        );
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    showToast(
      next
        ? language === 'en'
          ? '30-minute concert reminders enabled.'
          : 'Rappels 30 minutes avant vos concerts activés.'
        : language === 'en'
        ? '30-minute concert reminders paused.'
        : 'Rappels concerts mis en pause.',
      'info'
    );
  };

  const permissionBadge = (() => {
    if (notificationPermission === 'granted') {
      return {
        label: language === 'en' ? 'Authorized' : 'Autorisées',
        cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
      };
    }
    if (notificationPermission === 'denied') {
      return {
        label: language === 'en' ? 'Blocked' : 'Bloquées',
        cls: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      };
    }
    if (notificationPermission === 'unsupported') {
      return {
        label: language === 'en' ? 'In-app only' : 'In-app uniquement',
        cls: 'bg-zinc-500/15 border-white/15 text-neutral-300',
      };
    }
    return {
      label: language === 'en' ? 'Permission needed' : 'À autoriser',
      cls: 'bg-[#d4af37]/15 border-[#d4af37]/40 text-[#d4af37]',
    };
  })();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const handleLogout = async () => {
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch {
      // ignore network error on logout
    }
    clearLocalAuthToken();
    setCurrentUser(null);
    showToast(language === 'en' ? 'You have been logged out.' : 'Vous avez été déconnecté.', 'info');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    if (!deletePassword) {
      showToast('Veuillez saisir votre mot de passe actuel pour confirmer.', 'error');
      return;
    }
    try {
      setIsDeletingAccount(true);
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        credentials: 'include',
        headers,
        body: JSON.stringify({ password: deletePassword }),
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

      clearLocalAuthToken();
      setCurrentUser(null);
      setDeletePassword('');
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

        {/* Notifications Push Locales & Gestion des permissions */}
        <div className="border-b border-white/5">
          <button
            type="button"
            onClick={() => setShowNotificationsPanel((prev) => !prev)}
            className="flex justify-between items-center w-full py-4 px-6 hover:bg-white/5 active:bg-white/10 cursor-pointer transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              {notificationsEnabled ? (
                <BellRing className="w-5 h-5 text-[#d4af37] stroke-[1.8]" />
              ) : (
                <BellOff className="w-5 h-5 text-neutral-400 stroke-[1.8]" />
              )}
              <div>
                <span className="text-sm font-agrandir-regular text-white block">
                  {t('profile.notifications')} · Rappel 30 min
                </span>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  {favoritedEvents.length > 0
                    ? `${favoritedEvents.length} concert${favoritedEvents.length > 1 ? 's' : ''} en favori`
                    : 'Alertes locales avant vos concerts favoris'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-agrandir-bold uppercase tracking-wider ${permissionBadge.cls}`}>
                {permissionBadge.label}
              </span>
              {showNotificationsPanel ? (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              )}
            </div>
          </button>

          {showNotificationsPanel && (
            <div className="px-6 pb-6 pt-2 space-y-4 bg-white/[0.02]">
              {/* Bloc 1 : Permissions navigateur + Test + Interrupteur */}
              <div className="rounded-2xl bg-[#101010] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-agrandir-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Alertes 30 min avant le concert</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">
                      Recevez une notification push locale 30 minutes avant l’heure de début de chacun de vos concerts ajoutés aux favoris.
                    </p>
                  </div>

                  {/* Interrupteur ON / OFF */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notificationsEnabled}
                    aria-label="Activer les alertes 30 minutes avant le concert"
                    onClick={handleToggleNotifications}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none ${
                      notificationsEnabled
                        ? 'bg-[#d4af37] border-[#d4af37]'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow transition duration-200 mt-[3px] ${
                        notificationsEnabled ? 'translate-x-5 ml-0.5 bg-black' : 'translate-x-1 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* État des permissions système / navigateur */}
                <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-neutral-300 flex items-center gap-2">
                    <span className="text-neutral-500 uppercase font-agrandir-semibold tracking-wider text-[10px]">
                      Navigateur :
                    </span>
                    {notificationPermission === 'granted' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-300 font-agrandir-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Notifications push autorisées
                      </span>
                    ) : notificationPermission === 'denied' ? (
                      <span className="text-rose-300 font-agrandir-bold">
                        Autorisation bloquée par le navigateur
                      </span>
                    ) : notificationPermission === 'unsupported' ? (
                      <span className="text-neutral-300 font-agrandir-semibold">
                        Mode aperçu intégré actif
                      </span>
                    ) : (
                      <span className="text-[#d4af37] font-agrandir-bold">
                        En attente d’autorisation
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {notificationPermission === 'default' && (
                      <button
                        type="button"
                        onClick={handleRequestPermission}
                        disabled={isRequestingPermission}
                        className="px-3.5 py-2 rounded-full bg-[#d4af37] hover:bg-[#e5c158] text-black font-agrandir-extrabold text-[10px] uppercase tracking-wider cursor-pointer transition-all active:scale-95 disabled:opacity-60"
                      >
                        {isRequestingPermission ? 'Demande...' : 'Autoriser les notifications'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        void sendTestNotification();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-agrandir-bold text-white uppercase tracking-wider cursor-pointer transition-all active:scale-95"
                    >
                      <Send className="w-3 h-3 text-[#d4af37]" />
                      <span>Tester l’alerte</span>
                    </button>
                  </div>
                </div>

                {/* Guide de déblocage si permission refusée */}
                {notificationPermission === 'denied' && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3 text-[11px] text-rose-200 leading-relaxed space-y-1">
                    <div className="font-agrandir-bold text-rose-300 uppercase text-[10px] tracking-wider">
                      Comment réactiver les alertes système :
                    </div>
                    <p>
                      Cliquez sur l’icône de cadenas ou de paramètres à gauche de la barre d’adresse de votre navigateur, passez « Notifications » sur <strong>Autoriser</strong>, puis rechargez la page. Les rappels visuels dans l’application restent actifs en attendant.
                    </p>
                  </div>
                )}
              </div>

              {/* Bloc 2 : Liste des concerts favoris et heure exacte du rappel */}
              <div className="rounded-2xl bg-[#101010] border border-white/10 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-agrandir-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5 fill-[#d4af37] text-[#d4af37]" />
                    <span>Concerts favoris &amp; rappels (-30 min)</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {favoritedEvents.length} suivi{favoritedEvents.length > 1 ? 's' : ''}
                  </span>
                </div>

                {favoritedEvents.length === 0 ? (
                  <div className="py-5 text-center space-y-3 border-t border-white/5">
                    <p className="text-xs text-neutral-400">
                      Aucun concert ajouté aux favoris pour le moment. Cliquez sur le cœur sur un concert pour programmer son alerte 30 min avant le début.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('discover')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-agrandir-bold text-[10px] uppercase tracking-wider cursor-pointer hover:bg-neutral-200 transition-colors"
                    >
                      Découvrir les concerts
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {favoritedEvents.map((evt) => {
                      const info = getConcertReminderInfo(
                        evt,
                        notifiedEventIds,
                        notificationsEnabled,
                        notificationPermission
                      );

                      const statusConfig = {
                        scheduled: {
                          text: `Push à ${info.reminderTimeLabel}`,
                          cls: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
                        },
                        scheduled_inapp: {
                          text: `Rappel à ${info.reminderTimeLabel}`,
                          cls: 'bg-[#d4af37]/15 border-[#d4af37]/35 text-[#d4af37]',
                        },
                        imminent: {
                          text: 'Début < 30 min',
                          cls: 'bg-[#d4af37]/25 border-[#d4af37] text-[#d4af37]',
                        },
                        sent: {
                          text: 'Alerte envoyée',
                          cls: 'bg-white/10 border-white/20 text-neutral-200',
                        },
                        paused: {
                          text: 'En pause',
                          cls: 'bg-white/5 border-white/10 text-neutral-400',
                        },
                        past: {
                          text: 'Concert passé',
                          cls: 'bg-white/5 border-white/10 text-neutral-500',
                        },
                      }[info.status];

                      return (
                        <div
                          key={evt.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-black/50 border border-white/10 hover:border-white/25 transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventSlug(evt.slug);
                              setCurrentPage('concert_detail');
                            }}
                            className="text-left flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="text-xs font-agrandir-extrabold text-white uppercase truncate">
                              {evt.artist} EN CONCERT
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-neutral-400 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-[#d4af37]" />
                                {formatDateLong(evt.date, language)}
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono text-neutral-300">
                                <Clock className="w-3 h-3 text-[#d4af37]" />
                                Début {evt.time}
                              </span>
                              <span className="truncate text-neutral-500">{evt.venue}</span>
                            </div>
                          </button>

                          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-agrandir-bold uppercase tracking-wider ${statusConfig.cls}`}>
                              {statusConfig.text}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteEvent(evt.id)}
                              title="Retirer des favoris"
                              aria-label={`Retirer ${evt.artist} des favoris`}
                              className="p-2 rounded-full bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-neutral-400 hover:text-rose-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
                  setDeletePassword('');
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

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-neutral-400 mb-1.5 font-agrandir-semibold">
                Mot de passe actuel *
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Confirmez avec votre mot de passe"
                className="w-full bg-[#181818] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setDeletePassword('');
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeletingAccount}
                className="px-4 py-2.5 rounded-full border border-white/15 hover:border-white text-xs font-agrandir-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !deletePassword}
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
