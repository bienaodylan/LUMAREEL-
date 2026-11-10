import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  WalletOverview,
  PrivateInvitation,
  MembershipBenefit,
  MembershipEntitlement,
  Ticket,
  Order,
  WalletActivityRecord,
  WalletPaymentRecord,
} from '../types';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import {
  Wallet,
  CreditCard,
  Ticket as TicketIcon,
  Crown,
  Mail,
  ShoppingBag,
  Receipt,
  Activity,
  User,
  ArrowLeft,
  X,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Download,
  Share2,
  ExternalLink,
  ChevronRight,
  Flame,
  Check,
  RotateCw,
  Printer,
  ChevronDown
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDateLongFrench } from '../utils/dateUtils';

type WalletTab =
  | 'overview'
  | 'membership'
  | 'tickets'
  | 'benefits'
  | 'invitations'
  | 'orders'
  | 'payments'
  | 'activity'
  | 'profile';

export const LumareelWalletView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    refreshCustomerOrders,
    setCurrentPage,
    showToast,
    language,
    t,
  } = useApp();

  const [activeTab, setActiveTab] = useState<WalletTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [wallet, setWallet] = useState<WalletOverview | null>(null);

  // QR Modal states for tickets and invitations
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [ticketQrModalUrl, setTicketQrModalUrl] = useState<string>('');
  const [selectedInvitationForQr, setSelectedInvitationForQr] = useState<PrivateInvitation | null>(null);
  const [invitationQrModalUrl, setInvitationQrModalUrl] = useState<string>('');

  // Benefit redemption state
  const [isRedeemingBenefitId, setIsRedeemingBenefitId] = useState<string | null>(null);

  // Rotating member card token
  const [isRotatingCardToken, setIsRotatingCardToken] = useState<boolean>(false);

  useEffect(() => {
    fetchWalletOverview();
  }, [currentUser]);

  const fetchWalletOverview = async () => {
    const userEmail = currentUser?.email || 'bienaodylan428@gmail.com';
    try {
      setLoading(true);
      const res = await fetch(`/api/wallet/overview?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && data.overview) {
        setWallet(data.overview);
      }
    } catch (err) {
      console.error('Error loading wallet overview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR for ticket modal
  useEffect(() => {
    if (selectedTicketForQr) {
      QRCode.toDataURL(selectedTicketForQr.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 480,
      }).then(setTicketQrModalUrl);
    } else {
      setTicketQrModalUrl('');
    }
  }, [selectedTicketForQr]);

  // Generate QR for invitation modal
  useEffect(() => {
    if (selectedInvitationForQr) {
      QRCode.toDataURL(selectedInvitationForQr.qrToken, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 480,
      }).then(setInvitationQrModalUrl);
    } else {
      setInvitationQrModalUrl('');
    }
  }, [selectedInvitationForQr]);

  // Respond to invitation
  const handleRespondInvitation = async (invitationId: string, response: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/wallet/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de mettre à jour l’invitation.');
      }
      showToast(
        response === 'accepted'
          ? 'Invitation acceptée ! Votre QR d’accès est actif.'
          : 'Invitation déclinée.',
        'success'
      );
      fetchWalletOverview();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Consume benefit
  const handleRedeemBenefit = async (benefitId: string) => {
    if (!wallet?.card) return;
    try {
      setIsRedeemingBenefitId(benefitId);
      const res = await fetch('/api/membership/redeem-benefit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: wallet.card.id,
          benefitId,
          redeemedBy: currentUser?.name || wallet.user.name || 'Titulaire Membre',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de valider le privilège.');
      }
      showToast(`Privilège validé ! Référence : ${data.redemption?.redemptionReference}`, 'success');
      fetchWalletOverview();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsRedeemingBenefitId(null);
    }
  };

  // Rotate card token
  const handleRotateCardToken = async () => {
    if (!wallet?.card) return;
    try {
      setIsRotatingCardToken(true);
      const res = await fetch(`/api/membership/admin/cards/${wallet.card.id}/rotate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: currentUser?.email || 'USER' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de rotation du jeton.');
      }
      showToast('Jeton QR régénéré avec succès. L’ancien jeton a été révoqué.', 'success');
      fetchWalletOverview();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsRotatingCardToken(false);
    }
  };

  const navItems: Array<{ id: WalletTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'overview', label: 'Vue d’ensemble', icon: Wallet },
    { id: 'membership', label: 'LUMARÉEL CARD', icon: Crown, count: wallet?.card ? 1 : 0 },
    { id: 'tickets', label: 'Mes Billets', icon: TicketIcon, count: wallet?.metrics.activeTicketsCount },
    { id: 'benefits', label: 'Avantages', icon: Sparkles, count: wallet?.metrics.availableBenefitsCount },
    { id: 'invitations', label: 'Invitations', icon: Mail, count: wallet?.metrics.activeInvitationsCount },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag, count: wallet?.orders.length },
    { id: 'payments', label: 'Paiements & Reçus', icon: Receipt },
    { id: 'activity', label: 'Activités', icon: Activity },
    { id: 'profile', label: 'Mon Profil', icon: User },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-32 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#d4af37]" />
        <p className="text-xs text-neutral-400 font-agrandir-regular">
          Synchronisation de votre LUMARÉEL WALLET...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-32 select-none font-agrandir-regular text-white">
      
      {/* Barre de retour supérieure */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group"
          title="Retourner à l'accueil"
        >
          <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-0.5 transition-transform" />
          <span>RETOUR</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">
            LUMARÉEL WALLET ECOSYSTEM
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md group"
          title="Fermer et revenir à l'accueil"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* En-tête Header : Portefeuille Personnel */}
      <div className="mb-6 border-b border-white/10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase mb-1">
              ESPACE CLIENT OFFICIEL
            </div>
            <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase">
              LUMARÉEL <span className="text-[#d4af37]">WALLET</span>
            </h1>
            <div className="text-xs font-agrandir-regular text-[#aaa] mt-1.5 flex flex-wrap items-center gap-3">
              <span>
                Titulaire : <strong className="text-white">{wallet?.user.name || currentUser?.name || 'Dylan Bienao'}</strong>
              </span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span>{wallet?.user.email || currentUser?.email}</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span className="text-emerald-400 font-agrandir-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Compte Certifié</span>
              </span>
            </div>
          </div>

          {/* Quick Refresh */}
          <button
            type="button"
            onClick={fetchWalletOverview}
            className="self-start md:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Actualiser le portefeuille</span>
          </button>
        </div>
      </div>

      {/* Navigation en onglets horizontale (Scrollable responsive) */}
      <div className="mb-8 border-b border-white/10 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-2 min-w-max pb-3">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-agrandir-extrabold shadow-lg shadow-white/10'
                    : 'bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-[#d4af37]'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      isActive ? 'bg-black text-white' : 'bg-[#d4af37] text-black'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* SECTION A : VUE D'ENSEMBLE (OVERVIEW)                                */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-10 animate-fadeIn">
          {/* Salutation Personnalisée & Métriques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-1">
              <div className="text-[10px] font-agrandir-bold tracking-widest text-neutral-400 uppercase">
                Billets Actifs
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">
                {wallet?.metrics.activeTicketsCount || 0}
              </div>
              <div className="text-[10px] text-neutral-500">Prêts pour l'accès aux portes</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-1">
              <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                Avantages Disponibles
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-[#d4af37]">
                {wallet?.metrics.availableBenefitsCount || 0}
              </div>
              <div className="text-[10px] text-neutral-500">Privilèges exclusifs actifs</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-1">
              <div className="text-[10px] font-agrandir-bold tracking-widest text-neutral-400 uppercase">
                Invitations Privées
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-bold text-white">
                {wallet?.metrics.activeInvitationsCount || 0}
              </div>
              <div className="text-[10px] text-neutral-500">Expériences confidentielles</div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-1">
              <div className="text-[10px] font-agrandir-bold tracking-widest text-neutral-400 uppercase">
                Statut Membership
              </div>
              <div className="font-agrandir-bold text-base sm:text-lg text-emerald-400 truncate">
                {wallet?.card ? 'FOUNDERS 2026' : 'STANDARD'}
              </div>
              <div className="text-[10px] text-neutral-500">
                {wallet?.card ? wallet.card.cardNumber : 'Adhésion ouverte'}
              </div>
            </div>
          </div>

          {/* Section Carte Interactive si titulaire */}
          {wallet?.card ? (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121212] via-[#080808] to-[#040404] border border-[#d4af37]/30 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                    IDENTITÉ OFFICIELLE PERMANENTE
                  </div>
                  <h2 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase">
                    LUMARÉEL CARD · {wallet.card.cardNumber}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-agrandir-bold uppercase">
                    ● Active &amp; Validée
                  </span>
                </div>
              </div>

              {/* Rendu 3D de la carte CR-80 */}
              <DigitalMembershipCard
                card={wallet.card}
                qrDataUrl={wallet.qrDataUrl}
                onRotateToken={handleRotateCardToken}
                isRotatingToken={isRotatingCardToken}
              />
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-gradient-to-br from-[#141414] via-[#090909] to-[#040404] border border-white/15 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-agrandir-bold text-[#d4af37] uppercase">
                  <Crown className="w-3.5 h-3.5" />
                  <span>MEMBERSHIP PRIVILÉGIÉ</span>
                </div>
                <h3 className="text-2xl font-agrandir-extrabold uppercase">
                  Rejoignez la Founders Edition
                </h3>
                <p className="text-xs text-neutral-300 max-w-lg leading-relaxed">
                  Plus qu'une adhésion, une identité permanente. Quota limité à 100 membres d'élite avec carte PVC de luxe, salons VIP et invitations privées.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage('card')}
                className="px-6 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all shadow-xl shadow-[#d4af37]/20 cursor-pointer shrink-0"
              >
                Découvrir LUMARÉEL CARD
              </button>
            </div>
          )}

          {/* Billets Récents & Activités Récents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prochains Billets */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm uppercase tracking-wider">
                    Derniers Billets Émis
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                >
                  Voir tout ({wallet?.tickets.length || 0})
                </button>
              </div>

              {wallet?.tickets && wallet.tickets.length > 0 ? (
                <div className="space-y-3">
                  {wallet.tickets.slice(0, 3).map((tkt) => (
                    <div
                      key={tkt.id}
                      className="p-3.5 rounded-2xl bg-[#141414] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-agrandir-bold text-xs uppercase text-white truncate">
                          {tkt.eventTitle}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {tkt.categoryName} · {tkt.serialNumber || tkt.id}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedTicketForQr(tkt)}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-agrandir-bold text-white transition-all cursor-pointer shrink-0"
                      >
                        Afficher QR
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Aucun billet actif pour le moment.
                </p>
              )}
            </div>

            {/* Activités Récentes */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm uppercase tracking-wider">
                    Journal d’Activité Récent
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                >
                  Historique complet
                </button>
              </div>

              {wallet?.activities && wallet.activities.length > 0 ? (
                <div className="space-y-3">
                  {wallet.activities.slice(0, 4).map((act) => (
                    <div
                      key={act.id}
                      className="text-xs flex items-start gap-3 border-b border-white/5 pb-2.5 last:border-none"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#d4af37] mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-agrandir-bold text-white truncate">
                          {act.title}
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                          {act.description}
                        </div>
                      </div>
                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">
                        {new Date(act.timestamp).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  Aucune activité enregistrée.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION B : MY MEMBERSHIP (CARTE CR-80 3D & COMMANDE PHYSIQUE)       */}
      {/* ===================================================================== */}
      {activeTab === 'membership' && (
        <div className="space-y-8 animate-fadeIn">
          {wallet?.card ? (
            <div className="space-y-8">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                      LUMARÉEL FOUNDERS EDITION 2026
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase mt-0.5">
                      {wallet.card.cardNumber}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-agrandir-bold uppercase">
                      ● Adhésion Active
                    </span>

                    <button
                      type="button"
                      onClick={handleRotateCardToken}
                      disabled={isRotatingCardToken}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs text-white transition-all cursor-pointer disabled:opacity-50"
                      title="En cas de perte ou de compromission visuelle"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isRotatingCardToken ? 'animate-spin' : ''}`} />
                      <span>Régénérer le jeton QR</span>
                    </button>
                  </div>
                </div>

                {/* Composant de carte numérique CR-80 3D standard */}
                <DigitalMembershipCard
                  card={wallet.card}
                  qrDataUrl={wallet.qrDataUrl}
                  onRotateToken={handleRotateCardToken}
                  isRotatingToken={isRotatingCardToken}
                />

                {/* Métadonnées de validité & de sécurité */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">Date d'émission</div>
                    <div className="font-agrandir-bold text-white">
                      {new Date(wallet.card.validFrom).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">Date d'expiration</div>
                    <div className="font-agrandir-bold text-white">
                      {new Date(wallet.card.expiresAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">Statut Carte Physique</div>
                    <div className="font-agrandir-bold text-[#d4af37] uppercase">
                      {wallet.card.physicalCardStatus.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-5">
              <Crown className="w-12 h-12 text-[#d4af37] mx-auto animate-bounce" />
              <h2 className="text-2xl font-agrandir-extrabold uppercase">
                Aucune adhésion LUMARÉEL CARD active
              </h2>
              <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                Obtenez votre numéro permanent certifié et rejoignez la série limitée exclusive des 100 Membres Fondateurs.
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('card')}
                className="px-8 py-3.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase tracking-wider shadow-xl shadow-[#d4af37]/20 transition-all cursor-pointer"
              >
                Rejoindre la Founders Edition
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION C : MY TICKETS (BILLETS DE CONCERTS & SPECTACLES)            */}
      {/* ===================================================================== */}
      {activeTab === 'tickets' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-agrandir-extrabold uppercase">
                Mes Billets de Concerts
              </h2>
              <p className="text-xs text-neutral-400">
                Chaque billet dispose de son propre QR code individuel à présenter à l'entrée.
              </p>
            </div>
          </div>

          {wallet?.tickets && wallet.tickets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallet.tickets.map((tkt) => (
                <div
                  key={tkt.id}
                  className="p-5 rounded-3xl bg-[#0c0c0c] border border-white/10 hover:border-white/20 transition-all space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-[#d4af37] uppercase">
                        {tkt.serialNumber || tkt.id}
                      </div>
                      <h3 className="font-agrandir-extrabold text-base text-white truncate uppercase mt-0.5">
                        {tkt.eventTitle}
                      </h3>
                      <div className="text-xs text-neutral-300 font-agrandir-bold mt-1">
                        Catégorie : {tkt.categoryName}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider ${
                        tkt.status === 'used'
                          ? 'bg-neutral-800 text-neutral-400 border border-white/10'
                          : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {tkt.status === 'used' ? 'Utilisé' : 'Valide'}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{tkt.eventDate || 'Date officielle'}</span>
                    </div>
                    {tkt.eventVenue && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="truncate max-w-[180px]">{tkt.eventVenue}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <span className="text-[11px] text-neutral-400 font-mono">
                      Titulaire : {tkt.holderName || wallet.user.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedTicketForQr(tkt)}
                      className="px-4 py-2 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-black" />
                      <span>Afficher QR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <TicketIcon className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Vous ne possédez aucun billet de concert pour le moment.
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Découvrir la programmation
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION D : MY BENEFITS (PRIVILÈGES ET AVANTAGES DU MEMBERSHIP)      */}
      {/* ===================================================================== */}
      {activeTab === 'benefits' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Mes Privilèges &amp; Avantages
            </h2>
            <p className="text-xs text-neutral-400">
              Avantages réels enregistrés et contrôlés côté serveur pour les titulaires LUMARÉEL CARD.
            </p>
          </div>

          {wallet?.benefits && wallet.benefits.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallet.benefits.map(({ benefit, entitlement }) => {
                const totalAllowed = entitlement?.quantity ?? benefit.perMemberLimit;
                const used = entitlement?.usedQuantity ?? 0;
                const remaining = Math.max(0, totalAllowed - used);
                const isExhausted = remaining <= 0;

                return (
                  <div
                    key={benefit.id}
                    className={`p-5 rounded-3xl border transition-all space-y-4 ${
                      isExhausted
                        ? 'bg-[#080808] border-white/5 opacity-60'
                        : 'bg-[#0c0c0c] border-white/15 hover:border-[#d4af37]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">
                          {benefit.benefitType.replace('_', ' ')}
                        </div>
                        <h3 className="font-agrandir-extrabold text-base text-white uppercase mt-0.5">
                          {benefit.name}
                        </h3>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider ${
                          isExhausted
                            ? 'bg-neutral-800 text-neutral-400'
                            : 'bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37]'
                        }`}
                      >
                        {isExhausted ? 'Épuisé' : `${remaining} restant${remaining > 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed font-light">
                      {benefit.description}
                    </p>

                    <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400">
                        Utilisations : <strong className="text-white">{used}</strong> sur <strong>{totalAllowed}</strong>
                      </span>

                      {!isExhausted && wallet.card && (
                        <button
                          type="button"
                          onClick={() => handleRedeemBenefit(benefit.id)}
                          disabled={isRedeemingBenefitId === benefit.id}
                          className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isRedeemingBenefitId === benefit.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#d4af37]" />
                          )}
                          <span>Faire valider</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <Sparkles className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Aucun avantage rattaché à ce compte. Rejoignez la Founders Edition pour débloquer les privilèges exclusifs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION E : MY INVITATIONS (EXPÉRIENCES & INVITATIONS PRIVÉES)       */}
      {/* ===================================================================== */}
      {activeTab === 'invitations' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Mes Invitations Privées
            </h2>
            <p className="text-xs text-neutral-400">
              Accès confidentiels aux galas, réceptions d'artistes et showcases acoustiques.
            </p>
          </div>

          {wallet?.invitations && wallet.invitations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {wallet.invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/15 space-y-4 shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                        {inv.category.toUpperCase().replace('_', ' ')}
                      </div>
                      <h3 className="font-agrandir-extrabold text-base text-white uppercase mt-0.5">
                        {inv.title}
                      </h3>
                      {inv.subtitle && (
                        <div className="text-xs text-neutral-400 font-light mt-0.5">
                          {inv.subtitle}
                        </div>
                      )}
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider ${
                        inv.status === 'accepted'
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                          : inv.status === 'used'
                          ? 'bg-neutral-800 text-neutral-400'
                          : 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                      }`}
                    >
                      {inv.status === 'accepted' ? 'Confirmée' : inv.status === 'used' ? 'Utilisée' : 'En attente'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    {inv.description}
                  </p>

                  <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-neutral-400 font-mono">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{inv.eventDate} à {inv.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{inv.venue} ({inv.city})</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <span className="text-[11px] text-neutral-400">
                      Dress code : <strong className="text-white">{inv.dressCode || 'Élégant'}</strong>
                    </span>

                    {inv.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                          className="px-3.5 py-1.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase cursor-pointer"
                        >
                          Accepter
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondInvitation(inv.id, 'declined')}
                          className="px-3.5 py-1.5 rounded-full bg-white/10 text-white font-agrandir-bold text-xs uppercase cursor-pointer"
                        >
                          Décliner
                        </button>
                      </div>
                    ) : inv.status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedInvitationForQr(inv)}
                        className="px-4 py-2 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase cursor-pointer flex items-center gap-1.5"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-black" />
                        <span>Pass d'accès QR</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <Mail className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Aucune invitation privée en attente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION F : MY ORDERS (HISTORIQUE DES COMMANDES ET ACHATS)            */}
      {/* ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Historique des Commandes
            </h2>
            <p className="text-xs text-neutral-400">
              Retrouvez le détail de toutes vos commandes passées sur LUMARÉEL.
            </p>
          </div>

          {wallet?.orders && wallet.orders.length > 0 ? (
            <div className="space-y-3">
              {wallet.orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {ord.orderReference || ord.reference || ord.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-agrandir-bold uppercase ${
                          ord.paymentStatus === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {ord.paymentStatus === 'completed' ? 'Payée' : 'En attente'}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-400">
                      {ord.items?.map((it: any) => `${it.quantity}× ${it.categoryName}`).join(', ') ||
                        `${ord.quantity || 1}× ${ord.categoryName || 'Billet(s)'}`}
                    </div>

                    <div className="text-[11px] text-neutral-500 font-mono">
                      Passée le {new Date(ord.createdAt).toLocaleDateString('fr-FR')} via{' '}
                      {(ord.paymentMethod || ord.paymentProvider || 'WAVE').toUpperCase()}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-none border-white/5 pt-2 sm:pt-0">
                    <div className="font-mono font-bold text-base text-[#d4af37]">
                      {(ord.totalAmount || 0).toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase mt-0.5">
                      Paiement Sécurisé
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Aucune commande enregistrée.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION G : MY PAYMENTS (PAIEMENTS ET REÇUS CONFIRMÉS)               */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Paiements &amp; Reçus Fiscaux
            </h2>
            <p className="text-xs text-neutral-400">
              Historique financier vérifié des transactions bancaires et Mobile Money réelles.
            </p>
          </div>

          {wallet?.payments && wallet.payments.length > 0 ? (
            <div className="space-y-3">
              {wallet.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="font-mono font-bold text-xs sm:text-sm text-white truncate">
                      Réf : {p.reference}
                    </div>
                    <div className="text-xs text-neutral-300 truncate">
                      {p.product}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      {new Date(p.date).toLocaleDateString('fr-FR')} via {p.method.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm sm:text-base text-white">
                      {p.amount.toLocaleString('fr-FR')} {p.currency}
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-agrandir-bold text-emerald-400 uppercase">
                      Confirmé
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <Receipt className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Aucun paiement confirmé répertorié.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION H : MY ACTIVITY (TIMELINE DU COMPTE)                         */}
      {/* ===================================================================== */}
      {activeTab === 'activity' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Historique des Activités
            </h2>
            <p className="text-xs text-neutral-400">
              Journal d'audit transparent de vos actions, passages aux portes et validations.
            </p>
          </div>

          {wallet?.activities && wallet.activities.length > 0 ? (
            <div className="relative border-l border-white/15 ml-4 space-y-6 py-2">
              {wallet.activities.map((act) => (
                <div key={act.id} className="relative pl-6 space-y-1">
                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#d4af37] ring-4 ring-black" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-agrandir-bold text-sm text-white">
                      {act.title}
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {new Date(act.timestamp).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    {act.description}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <Activity className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                Aucune activité récente.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION I : MY PROFILE (INFORMATIONS PERSONNELLES)                   */}
      {/* ===================================================================== */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-2xl animate-fadeIn">
          <div className="border-b border-white/10 pb-4">
            <h2 className="text-xl font-agrandir-extrabold uppercase">
              Mon Profil Membre
            </h2>
            <p className="text-xs text-neutral-400">
              Identité nominative associée à votre portefeuille LUMARÉEL.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Nom complet (Identité nominative certifiée)
              </label>
              <div className="p-3.5 rounded-xl bg-black border border-white/15 text-sm font-agrandir-bold text-white">
                {wallet?.user.name || currentUser?.name || 'Dylan Bienao'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Adresse e-mail officielle
              </label>
              <div className="p-3.5 rounded-xl bg-black border border-white/15 text-sm font-mono text-white">
                {wallet?.user.email || currentUser?.email || 'bienaodylan428@gmail.com'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                Rôle &amp; Statut de compte
              </label>
              <div className="p-3.5 rounded-xl bg-black border border-white/15 text-xs font-agrandir-semibold text-[#d4af37] uppercase flex items-center justify-between">
                <span>{wallet?.user.role || 'Founders Member'}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL QR BILLET PLEIN ÉCRAN                                          */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {selectedTicketForQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedTicketForQr(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#101010] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedTicketForQr(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                  BILLET DE CONCERT OFFICIEL
                </div>
                <h3 className="font-agrandir-extrabold text-base text-white uppercase">
                  {selectedTicketForQr.eventTitle}
                </h3>
                <div className="text-xs font-agrandir-bold text-neutral-300">
                  {selectedTicketForQr.categoryName} · {selectedTicketForQr.serialNumber || selectedTicketForQr.id}
                </div>
              </div>

              {/* QR Code haute visibilité */}
              <div className="p-4 rounded-2xl bg-white shadow-2xl mx-auto w-fit">
                {ticketQrModalUrl ? (
                  <img
                    src={ticketQrModalUrl}
                    alt="QR Code Billet"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-black" />
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-400">
                Titulaire : <strong className="text-white">{selectedTicketForQr.holderName || wallet?.user.name}</strong>
              </div>

              <p className="text-[10px] text-neutral-500">
                Chaque billet est individuel et ne peut être validé qu'une seule fois à l'entrée.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL QR INVITATION PLEIN ÉCRAN                                      */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {selectedInvitationForQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setSelectedInvitationForQr(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#101010] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedInvitationForQr(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                  INVITATION PRIVÉE CONFIDENTIELLE
                </div>
                <h3 className="font-agrandir-extrabold text-base text-white uppercase">
                  {selectedInvitationForQr.title}
                </h3>
                <div className="text-xs text-neutral-300">
                  {selectedInvitationForQr.venue}
                </div>
              </div>

              {/* QR Code haute visibilité */}
              <div className="p-4 rounded-2xl bg-white shadow-2xl mx-auto w-fit">
                {invitationQrModalUrl ? (
                  <img
                    src={invitationQrModalUrl}
                    alt="QR Code Invitation"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-black" />
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-300">
                Invité : <strong className="text-white">{selectedInvitationForQr.recipientName}</strong>
              </div>

              <div className="text-[10px] text-[#d4af37] uppercase font-mono">
                Valable pour {selectedInvitationForQr.plusOnesAllowed + 1} personne(s)
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
