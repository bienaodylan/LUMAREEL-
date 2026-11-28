import React, { useEffect, useMemo, useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import {
  ChevronRight,
  Bell,
  Globe,
  LogOut,
  Shield,
  Trash2,
  AlertTriangle,
  Crown,
  Award,
  HelpCircle,
  Ticket,
  User as UserIcon,
  Phone,
  Lock,
  History,
  SlidersHorizontal,
  ScanLine,
  Maximize2,
  Moon,
  Sun,
} from 'lucide-react';
import {
  computeUserPointsSummary,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import {
  enterMobileFullscreen,
  exitMobileFullscreen,
  isMobileFullscreenEnabled,
  setMobileFullscreenEnabled,
} from '../utils/mobileFullscreen';
import { BottomSheet } from './ui/LumareelKit';

const NOTIF_STORAGE_KEY = 'lumareel_notifications_enabled_v1';

type ProfileSheetType = null | 'info' | 'contact' | 'security' | 'prefs' | 'history';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    setCurrentUser,
    setCurrentPage,
    setIsAuthModalOpen,
    showToast,
    language,
    setLanguage,
    theme,
    setTheme,
    t,
  } = useApp();

  const isEn = language === 'en';
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ProfileSheetType>(null);

  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [cityInput, setCityInput] = useState(pointsState.profileDetails?.city || 'Abidjan');
  const [phoneInput, setPhoneInput] = useState(pointsState.profileDetails?.phone || '');
  const [favoriteGenre, setFavoriteGenre] = useState(
    pointsState.profileDetails?.favoriteGenre || 'Afrobeats · Rap Ivoire'
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  });

  const [mobileFullscreenOn, setMobileFullscreenOn] = useState<boolean>(() =>
    isMobileFullscreenEnabled()
  );

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, String(notificationsEnabled));
    } catch {}
  }, [notificationsEnabled]);

  const pointsSummary = computeUserPointsSummary(currentUser, customerOrders, pointsState);
  const activeBlackCard = loadStoredMemberCard(currentUser?.email);

  const activeTicketsCount = useMemo(() => {
    let count = 0;
    (customerOrders || []).forEach((ord) => {
      if (ord.paymentStatus === 'completed' && ord.tickets) {
        count += ord.tickets.filter((tk) => tk.status === 'valid').length;
      }
    });
    return count;
  }, [customerOrders]);

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';
  const isGateAgent = isSuperAdmin || currentUser?.role === 'gate_agent';

  const displayName = String(currentUser?.name || t('profile.visitor'));
  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase() || '')
      .join('') || 'LR';

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const next = {
      ...pointsState,
      profileCompleted: true,
      profileDetails: {
        city: cityInput.trim() || 'Abidjan',
        phone: phoneInput.trim(),
        favoriteGenre: favoriteGenre.trim(),
      },
    };
    setPointsState(next);
    saveUserPointsState(currentUser, next);
    setActiveSheet(null);
    showToast(isEn ? 'Saved!' : 'C’est enregistré !', 'success');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast(isEn ? 'Signed out.' : 'Tu es déconnecté.', 'info');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser?.email) return;
    try {
      setIsDeletingAccount(true);
      await new Promise((resolve) => setTimeout(resolve, 350));
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

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    showToast(
      next
        ? isEn
          ? 'Concert alerts enabled.'
          : 'Alertes activées.'
        : isEn
        ? 'Alerts paused.'
        : 'Alertes en pause.',
      'info'
    );
  };

  const handleToggleMobileFullscreen = async () => {
    const next = !mobileFullscreenOn;
    setMobileFullscreenOn(next);
    setMobileFullscreenEnabled(next);
    if (next) {
      await enterMobileFullscreen();
      showToast(
        isEn ? 'Mobile fullscreen enabled.' : 'Plein écran mobile activé.',
        'success'
      );
    } else {
      await exitMobileFullscreen();
      showToast(
        isEn ? 'Mobile fullscreen disabled.' : 'Plein écran mobile désactivé.',
        'info'
      );
    }
  };

  const assistanceItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    ...(isGateAgent
      ? [
          {
            label: isEn ? 'Ticket Scanner' : 'Scanner billets',
            page: 'gate_scanner' as PageView,
            icon: ScanLine,
          },
        ]
      : []),
    {
      label: isEn ? 'Help & Contact' : 'Besoin d’aide ?',
      page: 'contact',
      icon: HelpCircle,
    },
  ];

  return (
    <div
      className="min-h-screen w-full max-w-3xl mx-auto px-5 sm:px-8 pb-24 bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white font-agrandir-regular overflow-x-clip transition-colors duration-200"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* 1. IDENTITÉ */}
      <header className="pb-8 sm:pb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#EFEFF4] dark:bg-[#141414] border border-black/[0.08] dark:border-white/[0.16] flex items-center justify-center font-agrandir-extrabold text-base sm:text-lg text-[#111111] dark:text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-[#111111] dark:text-white tracking-tight truncate">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#9A9A9A] truncate mt-0.5">
              {currentUser?.email || (isEn ? 'Guest' : 'Mode invité')}
            </p>
            {activeBlackCard && (
              <p className="mt-1.5 text-xs text-[#111111] dark:text-white font-agrandir-semibold inline-flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 shrink-0" strokeWidth={1.6} />
                <span>
                  LUMARÉEL Black Card · {activeBlackCard.cardNumber || (isEn ? 'Active' : 'Active')}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {!currentUser ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[42px] px-5 rounded-full bg-[#111111] text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs font-agrandir-extrabold transition-colors cursor-pointer lum-press"
            >
              {isEn ? 'Sign in' : 'Me connecter'}
            </button>
          ) : (
            isSuperAdmin && (
              <button
                type="button"
                onClick={() => setCurrentPage('admin')}
                className="min-h-[40px] px-4 rounded-full bg-[#111111] text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer lum-press"
              >
                <Shield className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{t('nav.admin')}</span>
              </button>
            )
          )}
        </div>
      </header>

      <div className="space-y-9">
        {/* 2. MON ESPACE */}
        <section>
          <h2 className="text-[12px] font-medium text-[#6E6E73] dark:text-[#9A9A9A] mb-2">
            {isEn ? 'My space' : 'Mon espace'}
          </h2>
          <div className="border-y border-black/[0.08] dark:border-white/[0.12] divide-y divide-black/[0.08] dark:divide-white/[0.12]">
            <button
              type="button"
              onClick={() => setCurrentPage('member_card')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Crown className="w-4 h-4 text-[#111111] dark:text-white shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                  {isEn ? 'LUMARÉEL Black Card' : 'Ma carte LUMARÉEL'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#9A9A9A] shrink-0">
                <span className={activeBlackCard ? 'text-[#111111] dark:text-white font-agrandir-bold' : ''}>
                  {activeBlackCard
                    ? 'Active'
                    : isEn
                    ? 'Discover'
                    : 'Découvrir'}
                </span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('rewards')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Award className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                  {isEn ? 'Gift Points & Referrals' : 'Mes Gift Points'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#9A9A9A] tabular-nums shrink-0">
                <span className="text-[#111111] dark:text-white font-agrandir-bold">
                  {pointsSummary.availablePoints.toLocaleString('fr-FR')} pts
                </span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('client_space')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Ticket className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                  {isEn ? 'My Tickets' : 'Mes billets'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#9A9A9A] tabular-nums shrink-0">
                <span>
                  {activeTicketsCount}{' '}
                  {isEn
                    ? activeTicketsCount > 1
                      ? 'tickets'
                      : 'ticket'
                    : activeTicketsCount > 1
                    ? 'actifs'
                    : 'actif'}
                </span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
              </span>
            </button>
          </div>
        </section>

        {/* 3. MES INFOS */}
        <section>
          <h2 className="text-[12px] font-medium text-[#6E6E73] dark:text-[#9A9A9A] mb-2">
            {isEn ? 'My info' : 'Mes infos'}
          </h2>
          <div className="border-y border-black/[0.08] dark:border-white/[0.12] divide-y divide-black/[0.08] dark:divide-white/[0.12]">
            {[
              {
                id: 'info' as const,
                icon: UserIcon,
                label: isEn ? 'About me' : 'Infos perso',
                meta: cityInput || 'Abidjan',
              },
              {
                id: 'contact' as const,
                icon: Phone,
                label: isEn ? 'Contact' : 'Coordonnées',
                meta: phoneInput || currentUser?.email || (isEn ? 'Add' : 'Ajouter'),
              },
              {
                id: 'security' as const,
                icon: Lock,
                label: isEn ? 'Security' : 'Sécurité',
                meta: currentUser ? (isEn ? 'Protected' : 'Protégé') : isEn ? 'Guest' : 'Invité',
              },
              {
                id: 'history' as const,
                icon: History,
                label: isEn ? 'Orders' : 'Historique',
                meta: `${customerOrders.length} ${isEn ? 'orders' : 'commandes'}`,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setActiveSheet(row.id)}
                  className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <Icon className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                    <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                      {row.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#9A9A9A] shrink-0 max-w-[140px]">
                    <span className="truncate">{row.meta}</span>
                    <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. PRÉFÉRENCES (Apparence, Langue, Notifications, Préférences musicales) */}
        <section>
          <h2 className="text-[12px] font-medium text-[#6E6E73] dark:text-[#9A9A9A] mb-2">
            {isEn ? 'Preferences' : 'Préférences'}
          </h2>
          <div className="border-y border-black/[0.08] dark:border-white/[0.12] divide-y divide-black/[0.08] dark:divide-white/[0.12]">
            {/* MODE CLAIR / SOMBRE */}
            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                {theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                ) : (
                  <Sun className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                )}
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white">
                  {isEn ? 'Appearance' : 'Apparence'}
                </span>
              </span>
              <div className="flex items-center rounded-full bg-black/[0.05] dark:bg-[#141414] border border-black/[0.08] dark:border-white/[0.12] p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#111111] text-white font-agrandir-extrabold'
                      : 'text-[#6E6E73] dark:text-[#9A9A9A] hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Light' : 'Clair'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`inline-flex items-center gap-1.5 min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'text-[#6E6E73] dark:text-[#9A9A9A] hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Dark' : 'Sombre'}</span>
                </button>
              </div>
            </div>

            {/* LANGUE */}
            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                <Globe className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white">
                  {t('profile.language')}
                </span>
              </span>
              <div className="flex items-center rounded-full bg-black/[0.05] dark:bg-[#141414] border border-black/[0.08] dark:border-white/[0.12] p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    language === 'fr'
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                      : 'text-[#6E6E73] dark:text-[#9A9A9A] hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                      : 'text-[#6E6E73] dark:text-[#9A9A9A] hover:text-[#111111] dark:hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveSheet('prefs')}
              className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <SlidersHorizontal className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                  {isEn ? 'Music tastes' : 'Goûts musicaux'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#9A9A9A] shrink-0">
                <span className="truncate max-w-[130px]">{favoriteGenre}</span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
              </span>
            </button>

            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                <Bell className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white">
                  {t('profile.notifications')}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  notificationsEnabled
                    ? 'bg-[#111111] dark:bg-white'
                    : 'bg-black/15 dark:bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white dark:bg-black transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                <Maximize2 className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="min-w-0">
                  <span className="block text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                    {isEn ? 'Mobile fullscreen' : 'Plein écran mobile'}
                  </span>
                  <span className="block text-[11px] text-[#6E6E73] dark:text-[#9A9A9A] truncate">
                    {isEn ? 'Auto fullscreen on launch' : 'S’ouvre en plein écran'}
                  </span>
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={mobileFullscreenOn}
                onClick={handleToggleMobileFullscreen}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  mobileFullscreenOn
                    ? 'bg-[#111111] dark:bg-white'
                    : 'bg-black/15 dark:bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white dark:bg-black transition-transform ${
                    mobileFullscreenOn ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 5. AIDE */}
        <section>
          <h2 className="text-[12px] font-medium text-[#6E6E73] dark:text-[#9A9A9A] mb-2">
            {isEn ? 'Help' : 'Aide'}
          </h2>
          <div className="border-y border-black/[0.08] dark:border-white/[0.12] divide-y divide-black/[0.08] dark:divide-white/[0.12]">
            {assistanceItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setCurrentPage(item.page)}
                  className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer"
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <Icon className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                    <span className="text-sm sm:text-[15px] font-agrandir-semibold text-[#111111] dark:text-white truncate">
                      {item.label}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. SESSION */}
        {currentUser && (
          <section>
            <h2 className="text-[12px] font-medium text-[#6E6E73] dark:text-[#9A9A9A] mb-2">
              {t('profile.session')}
            </h2>
            <div className="border-y border-black/[0.08] dark:border-white/[0.12] divide-y divide-black/[0.08] dark:divide-white/[0.12]">
              <button
                type="button"
                onClick={handleLogout}
                className="group w-full min-h-[54px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer text-[#48484A] dark:text-[#C8C8C8]"
              >
                <span className="flex items-center gap-3.5 text-sm sm:text-[15px] font-agrandir-semibold">
                  <LogOut className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A]" strokeWidth={1.6} />
                  <span>{isEn ? 'Sign out' : 'Me déconnecter'}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#6E6E73] dark:text-[#9A9A9A]" strokeWidth={1.6} />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (currentUser.email?.toLowerCase() === 'bienaodylan428@gmail.com') {
                    showToast(t('profile.founderProtected'), 'info');
                    return;
                  }
                  setShowDeleteConfirm(true);
                }}
                className="w-full min-h-[54px] py-3.5 flex items-center justify-between gap-4 text-left transition-opacity hover:opacity-75 cursor-pointer text-rose-600 dark:text-[#F29AA4]"
              >
                <span className="flex items-center gap-3.5 text-sm sm:text-[15px] font-agrandir-semibold">
                  <Trash2 className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                  <span>{isEn ? 'Delete my account' : 'Supprimer mon compte'}</span>
                </span>
                <ChevronRight className="w-4 h-4 opacity-60 shrink-0" strokeWidth={1.6} />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* BOTTOM SHEETS PROFIL */}
      <BottomSheet
        open={activeSheet === 'info' || activeSheet === 'contact' || activeSheet === 'prefs'}
        onClose={() => setActiveSheet(null)}
        title={
          activeSheet === 'info'
            ? isEn
              ? 'About me'
              : 'Infos perso'
            : activeSheet === 'contact'
            ? isEn
              ? 'Contact'
              : 'Coordonnées'
            : isEn
            ? 'Music tastes'
            : 'Goûts musicaux'
        }
      >
        <form onSubmit={handleSaveDetails} className="space-y-4">
          {activeSheet === 'info' && (
            <>
              <div>
                <label className="block text-xs text-[#6E6E73] dark:text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Full name' : 'Nom complet'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  disabled
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black/[0.04] dark:bg-black/60 border border-black/[0.09] dark:border-white/[0.12] text-sm text-[#6E6E73] dark:text-[#9A9A9A]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6E6E73] dark:text-[#9A9A9A] mb-1.5">
                  {isEn ? 'City' : 'Ville'}
                </label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/[0.16] text-sm text-[#111111] dark:text-white focus:border-[#111111] dark:focus:border-white focus:outline-none"
                />
              </div>
            </>
          )}

          {activeSheet === 'contact' && (
            <>
              <div>
                <label className="block text-xs text-[#6E6E73] dark:text-[#9A9A9A] mb-1.5">Email</label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black/[0.04] dark:bg-black/60 border border-black/[0.09] dark:border-white/[0.12] text-sm text-[#6E6E73] dark:text-[#9A9A9A]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#6E6E73] dark:text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Phone (WhatsApp / Mobile)' : 'Téléphone (WhatsApp / Mobile)'}
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/[0.16] text-sm text-[#111111] dark:text-white focus:border-[#111111] dark:focus:border-white focus:outline-none"
                />
              </div>
            </>
          )}

          {activeSheet === 'prefs' && (
            <div>
              <label className="block text-xs text-[#6E6E73] dark:text-[#9A9A9A] mb-1.5">
                {isEn ? 'Favorite styles' : 'Ce que tu aimes écouter'}
              </label>
              <input
                type="text"
                value={favoriteGenre}
                onChange={(e) => setFavoriteGenre(e.target.value)}
                placeholder="Afrobeats, Rap Ivoire, Acoustique..."
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-black border border-black/15 dark:border-white/[0.16] text-sm text-[#111111] dark:text-white focus:border-[#111111] dark:focus:border-white focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-full bg-[#111111] text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/90 font-agrandir-extrabold text-xs cursor-pointer lum-press"
          >
            {isEn ? 'Save' : 'Enregistrer'}
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'security'}
        onClose={() => setActiveSheet(null)}
        title={isEn ? 'Security' : 'Sécurité'}
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#48484A] dark:text-[#C8C8C8] leading-relaxed">
          <div className="p-4 rounded-[16px] bg-black/[0.04] dark:bg-black border border-black/[0.08] dark:border-white/[0.12] space-y-1">
            <p className="text-[11px] text-[#6E6E73] dark:text-[#9A9A9A]">
              {isEn ? 'Connected email' : 'Adresse connectée'}
            </p>
            <p className="font-agrandir-extrabold text-[#111111] dark:text-white">
              {currentUser?.email || (isEn ? 'Not signed in' : 'Non connecté')}
            </p>
          </div>
          <p className="text-xs text-[#6E6E73] dark:text-[#9A9A9A]">
            {isEn
              ? 'Your tickets and Black Card are safely linked to your account.'
              : 'Tes billets et ta carte sont bien liés à ton compte.'}
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'history'}
        onClose={() => setActiveSheet(null)}
        title={isEn ? 'My orders' : 'Mes commandes'}
      >
        {customerOrders.length === 0 ? (
          <p className="text-xs text-[#6E6E73] dark:text-[#9A9A9A] py-4">
            {isEn ? 'No orders yet.' : 'Tu n’as pas encore de commande.'}
          </p>
        ) : (
          <div className="divide-y divide-black/[0.08] dark:divide-white/[0.12] border-y border-black/[0.08] dark:border-white/[0.12]">
            {customerOrders.slice(0, 10).map((ord) => (
              <div key={ord.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-[#111111] dark:text-white truncate">
                    {ord.eventTitle}
                  </p>
                  <p className="text-xs text-[#6E6E73] dark:text-[#9A9A9A] truncate">
                    {ord.categoryName} · ×{ord.quantity}
                  </p>
                </div>
                <span className="font-agrandir-extrabold text-xs text-[#111111] dark:text-white tabular-nums shrink-0">
                  {Number(ord.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={showDeleteConfirm}
        onClose={() => !isDeletingAccount && setShowDeleteConfirm(false)}
        title={isEn ? 'Delete account' : 'Supprimer mon compte'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-rose-600 dark:text-[#F29AA4]">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-[#2A1417] border border-rose-200 dark:border-[#F29AA4]/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <p className="text-xs font-mono truncate">{currentUser?.email}</p>
          </div>

          <p className="text-xs sm:text-sm text-[#48484A] dark:text-[#C8C8C8] leading-relaxed">
            {isEn
              ? 'This permanently removes your account from this device.'
              : 'Si tu supprimes ton compte, tu perdras l’accès à tes infos sur cet appareil.'}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/[0.08] dark:border-white/[0.12]">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingAccount}
              className="min-h-[42px] px-4 rounded-full border border-black/15 dark:border-white/[0.16] text-xs font-agrandir-semibold text-[#48484A] dark:text-[#C8C8C8] cursor-pointer"
            >
              {t('profile.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="min-h-[42px] px-4 rounded-full bg-[#B3122B] hover:bg-rose-700 text-white font-agrandir-extrabold text-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>{isDeletingAccount ? t('profile.deleting') : t('profile.confirmDelete')}</span>
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
};
