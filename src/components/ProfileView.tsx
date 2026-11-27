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
  QrCode,
  Sparkles,
  Lightbulb,
  Ticket,
  Camera,
  User as UserIcon,
  Phone,
  Lock,
  History,
  SlidersHorizontal,
  ScanLine,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  computeUserPointsSummary,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { BottomSheet } from './ui/LumareelKit';

const NOTIF_STORAGE_KEY = 'lumareel_notifications_enabled_v1';

type ProfileSheetType = null | 'info' | 'contact' | 'security' | 'prefs' | 'history';

/**
 * Écran Compte — Liste éditoriale épurée conforme à la direction artistique LUMARÉEL
 * (0px conteneurs, 4px boutons/inputs, filets fins rgba(255,255,255,0.12), or #D4AF6A).
 */
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
    showToast(
      isEn ? 'Account details updated.' : 'Informations enregistrées.',
      'success'
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    showToast(isEn ? 'You have been signed out.' : 'Vous avez été déconnecté.', 'info');
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
        } catch {}
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

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    showToast(
      next
        ? isEn
          ? 'Concert and release alerts enabled.'
          : 'Alertes concerts et sorties activées.'
        : isEn
        ? 'Alerts paused.'
        : 'Alertes mises en pause.',
      'info'
    );
  };

  const assistanceItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  }> = [
    ...(isGateAgent
      ? [
          {
            label: isEn ? 'Gate Scanner (Agent)' : 'Scanner Agent · Contrôle accès',
            page: 'scanner' as PageView,
            icon: ScanLine,
          },
        ]
      : []),
    {
      label: isEn ? 'Help & Contact' : 'Contact & Assistance',
      page: 'contact',
      icon: HelpCircle,
    },
    {
      label: isEn ? 'Verify a LUMARÉEL Black Card' : 'Vérifier une LUMARÉEL Black Card',
      page: 'card_verify',
      icon: QrCode,
    },
    {
      label: isEn ? 'Photographers & Media Studio' : 'Studio Photographe & Collaborateurs',
      page: 'contributor_studio',
      icon: Camera,
    },
    {
      label: isEn ? 'Organizers & Production' : 'Espace Organisateurs',
      page: 'organizers',
      icon: Sparkles,
    },
    {
      label: isEn ? 'Suggestion Box' : 'Boîte à suggestions',
      page: 'suggestions',
      icon: Lightbulb,
    },
  ];

  return (
    <div
      className="min-h-screen w-full max-w-3xl mx-auto px-4 sm:px-8 pb-24 bg-black text-white font-agrandir-regular overflow-x-clip"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* 1. IDENTITÉ ÉDITORIALE */}
      <header className="pb-8 sm:pb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#141414] border border-white/[0.16] flex items-center justify-center font-agrandir-extrabold text-base sm:text-lg text-[#D4AF6A] shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
              {isEn ? 'ACCOUNT' : 'COMPTE'}
            </p>
            <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight truncate">
              {displayName}
            </h1>
            <p className="text-xs sm:text-sm text-[#9A9A9A] truncate mt-0.5">
              {currentUser?.email || (isEn ? 'Guest session' : 'Session invité')}
            </p>
            {activeBlackCard && (
              <p className="mt-1.5 text-xs text-[#D4AF6A] font-agrandir-semibold inline-flex items-center gap-1.5">
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
              className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer lum-press"
            >
              {isEn ? 'Sign in' : 'Se connecter'}
            </button>
          ) : (
            isSuperAdmin && (
              <button
                type="button"
                onClick={() => setCurrentPage('admin')}
                className="min-h-[40px] px-4 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer lum-press"
              >
                <Shield className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{t('nav.admin')}</span>
              </button>
            )
          )}
        </div>
      </header>

      <div className="space-y-9">
        {/* 2. COMPTE & PRIVILÈGES */}
        <section>
          <h2 className="text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A] mb-2">
            {isEn ? 'Account & Privileges' : 'Compte & Privilèges'}
          </h2>
          <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
            <button
              type="button"
              onClick={() => setCurrentPage('member_card')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Crown className="w-4 h-4 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  LUMARÉEL Black Card
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#9A9A9A] shrink-0">
                <span className={activeBlackCard ? 'text-[#D4AF6A] font-agrandir-extrabold' : ''}>
                  {activeBlackCard
                    ? 'Active'
                    : isEn
                    ? 'Discover'
                    : 'Découvrir'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors" strokeWidth={1.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('rewards')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Award className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  {isEn ? 'Points & Rewards' : 'Mes points & récompenses'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#9A9A9A] tabular-nums shrink-0">
                <span className="text-[#D4AF6A] font-agrandir-extrabold">
                  {pointsSummary.availablePoints.toLocaleString('fr-FR')} pts
                </span>
                <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors" strokeWidth={1.6} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage('client_space')}
              className="group w-full min-h-[58px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <Ticket className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  {isEn ? 'My Tickets & Orders' : 'Mes billets & commandes'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#9A9A9A] tabular-nums shrink-0">
                <span>
                  {activeTicketsCount}{' '}
                  {isEn
                    ? activeTicketsCount > 1
                      ? 'passes'
                      : 'pass'
                    : activeTicketsCount > 1
                    ? 'actifs'
                    : 'actif'}
                </span>
                <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors" strokeWidth={1.6} />
              </span>
            </button>
          </div>
        </section>

        {/* 3. MON PROFIL (Informations, Coordonnées, Sécurité, Historique) */}
        <section>
          <h2 className="text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A] mb-2">
            {isEn ? 'Profile & Security' : 'Profil & Sécurité'}
          </h2>
          <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
            {[
              {
                id: 'info' as const,
                icon: UserIcon,
                label: isEn ? 'Personal details' : 'Informations',
                meta: cityInput || 'Abidjan',
              },
              {
                id: 'contact' as const,
                icon: Phone,
                label: isEn ? 'Contact details' : 'Coordonnées',
                meta: phoneInput || currentUser?.email || (isEn ? 'Add' : 'Compléter'),
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
                label: isEn ? 'Order & activity history' : 'Historique',
                meta: `${customerOrders.length} ${isEn ? 'orders' : 'commandes'}`,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setActiveSheet(row.id)}
                  className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <Icon className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors shrink-0" strokeWidth={1.6} />
                    <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                      {row.label}
                    </span>
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[#9A9A9A] shrink-0 max-w-[140px]">
                    <span className="truncate">{row.meta}</span>
                    <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. PRÉFÉRENCES (Notifications, Langue, Préférences musicales) */}
        <section>
          <h2 className="text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A] mb-2">
            {t('profile.preferences')}
          </h2>
          <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
            <button
              type="button"
              onClick={() => setActiveSheet('prefs')}
              className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-3.5 min-w-0">
                <SlidersHorizontal className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  {isEn ? 'Preferences' : 'Préférences'}
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-[#9A9A9A] shrink-0">
                <span className="truncate max-w-[130px]">{favoriteGenre}</span>
                <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white" strokeWidth={1.6} />
              </span>
            </button>

            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                <Globe className="w-4 h-4 text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white">
                  {t('profile.language')}
                </span>
              </span>
              <div className="flex items-center rounded-full bg-[#141414] border border-white/[0.12] p-0.5 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    language === 'fr'
                      ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                      : 'text-[#9A9A9A] hover:text-white'
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                    language === 'en'
                      ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                      : 'text-[#9A9A9A] hover:text-white'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="min-h-[58px] py-3.5 flex items-center justify-between gap-4">
              <span className="flex items-center gap-3.5 min-w-0">
                <Bell className="w-4 h-4 text-[#9A9A9A] shrink-0" strokeWidth={1.6} />
                <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white">
                  {t('profile.notifications')}
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={notificationsEnabled}
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  notificationsEnabled ? 'bg-[#D4AF6A]' : 'bg-white/15'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-black transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* 5. ASSISTANCE & INFORMATIONS */}
        <section>
          <h2 className="text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A] mb-2">
            {isEn ? 'Support & Pro Access' : 'Assistance & Espaces'}
          </h2>
          <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
            {assistanceItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => setCurrentPage(item.page)}
                  className="group w-full min-h-[56px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3.5 min-w-0">
                    <Icon className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors shrink-0" strokeWidth={1.6} />
                    <span className="text-sm sm:text-[15px] font-agrandir-semibold text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                      {item.label}
                    </span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors shrink-0" strokeWidth={1.6} />
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. SESSION */}
        {currentUser && (
          <section>
            <h2 className="text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A] mb-2">
              {t('profile.session')}
            </h2>
            <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
              <button
                type="button"
                onClick={handleLogout}
                className="group w-full min-h-[54px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer text-[#C8C8C8]"
              >
                <span className="flex items-center gap-3.5 text-sm sm:text-[15px] font-agrandir-semibold group-hover:text-white">
                  <LogOut className="w-4 h-4 text-[#9A9A9A]" strokeWidth={1.6} />
                  <span>{t('profile.logout')}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#9A9A9A]" strokeWidth={1.6} />
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
                className="w-full min-h-[54px] py-3.5 flex items-center justify-between gap-4 text-left transition-colors cursor-pointer text-[#F29AA4] hover:text-rose-300"
              >
                <span className="flex items-center gap-3.5 text-sm sm:text-[15px] font-agrandir-semibold">
                  <Trash2 className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                  <span>{t('profile.deleteAccount')}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-[#F29AA4]/60 shrink-0" strokeWidth={1.6} />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* BOTTOM SHEETS PROFIL : Informations / Coordonnées / Sécurité / Préférences / Historique */}
      <BottomSheet
        open={activeSheet === 'info' || activeSheet === 'contact' || activeSheet === 'prefs'}
        onClose={() => setActiveSheet(null)}
        kicker={isEn ? 'ACCOUNT' : 'MON COMPTE'}
        title={
          activeSheet === 'info'
            ? isEn
              ? 'Personal details'
              : 'Informations personnelles'
            : activeSheet === 'contact'
            ? isEn
              ? 'Contact details'
              : 'Coordonnées'
            : isEn
            ? 'Musical preferences'
            : 'Préférences'
        }
      >
        <form onSubmit={handleSaveDetails} className="space-y-4">
          {activeSheet === 'info' && (
            <>
              <div>
                <label className="block text-xs text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Full name' : 'Nom complet'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  disabled
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black/60 border border-white/[0.12] text-sm text-[#9A9A9A]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9A9A9A] mb-1.5">
                  {isEn ? 'City' : 'Ville'}
                </label>
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                />
              </div>
            </>
          )}

          {activeSheet === 'contact' && (
            <>
              <div>
                <label className="block text-xs text-[#9A9A9A] mb-1.5">Email</label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black/60 border border-white/[0.12] text-sm text-[#9A9A9A]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Phone (WhatsApp / Mobile)' : 'Téléphone (WhatsApp / Mobile)'}
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
                />
              </div>
            </>
          )}

          {activeSheet === 'prefs' && (
            <div>
              <label className="block text-xs text-[#9A9A9A] mb-1.5">
                {isEn ? 'Favorite styles & events' : 'Styles musicaux & formats préférés'}
              </label>
              <input
                type="text"
                value={favoriteGenre}
                onChange={(e) => setFavoriteGenre(e.target.value)}
                placeholder="Afrobeats, Rap Ivoire, Acoustique..."
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/[0.16] text-sm text-white focus:border-[#D4AF6A] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs cursor-pointer lum-press"
          >
            {isEn ? 'Save' : 'Enregistrer'}
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'security'}
        onClose={() => setActiveSheet(null)}
        kicker={isEn ? 'ACCOUNT SECURITY' : 'SÉCURITÉ DU COMPTE'}
        title={isEn ? 'Security & access' : 'Sécurité & connexion'}
      >
        <div className="space-y-4 text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
          <div className="p-4 rounded-[16px] bg-black border border-white/[0.12] space-y-1">
            <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
              {isEn ? 'ACTIVE SESSION' : 'SESSION ACTIVE'}
            </p>
            <p className="font-agrandir-extrabold text-white">
              {currentUser?.email || (isEn ? 'Not signed in' : 'Non connecté')}
            </p>
          </div>
          <p className="text-xs text-[#9A9A9A]">
            {isEn
              ? 'Your tickets and Black Card credentials are protected by signed cryptographic tokens.'
              : 'Vos billets QR et votre LUMARÉEL Black Card sont protégés par des jetons chiffrés uniques.'}
          </p>
        </div>
      </BottomSheet>

      <BottomSheet
        open={activeSheet === 'history'}
        onClose={() => setActiveSheet(null)}
        kicker={isEn ? 'HISTORY' : 'HISTORIQUE'}
        title={isEn ? 'Orders & activity' : 'Commandes & activité'}
      >
        {customerOrders.length === 0 ? (
          <p className="text-xs text-[#9A9A9A] py-4">
            {isEn ? 'No completed orders yet.' : 'Aucune commande enregistrée pour le moment.'}
          </p>
        ) : (
          <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
            {customerOrders.slice(0, 10).map((ord) => (
              <div key={ord.id} className="py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white truncate">
                    {ord.eventTitle}
                  </p>
                  <p className="text-xs text-[#9A9A9A] truncate">
                    {ord.categoryName} · ×{ord.quantity}
                  </p>
                </div>
                <span className="font-agrandir-extrabold text-xs text-[#D4AF6A] tabular-nums shrink-0">
                  {Number(ord.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </BottomSheet>

      {/* BOTTOM SHEET CONFIRMATION SUPPRESSION — 0px */}
      <BottomSheet
        open={showDeleteConfirm}
        onClose={() => !isDeletingAccount && setShowDeleteConfirm(false)}
        kicker={isEn ? 'DANGER ZONE' : 'SUPPRESSION DU COMPTE'}
        title={t('profile.deleteTitle')}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-[#F29AA4]">
            <div className="w-10 h-10 rounded-xl bg-[#2A1417] border border-[#F29AA4]/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" strokeWidth={1.6} />
            </div>
            <p className="text-xs font-mono truncate">{currentUser?.email}</p>
          </div>

          <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
            {t('profile.deleteConfirm')}
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.12]">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeletingAccount}
              className="min-h-[42px] px-4 rounded-full border border-white/[0.16] hover:border-white text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer"
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
