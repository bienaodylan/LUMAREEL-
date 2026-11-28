import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipCard } from '../types';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { apiFetchJson } from '../lib/apiClient';
import { supabase } from '../lib/supabaseClient';
import {
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  CreditCard,
  Gift,
  Globe,
  LogOut,
  Moon,
  Shield,
  Sun,
  Ticket,
  User as UserIcon,
} from 'lucide-react';

interface MemberNotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPage?: string;
  isRead: boolean;
  createdAt: string;
}

interface MemberCollectionSummary {
  id: string;
  title: string;
  coverUrl: string;
  photoKeys: string[];
}

interface MemberHubResponse {
  success: boolean;
  profile: {
    name: string;
    email: string;
    phone: string;
    city: string;
    referralCode: string;
  };
  loyalty: { balance: number; earned: number; used: number };
  card: MembershipCard | null;
  notifications: MemberNotificationItem[];
  personalCollections: MemberCollectionSummary[];
}

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    setIsAuthModalOpen,
    setCurrentPage,
    customerOrders,
    language,
    setLanguage,
    theme,
    setTheme,
    showToast,
  } = useApp();

  const isEn = language === 'en';
  const [hub, setHub] = useState<MemberHubResponse | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [cityInput, setCityInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadMemberHub = useCallback(async () => {
    if (!currentUser?.email) {
      setHub(null);
      return;
    }
    try {
      const data = await apiFetchJson<MemberHubResponse>('/api/member/profile');
      if (data?.success) {
        setHub(data);
        setNameInput(data.profile.name || currentUser.name);
        setPhoneInput(data.profile.phone || '');
        setCityInput(data.profile.city || 'Abidjan');
      }
    } catch {
      setNameInput(currentUser.name);
    }
  }, [currentUser?.email, currentUser?.name]);

  useEffect(() => {
    void loadMemberHub();
  }, [loadMemberHub]);

  const localStoredCard = useMemo(
    () => (currentUser?.email ? loadStoredMemberCard(currentUser.email) : null),
    [currentUser?.email]
  );
  const memberCard = hub?.card || localStoredCard;

  const userOrders = useMemo(() => {
    if (!currentUser?.email) return [];
    const email = currentUser.email.toLowerCase();
    return customerOrders.filter(
      (o) => (o.customerEmail || '').toLowerCase() === email
    );
  }, [customerOrders, currentUser?.email]);

  const activeTicketsCount = useMemo(
    () =>
      userOrders.reduce(
        (sum, order) =>
          sum +
          (Array.isArray(order.tickets) && order.tickets.length > 0
            ? order.tickets.length
            : Number(order.quantity || 0)),
        0
      ),
    [userOrders]
  );

  const unreadNotifications = useMemo(
    () => (hub?.notifications || []).filter((n) => !n.isRead).length,
    [hub?.notifications]
  );

  const savedSouvenirsCount = useMemo(() => {
    const unique = new Set<string>();
    (hub?.personalCollections || []).forEach((c) => c.photoKeys.forEach((k) => unique.add(k)));
    return unique.size;
  }, [hub?.personalCollections]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSavingProfile(true);
    try {
      const res = await apiFetchJson<{ success: boolean; profile: MemberHubResponse['profile'] }>(
        '/api/member/profile',
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: nameInput.trim(),
            phone: phoneInput.trim(),
            city: cityInput.trim(),
          }),
        }
      );
      if (res?.profile && currentUser) {
        setCurrentUser({ ...currentUser, name: res.profile.name });
        setHub((prev) => (prev ? { ...prev, profile: res.profile } : prev));
        setEditingProfile(false);
        showToast(isEn ? 'Profile updated!' : 'Profil mis à jour !', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la mise à jour.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetchJson('/api/member/notifications/read', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setHub((prev) =>
        prev
          ? {
              ...prev,
              notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
            }
          : prev
      );
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    showToast(isEn ? 'You have been signed out.' : 'Tu es déconnecté.', 'info');
    setCurrentPage('home');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white px-5 py-16 pb-28 font-agrandir-regular">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <h1 className="font-agrandir-extrabold text-3xl tracking-tight">
              {isEn ? 'My LUMARÉEL Space' : 'Mon espace LUMARÉEL'}
            </h1>
            <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
              {isEn
                ? 'Sign in to access your tickets, LUMARÉEL Black Card, Gift Points, referrals, and saved Souvenirs.'
                : 'Connecte-toi pour retrouver tes billets, ta LUMARÉEL Black Card, tes Gift Points, ton parrainage et tes Souvenirs enregistrés.'}
            </p>
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full min-h-[50px] rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer"
            >
              {isEn ? 'Sign in / Create account' : 'Connexion / Inscription'}
            </button>
          </div>

          {/* Apparence & Langue accessibles même déconnecté */}
          <div className="pt-6 border-t border-black/10 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-agrandir-semibold flex items-center gap-2">
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {isEn ? 'Appearance' : 'Apparence'}
              </span>
              <div className="flex p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer ${
                    theme === 'light' ? 'bg-white text-black font-agrandir-extrabold shadow-sm' : 'opacity-60'
                  }`}
                >
                  {isEn ? 'Light' : 'Clair'}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer ${
                    theme === 'dark' ? 'bg-white text-black font-agrandir-extrabold shadow-sm' : 'opacity-60'
                  }`}
                >
                  {isEn ? 'Dark' : 'Sombre'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-agrandir-semibold flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {isEn ? 'Language' : 'Langue'}
              </span>
              <div className="flex p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer ${
                    language === 'fr' ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold' : 'opacity-60'
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1 rounded-full text-xs cursor-pointer ${
                    language === 'en' ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold' : 'opacity-60'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white pt-8 sm:pt-12 pb-28 sm:pb-20 px-4 sm:px-6 lg:px-10 font-agrandir-regular transition-colors duration-200">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* EN-TÊTE MEMBRE + NOTIFICATIONS */}
        <section className="flex items-start justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-xl flex items-center justify-center shrink-0">
              {(hub?.profile?.name || currentUser.name || 'M').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight truncate">
                {hub?.profile?.name || currentUser.name}
              </h1>
              <p className="text-xs text-black/55 dark:text-white/55 truncate">{currentUser.email}</p>
              {hub?.profile?.city && (
                <p className="text-[11px] text-black/45 dark:text-white/45 mt-0.5">
                  {hub.profile.city} {hub.profile.phone ? `· ${hub.profile.phone}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              className="relative w-10 h-10 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-[10px] font-agrandir-extrabold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEditingProfile((prev) => !prev)}
              className="min-h-[38px] px-3.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] text-xs font-agrandir-semibold cursor-pointer"
            >
              {editingProfile ? (isEn ? 'Cancel' : 'Fermer') : isEn ? 'Edit' : 'Modifier'}
            </button>
          </div>
        </section>

        {/* FORMULAIRE ÉDITION PROFIL SYNCHRONISÉ */}
        {editingProfile && (
          <form
            onSubmit={handleSaveProfile}
            className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-5 space-y-4"
          >
            <h2 className="font-agrandir-extrabold text-sm">
              {isEn ? 'Personal information' : 'Mes informations'}
            </h2>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={isEn ? 'Full name' : 'Nom complet'}
                className="min-h-[42px] rounded-xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/15 px-3 text-sm outline-none"
              />
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder={isEn ? 'Phone' : 'Téléphone'}
                className="min-h-[42px] rounded-xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/15 px-3 text-sm outline-none"
              />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder={isEn ? 'City' : 'Ville'}
                className="min-h-[42px] rounded-xl bg-white dark:bg-black/60 border border-black/10 dark:border-white/15 px-3 text-sm outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="min-h-[40px] px-5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingProfile ? '...' : isEn ? 'Save' : 'Enregistrer'}</span>
            </button>
          </form>
        )}

        {/* CENTRE DE NOTIFICATIONS MEMBRE */}
        {showNotifications && (
          <section className="rounded-2xl border border-black/10 dark:border-white/12 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-agrandir-extrabold text-sm">
                Notifications ({hub?.notifications?.length || 0})
              </h2>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllRead()}
                  className="text-xs underline text-black/60 dark:text-white/60 cursor-pointer"
                >
                  {isEn ? 'Mark all read' : 'Tout marquer comme lu'}
                </button>
              )}
            </div>
            {!hub?.notifications?.length ? (
              <p className="text-xs text-black/50 dark:text-white/50 py-3">
                {isEn ? 'No notifications yet.' : 'Aucune notification pour le moment.'}
              </p>
            ) : (
              <div className="divide-y divide-black/10 dark:divide-white/10">
                {hub.notifications.slice(0, 10).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (n.linkPage) setCurrentPage(n.linkPage as any);
                    }}
                    className="w-full py-3 text-left flex items-start justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <p className={`text-xs ${n.isRead ? 'font-agrandir-semibold opacity-70' : 'font-agrandir-extrabold'}`}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-black/55 dark:text-white/55">{n.body}</p>
                    </div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#111111] dark:bg-white mt-1.5 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SYNTHÈSE ÉCOSYSTÈME CONNECTÉ (4 ACCÈS DIRECTS) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setCurrentPage('rewards')}
            className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-4 text-left space-y-2 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            <Gift className="w-4 h-4 opacity-60" />
            <p className="font-agrandir-extrabold text-xl tabular-nums">
              {(hub?.loyalty?.balance ?? 0).toLocaleString('fr-FR')}
            </p>
            <p className="text-[11px] text-black/55 dark:text-white/55">Gift Points</p>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('client_space')}
            className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-4 text-left space-y-2 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            <Ticket className="w-4 h-4 opacity-60" />
            <p className="font-agrandir-extrabold text-xl tabular-nums">{activeTicketsCount}</p>
            <p className="text-[11px] text-black/55 dark:text-white/55">
              {isEn ? 'Tickets' : 'Billets'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('member_card')}
            className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-4 text-left space-y-2 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            <CreditCard className="w-4 h-4 opacity-60" />
            <p className="font-agrandir-extrabold text-base truncate">
              {memberCard ? (isEn ? 'Active' : 'Active') : isEn ? 'Discover' : 'Découvrir'}
            </p>
            <p className="text-[11px] text-black/55 dark:text-white/55">LUMARÉEL Black Card</p>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('memories')}
            className="rounded-2xl bg-black/[0.04] dark:bg-white/[0.05] p-4 text-left space-y-2 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition cursor-pointer"
          >
            <Bookmark className="w-4 h-4 opacity-60" />
            <p className="font-agrandir-extrabold text-xl tabular-nums">{savedSouvenirsCount}</p>
            <p className="text-[11px] text-black/55 dark:text-white/55">
              {isEn ? 'Saved memories' : 'Souvenirs sauvés'}
            </p>
          </button>
        </section>

        {/* NAVIGATION UNIFIÉE DU COMPTE */}
        <section className="divide-y divide-black/10 dark:divide-white/10 border-t border-b border-black/10 dark:border-white/10">
          {[
            {
              label: isEn ? 'My Tickets & Concert History' : 'Mes billets & historique concerts',
              sub: `${userOrders.length} ${isEn ? 'order(s)' : 'commande(s)'}`,
              onClick: () => setCurrentPage('client_space'),
            },
            {
              label: 'LUMARÉEL Black Card',
              sub: memberCard
                ? `N° ${memberCard.cardNumber}`
                : isEn
                  ? 'Explore all 7 benefits'
                  : 'Découvrir les 7 privilèges',
              onClick: () => setCurrentPage('member_card'),
            },
            {
              label: isEn ? 'Gift Points, Rewards & Referrals' : 'Gift Points, Récompenses & Parrainage',
              sub: hub?.profile?.referralCode
                ? `Code : ${hub.profile.referralCode}`
                : `${hub?.loyalty?.balance ?? 0} GP`,
              onClick: () => setCurrentPage('rewards'),
            },
            {
              label: isEn ? 'My Souvenirs & Collections' : 'Mes Souvenirs & Collections',
              sub: `${hub?.personalCollections?.length || 0} ${isEn ? 'collection(s)' : 'collection(s)'}`,
              onClick: () => setCurrentPage('memories'),
            },
          ].map((row) => (
            <button
              key={row.label}
              type="button"
              onClick={row.onClick}
              className="w-full py-4 flex items-center justify-between gap-4 text-left hover:opacity-75 transition cursor-pointer"
            >
              <div>
                <p className="text-sm font-agrandir-extrabold">{row.label}</p>
                <p className="text-xs text-black/50 dark:text-white/50">{row.sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-black/35 dark:text-white/35 shrink-0" />
            </button>
          ))}

          {currentUser.role === 'super_admin' && (
            <button
              type="button"
              onClick={() => setCurrentPage('admin')}
              className="w-full py-4 flex items-center justify-between gap-4 text-left hover:opacity-75 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <div>
                  <p className="text-sm font-agrandir-extrabold">Centre de contrôle Admin</p>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    CMS, Media Library, Concerts, Souvenirs, Fidélité & Audit
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-black/35 dark:text-white/35 shrink-0" />
            </button>
          )}
        </section>

        {/* PRÉFÉRENCES (THÈME + LANGUE + DÉCONNEXION) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-agrandir-semibold flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {isEn ? 'Theme' : 'Mode d’affichage'}
            </span>
            <div className="flex p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3.5 py-1 rounded-full text-xs cursor-pointer ${
                  theme === 'light'
                    ? 'bg-white text-black font-agrandir-extrabold shadow-sm'
                    : 'opacity-60'
                }`}
              >
                {isEn ? 'Light' : 'Clair'}
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3.5 py-1 rounded-full text-xs cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white text-black font-agrandir-extrabold shadow-sm'
                    : 'opacity-60'
                }`}
              >
                {isEn ? 'Dark' : 'Sombre'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-agrandir-semibold flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {isEn ? 'Language' : 'Langue'}
            </span>
            <div className="flex p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-3.5 py-1 rounded-full text-xs cursor-pointer ${
                  language === 'fr'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                    : 'opacity-60'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3.5 py-1 rounded-full text-xs cursor-pointer ${
                  language === 'en'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                    : 'opacity-60'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="min-h-[44px] px-5 rounded-full border border-black/15 dark:border-white/15 text-xs font-agrandir-semibold text-red-600 dark:text-red-400 inline-flex items-center gap-2 hover:bg-red-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{isEn ? 'Sign out' : 'Se déconnecter'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
