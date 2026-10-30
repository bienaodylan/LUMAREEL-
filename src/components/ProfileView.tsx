import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  User,
  Heart,
  Users,
  Wallet,
  Settings,
  MapPin,
  Star,
  HelpCircle,
  LogOut,
  Trash2,
  Shield,
  ChevronRight,
  Sparkles,
  CreditCard,
  Bell,
  Smartphone,
  ExternalLink,
  MessageCircle,
  X,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, setCurrentUser, setCurrentPage, setIsAuthModalOpen, showToast, events, setSelectedEventSlug } = useApp();

  // Modals et états interactifs
  const [activeModal, setActiveModal] = useState<
    'favorites' | 'community' | 'wallet' | 'settings' | 'pos' | 'rating' | 'support' | 'delete_app' | null
  >(null);

  // Note de l'application
  const [userRating, setUserRating] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Paramètres utilisateur
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [currency, setCurrency] = useState<'XOF' | 'EUR'>('XOF');

  // Portefeuille virtuel simulé
  const [walletBalance] = useState<number>(25000);

  // Déconnexion
  const handleLogout = () => {
    setCurrentUser(null);
    showToast('Vous avez été déconnecté avec succès.', 'info');
  };

  // Réinitialisation / Suppression du cache de l'app
  const handleResetApp = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      showToast('Cache de l’application et données locales réinitialisés.', 'success');
      setActiveModal(null);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      showToast('Erreur lors de la réinitialisation.', 'error');
    }
  };

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-32 font-agrandir-regular text-white select-none">
      
      {/* 1. Header Profil / Carte Utilisateur */}
      <div className="bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        {currentUser ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              {/* Avatar avec initiales */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-black via-[#1c1c1c] to-[#d4af37]/30 border-2 border-[#d4af37] flex items-center justify-center font-agrandir-extrabold text-xl text-white shadow-lg shrink-0">
                {currentUser.name
                  ? currentUser.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'LR'}
              </div>

              {/* Informations du compte */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-agrandir-extrabold text-lg sm:text-xl text-white truncate">
                    {currentUser.name}
                  </h1>
                  {isSuperAdmin ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37] text-black text-[9px] font-agrandir-extrabold tracking-wider uppercase shadow-md flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>SUPER ADMIN</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-agrandir-semibold uppercase">
                      MEMBRE VÉRIFIÉ
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#888] truncate mt-0.5">{currentUser.email}</p>
                <p className="text-[10px] text-[#666] mt-1">
                  Compte sécurisé par signature cryptographique LUMARÉEL
                </p>
              </div>
            </div>

            {/* Bouton rapide Espace Billets */}
            <button
              onClick={() => setCurrentPage('client_space')}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-semibold text-white tracking-wider uppercase transition-colors shrink-0 cursor-pointer self-start sm:self-center"
            >
              Mes Billets
            </button>
          </div>
        ) : (
          /* Carte d'invitation à se connecter */
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-[#d4af37]">
              <User className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="font-agrandir-extrabold text-xl uppercase tracking-tight text-white">
                Connectez-vous à LUMARÉEL
              </h2>
              <p className="text-xs text-[#888] max-w-sm mx-auto">
                La création d'un compte est obligatoire pour réserver, recevoir et gérer vos billets officiels.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 max-w-xs mx-auto pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex-1 py-3 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors shadow-lg cursor-pointer"
              >
                Se connecter / Créer un compte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Espace Administrateur VIP (Affiché pour bienaodylan428@gmail.com / Super Admin) */}
      {isSuperAdmin && (
        <div className="mb-6 p-5 rounded-3xl bg-gradient-to-r from-[#170e04] via-[#120a02] to-[#1a1205] border-2 border-[#d4af37]/60 shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#d4af37] text-black flex items-center justify-center shrink-0 shadow-md">
              <Shield className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-[9px] font-agrandir-extrabold tracking-[0.2em] text-[#d4af37] uppercase flex items-center gap-1.5">
                <span>GESTION CENTRALE DIRECTE</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight">
                Espace Administration
              </h3>
              <p className="text-[11px] text-neutral-400">
                Toutes vos modifications sont directement enregistrées en base de données et publiées sur le site.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentPage('admin')}
            className="px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors shrink-0 cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <span>Ouvrir l’Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Les 9 Menus Métier de la Partie Profil */}
      <div className="bg-[#0c0c0c] border border-white/10 rounded-3xl p-3 sm:p-4 shadow-xl space-y-1">
        
        {/* 1. Mes favoris */}
        <button
          type="button"
          onClick={() => setActiveModal('favorites')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <Heart className="w-4 h-4 fill-rose-500/20" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Mes favoris</div>
              <div className="text-[10px] text-[#777]">Concerts enregistrés et artistes suivis</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* 2. Ma communauté */}
        <button
          type="button"
          onClick={() => setActiveModal('community')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Ma communauté</div>
              <div className="text-[10px] text-[#777]">Club VIP LUMARÉEL et échanges entre festivaliers</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* 3. Portefeuille */}
        <button
          type="button"
          onClick={() => setActiveModal('wallet')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37] group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Portefeuille</div>
              <div className="text-[10px] text-[#777]">Solde crédits, GeniusPay et cartes de paiement</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-agrandir-bold text-[#d4af37]">
              {walletBalance.toLocaleString()} F CFA
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
          </div>
        </button>

        {/* 4. Paramètres */}
        <button
          type="button"
          onClick={() => setActiveModal('settings')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-300 group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Paramètres</div>
              <div className="text-[10px] text-[#777]">Notifications, devise, langue et sécurité</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* 5. Point de vente */}
        <button
          type="button"
          onClick={() => setActiveModal('pos')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Point de vente</div>
              <div className="text-[10px] text-[#777]">Guichets officiels physiques à Abidjan &amp; Paris</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* 6. Noter l'app */}
        <button
          type="button"
          onClick={() => setActiveModal('rating')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Star className="w-4 h-4 fill-amber-400/20" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Noter l'app</div>
              <div className="text-[10px] text-[#777]">Donnez votre avis sur l’expérience LUMARÉEL</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* 7. Aide et support */}
        <button
          type="button"
          onClick={() => setActiveModal('support')}
          className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-white uppercase">Aide et support</div>
              <div className="text-[10px] text-[#777]">Assistance conciergerie WhatsApp &amp; FAQ</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
        </button>

        {/* Séparateur pour les actions sensibles */}
        <div className="pt-2 border-t border-white/10" />

        {/* 8. Se déconnecter */}
        {currentUser && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full p-3.5 rounded-2xl hover:bg-white/5 flex items-center justify-between transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:scale-105 transition-transform">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-agrandir-extrabold text-white uppercase">Se déconnecter</div>
                <div className="text-[10px] text-[#777]">Fermer la session sur cet appareil</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
          </button>
        )}

        {/* 9. Supprimer l'app */}
        <button
          type="button"
          onClick={() => setActiveModal('delete_app')}
          className="w-full p-3.5 rounded-2xl hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 flex items-center justify-between transition-colors cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-agrandir-extrabold text-rose-400 uppercase">Supprimer l'app</div>
              <div className="text-[10px] text-[#777]">Réinitialiser le cache et retirer les données</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-400/50 group-hover:text-rose-400 transition-colors" />
        </button>

      </div>

      {/* --- MODALES DÉTAILLÉES POUR CHAQUE RUBRIQUE --- */}

      {/* 1. Modale Favoris */}
      {activeModal === 'favorites' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Mes favoris</h3>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {events.slice(0, 3).map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => {
                    setSelectedEventSlug(evt.slug);
                    setCurrentPage('concert_detail');
                    setActiveModal(null);
                  }}
                  className="p-3 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-between gap-3 cursor-pointer hover:border-[#d4af37] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={evt.officialPoster || evt.bannerImage}
                      alt={evt.title}
                      className="w-12 h-14 object-cover rounded-xl shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#d4af37] uppercase font-agrandir-bold">{evt.artist}</div>
                      <div className="text-xs font-agrandir-bold text-white truncate">{evt.title}</div>
                      <div className="text-[10px] text-[#777]">{evt.venue}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. Modale Communauté */}
      {activeModal === 'community' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Club LUMARÉEL</h3>
            </div>
            <p className="text-xs text-[#888] leading-relaxed">
              Rejoignez le cercle privé des mélomanes et festivaliers LUMARÉEL pour des préventes confidentielles, des accès loges et des rencontres exclusives avec les artistes.
            </p>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Statut actuel</span>
                <span className="text-[#d4af37] font-agrandir-bold">Membre Privilège</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Avantages actifs</span>
                <span className="text-emerald-400 font-agrandir-bold">Coupe-file &amp; Invitations</span>
              </div>
            </div>
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Rejoindre le canal WhatsApp VIP</span>
            </a>
          </div>
        </div>
      )}

      {/* 3. Modale Portefeuille */}
      {activeModal === 'wallet' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#d4af37]" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Portefeuille LUMARÉEL</h3>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1c1808] to-black border border-[#d4af37]/40 text-center space-y-1">
              <div className="text-[10px] text-[#aaa] uppercase font-agrandir-semibold">SOLDE DISPONIBLE</div>
              <div className="font-agrandir-extrabold text-3xl text-[#d4af37]">
                {walletBalance.toLocaleString()} F CFA
              </div>
              <div className="text-[10px] text-emerald-400">Prêt pour achat instantané sans frais</div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] text-neutral-400 uppercase font-agrandir-semibold">Modes de recharge liés</div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span>Wave / Orange Money / MTN MoMo</span>
                <span className="text-emerald-400 font-agrandir-bold">Connecté</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                <span>Pass GeniusPay Certifié</span>
                <span className="text-[#d4af37] font-agrandir-bold">Actif</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modale Paramètres */}
      {activeModal === 'settings' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-neutral-300" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Paramètres</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <div className="font-agrandir-semibold text-white">Notifications d'ouverture</div>
                  <div className="text-[10px] text-neutral-400">Alertes sur les nouveaux concerts</div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#d4af37]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <div className="font-agrandir-semibold text-white">Alertes WhatsApp</div>
                  <div className="text-[10px] text-neutral-400">Réception des billets et QR codes</div>
                </div>
                <input
                  type="checkbox"
                  checked={whatsappAlerts}
                  onChange={(e) => setWhatsappAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#d4af37]"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div>
                  <div className="font-agrandir-semibold text-white">Devise principale</div>
                  <div className="text-[10px] text-neutral-400">Affichage des montants</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCurrency('XOF')}
                    className={`px-2.5 py-1 rounded text-[10px] font-agrandir-bold ${
                      currency === 'XOF' ? 'bg-[#d4af37] text-black' : 'bg-white/10 text-neutral-300'
                    }`}
                  >
                    XOF
                  </button>
                  <button
                    onClick={() => setCurrency('EUR')}
                    className={`px-2.5 py-1 rounded text-[10px] font-agrandir-bold ${
                      currency === 'EUR' ? 'bg-[#d4af37] text-black' : 'bg-white/10 text-neutral-300'
                    }`}
                  >
                    EUR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modale Points de Vente Physiques */}
      {activeModal === 'pos' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Points de Vente Officiels</h3>
            </div>
            <p className="text-xs text-[#888]">
              Achetez et récupérez vos billets certifiés aux guichets physiques partenaires LUMARÉEL :
            </p>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
              <div className="p-3 rounded-2xl bg-[#141414] border border-white/10 space-y-1">
                <div className="font-agrandir-bold text-white uppercase">Guichet Palais de la Culture</div>
                <div className="text-[10px] text-neutral-400">Boulevard Hassan II, Treichville, Abidjan</div>
                <div className="text-[10px] text-[#d4af37]">Ouvert du Lundi au Samedi · 09h00 - 18h30</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#141414] border border-white/10 space-y-1">
                <div className="font-agrandir-bold text-white uppercase">Comptoir Sofitel Hôtel Ivoire</div>
                <div className="text-[10px] text-neutral-400">Boulevard Hassan II, Cocody, Abidjan</div>
                <div className="text-[10px] text-[#d4af37]">Hall Principal · 10h00 - 20h00</div>
              </div>
              <div className="p-3 rounded-2xl bg-[#141414] border border-white/10 space-y-1">
                <div className="font-agrandir-bold text-white uppercase">LUMARÉEL Hub Paris</div>
                <div className="text-[10px] text-neutral-400">8e Arrondissement, Paris, France</div>
                <div className="text-[10px] text-[#d4af37]">Sur rendez-vous pour les salons VIP</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Modale Noter l'App */}
      {activeModal === 'rating' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4 text-center">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto">
              <Star className="w-6 h-6 fill-amber-400" />
            </div>
            <h3 className="font-agrandir-extrabold text-xl uppercase">Votre avis nous est précieux</h3>
            <p className="text-xs text-[#888] leading-relaxed">
              Donnez une note à l’application LUMARÉEL pour nous aider à parfaire votre expérience de billetterie.
            </p>

            {/* Étoiles interactives */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setUserRating(star)}
                  className="p-1 cursor-pointer transition-transform hover:scale-125"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= userRating
                        ? 'text-[#d4af37] fill-[#d4af37]'
                        : 'text-neutral-600 fill-transparent'
                    }`}
                  />
                </button>
              ))}
            </div>

            {ratingSubmitted ? (
              <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-agrandir-bold">
                ✓ Merci ! Votre note de {userRating}/5 a été enregistrée.
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Un commentaire ou une suggestion pour l'équipe ?"
                  className="w-full bg-[#161616] border border-white/10 rounded-2xl p-3 text-xs text-white outline-none focus:border-[#d4af37] h-20 resize-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRatingSubmitted(true);
                    setTimeout(() => {
                      setActiveModal(null);
                      setRatingSubmitted(false);
                      showToast('Merci pour votre évaluation !', 'success');
                    }, 1500);
                  }}
                  className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Envoyer ma note
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. Modale Aide & Support */}
      {activeModal === 'support' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-cyan-400" />
              <h3 className="font-agrandir-extrabold text-lg uppercase">Aide &amp; Support</h3>
            </div>
            <p className="text-xs text-[#888] leading-relaxed">
              Une question concernant un billet, un remboursement ou l'accès aux concerts ? Notre équipe de conciergerie est disponible 7j/7.
            </p>
            <div className="space-y-2.5">
              <a
                href="https://wa.me/2250778784178"
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 flex items-center justify-between text-xs text-white transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span className="font-agrandir-bold">Concierge WhatsApp Officiel</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              </a>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs">
                <div className="text-[10px] text-neutral-400 uppercase font-agrandir-semibold">INFOLINE &amp; ASSISTANCE TÉLÉPHONIQUE</div>
                <div className="font-agrandir-bold text-white">+225 07 78 78 41 78 / +33 1 89 40 22 10</div>
                <div className="text-[10px] text-neutral-500">Du Lundi au Dimanche · 08h00 à 22h00 GMT</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modale Supprimer l'app (Reset Cache) */}
      {activeModal === 'delete_app' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0f0f0f] border border-rose-500/40 rounded-3xl p-6 text-white shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-agrandir-extrabold text-xl uppercase text-white">Supprimer les données de l'application ?</h3>
            <p className="text-xs text-[#888] leading-relaxed">
              Cette action efface l'intégralité du cache local, déconnecte votre session et réinitialise l'application mobile à son état d'origine.
            </p>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-agrandir-semibold text-xs uppercase"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleResetApp}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-agrandir-extrabold text-xs uppercase tracking-wider"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
