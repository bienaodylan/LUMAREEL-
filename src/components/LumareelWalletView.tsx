import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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
  MembershipCard,
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
  ChevronDown,
  Radio
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';

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

interface LumareelWalletViewProps {
  embedded?: boolean;
  initialCard?: MembershipCard | null;
}

const OFFICIAL_CARD_PERKS_FR = [
  'Accès prioritaire dans la file d’attente',
  'Place de parking réservée',
  'Placement VIP aux premiers rangs',
  'Rafraîchissement offert',
  'Accès aux préventes',
  'Accès aux Meet & Greet',
  'Réduction sur les articles partenaires',
  'Réduction chez nos partenaires',
];

const OFFICIAL_CARD_PERKS_EN = [
  'Priority fast-track queue access',
  'Reserved parking spot',
  'Front-row VIP seating',
  'Complimentary drink',
  'Early presale ticket access',
  'Meet & Greet access',
  'Discounts on partner merch & items',
  'Discounts at partner venues & brands',
];

export const LumareelWalletView: React.FC<LumareelWalletViewProps> = ({
  embedded = false,
  initialCard = null,
}) => {
  const {
    currentUser,
    customerOrders,
    refreshCustomerOrders,
    setCurrentPage,
    showToast,
    language,
    t,
  } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';

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
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      if (session?.access_token) {
        const res = await fetch('/api/wallet/overview', { headers });
        const data = await res.json();
        if (data.success && data.overview) {
          setWallet(data.overview);
          return;
        }
      }

      // Fallback direct via /api/membership/my-card si session email locale active
      if (currentUser?.email) {
        const cardRes = await fetch(
          `/api/membership/my-card?email=${encodeURIComponent(currentUser.email)}`,
          { headers }
        );
        const cardData = await cardRes.json();
        if (cardData.success && cardData.hasCard && cardData.card) {
          setWallet({
            user: {
              id: currentUser.id,
              name: cardData.card.cardholderName || currentUser.name,
              email: cardData.card.cardholderEmail || currentUser.email,
            },
            card: cardData.card,
            tickets: cardData.concertTickets || [],
            benefits: cardData.benefits || [],
            invitations: [],
            orders: customerOrders || [],
            payments: [],
            activities: [],
            metrics: {
              activeTicketsCount: (cardData.concertTickets || []).length,
              availableBenefitsCount: (cardData.benefits || []).length || 8,
              activeInvitationsCount: 0,
            },
          } as unknown as WalletOverview);
          return;
        }
      }

      setWallet(null);
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
        throw new Error(data.error || (isEn ? 'Unable to update invitation.' : 'Impossible de mettre à jour l’invitation.'));
      }
      showToast(
        response === 'accepted'
          ? isEn
            ? 'Invitation accepted! Your access QR is active.'
            : 'Invitation acceptée ! Votre QR d’accès est actif.'
          : isEn
          ? 'Invitation declined.'
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
          redeemedBy: currentUser?.name || wallet.user.name || (isEn ? 'Member Holder' : 'Titulaire Membre'),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Unable to redeem perk.' : 'Impossible de valider le privilège.'));
      }
      showToast(
        isEn
          ? `Perk validated! Reference: ${data.redemption?.redemptionReference}`
          : `Privilège validé ! Référence : ${data.redemption?.redemptionReference}`,
        'success'
      );
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
        throw new Error(data.error || (isEn ? 'Token rotation failed.' : 'Échec de rotation du jeton.'));
      }
      showToast(
        isEn
          ? 'QR token regenerated successfully. Previous token revoked.'
          : 'Jeton QR régénéré avec succès. L’ancien jeton a été révoqué.',
        'success'
      );
      fetchWalletOverview();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsRotatingCardToken(false);
    }
  };

  const navItems: Array<{ id: WalletTab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }> = [
    { id: 'overview', label: isEn ? 'Overview' : 'Vue d’ensemble', icon: Wallet },
    { id: 'membership', label: 'LUMARÉEL CARD', icon: Crown, count: wallet?.card ? 1 : 0 },
    { id: 'tickets', label: isEn ? 'My Tickets' : 'Mes Billets', icon: TicketIcon, count: wallet?.metrics.activeTicketsCount },
    { id: 'benefits', label: isEn ? 'Perks' : 'Avantages', icon: Sparkles, count: wallet?.metrics.availableBenefitsCount },
    { id: 'invitations', label: isEn ? 'Invitations' : 'Invitations', icon: Mail, count: wallet?.metrics.activeInvitationsCount },
    { id: 'orders', label: isEn ? 'Orders' : 'Commandes', icon: ShoppingBag, count: wallet?.orders.length },
    { id: 'payments', label: isEn ? 'Payments & Receipts' : 'Paiements & Reçus', icon: Receipt },
    { id: 'activity', label: isEn ? 'Activity' : 'Activités', icon: Activity },
    { id: 'profile', label: isEn ? 'My Profile' : 'Mon Profil', icon: User },
  ];

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-32 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#d4af37]" />
        <p className="text-xs text-neutral-400 font-agrandir-regular">
          {isEn ? 'Syncing your LUMARÉEL WALLET...' : 'Synchronisation de votre LUMARÉEL WALLET...'}
        </p>
      </div>
    );
  }

  const activeCard = wallet?.card || initialCard;
  const officialPerks = isEn ? OFFICIAL_CARD_PERKS_EN : OFFICIAL_CARD_PERKS_FR;

  return (
    <div className="w-full max-w-5xl mx-auto px-1 sm:px-4 pt-1 sm:pt-3 pb-16 select-none font-agrandir-regular text-white">
      {/* Barre de retour supérieure (uniquement hors mode intégré) */}
      {!embedded && (
        <div className="flex items-center justify-between gap-3 mb-6 pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group"
            title={t('nav.backHome')}
          >
            <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-0.5 transition-transform" />
            <span>{t('nav.back')}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md group"
            title={t('nav.close')}
            aria-label={t('nav.close')}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>
      )}

      {/* En-tête épuré : Ma Black Card installée */}
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono tracking-[0.22em] text-[#d4af37] uppercase mb-1">
            {isEn ? 'YOUR BLACK CARD' : 'VOTRE BLACK CARD'}
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            {isEn ? 'Installed & Active' : 'Carte installée'}
          </h1>
        </div>

        <button
          type="button"
          onClick={fetchWalletOverview}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#d4af37]" />
          <span className="hidden sm:inline">{isEn ? 'Refresh' : 'Actualiser'}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* CARTE NOIRE INSTALLÉE AU PREMIER PLAN                                */}
      {/* ===================================================================== */}
      {activeCard && (
        <section className="mb-8 rounded-3xl bg-gradient-to-b from-[#111111] via-[#090909] to-[#050505] border border-white/10 px-4 sm:px-8 py-7 sm:py-10 shadow-2xl">
          <DigitalMembershipCard card={activeCard} />
        </section>
      )}

      {/* Navigation en onglets horizontale simplifiée */}
      <div className="mb-7 border-b border-white/10 overflow-x-auto no-scrollbar">
        <nav className="flex items-center gap-2 min-w-max pb-3">
          {navItems
            .filter((tab) => ['overview', 'tickets', 'benefits', 'invitations', 'activity'].includes(tab.id))
            .map((tab) => {
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
                  <span>{tab.id === 'overview' ? (isEn ? 'My 8 Perks' : 'Mes 8 avantages') : tab.label}</span>
                </button>
              );
            })}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* SECTION A : MES 8 AVANTAGES ACTIFS & RÉSUMÉ                          */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white">
                {isEn ? 'Included with your Black Card' : 'Inclus avec votre Black Card'}
              </h2>
              <span className="text-[11px] font-mono text-[#d4af37]">8 / 8</span>
            </div>

            <ol className="divide-y divide-white/10 border-y border-white/10">
              {officialPerks.map((perk, idx) => (
                <li key={perk} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] text-[#d4af37] shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-white font-agrandir-semibold leading-snug">
                      {perk}
                    </span>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                </li>
              ))}
            </ol>
          </div>
          {false && (
            <div />
          )}

          {/* Billets Récents & Activités Récents */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Prochains Billets */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <TicketIcon className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm uppercase tracking-wider">
                    {isEn ? 'Recent Tickets' : 'Derniers Billets Émis'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tickets')}
                  className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                >
                  {isEn ? `View all (${wallet?.tickets.length || 0})` : `Voir tout (${wallet?.tickets.length || 0})`}
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
                        {isEn ? 'Show QR' : 'Afficher QR'}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  {isEn ? 'No active tickets at the moment.' : 'Aucun billet actif pour le moment.'}
                </p>
              )}
            </div>

            {/* Activités Récentes */}
            <div className="p-5 sm:p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm uppercase tracking-wider">
                    {isEn ? 'Recent Activity Log' : 'Journal d’Activité Récent'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                >
                  {isEn ? 'Full history' : 'Historique complet'}
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
                        {new Date(act.timestamp).toLocaleDateString(locale)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-500 py-6 text-center">
                  {isEn ? 'No activity recorded.' : 'Aucune activité enregistrée.'}
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
                        ● {isEn ? 'Contactless Active' : 'Sans Contact Actif'}
                      </span>

                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-[#d4af37]">
                        <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>{isEn ? 'Instant Tap Enabled' : 'Passage Instantané Autorisé'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Composant de carte numérique CR-80 3D standard */}
                  <DigitalMembershipCard
                    card={wallet.card}
                  />

                {/* Métadonnées de validité & de sécurité */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">
                      {isEn ? 'Issued date' : "Date d'émission"}
                    </div>
                    <div className="font-agrandir-bold text-white">
                      {new Date(wallet.card.validFrom).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">
                      {isEn ? 'Expiry date' : "Date d'expiration"}
                    </div>
                    <div className="font-agrandir-bold text-white">
                      {new Date(wallet.card.expiresAt).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1">
                    <div className="text-[10px] text-neutral-400 uppercase font-mono">
                      {isEn ? 'Physical Card Status' : 'Statut Carte Physique'}
                    </div>
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
                {isEn ? 'No active LUMARÉEL CARD membership' : 'Aucune adhésion LUMARÉEL CARD active'}
              </h2>
              <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                {isEn
                  ? 'Claim your certified permanent number and join the exclusive limited series of 100 Founding Members.'
                  : 'Obtenez votre numéro permanent certifié et rejoignez la série limitée exclusive des 100 Membres Fondateurs.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('card')}
                className="px-8 py-3.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase tracking-wider shadow-xl shadow-[#d4af37]/20 transition-all cursor-pointer"
              >
                {isEn ? 'Join Founders Edition' : 'Rejoindre la Founders Edition'}
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
                {isEn ? 'My Concert Tickets' : 'Mes Billets de Concerts'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isEn
                  ? 'Each ticket has its own individual QR code to present at the gate.'
                  : "Chaque billet dispose de son propre QR code individuel à présenter à l'entrée."}
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
                        {isEn ? 'Tier:' : 'Catégorie :'} {tkt.categoryName}
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider ${
                        tkt.status === 'used'
                          ? 'bg-neutral-800 text-neutral-400 border border-white/10'
                          : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                      }`}
                    >
                      {tkt.status === 'used'
                        ? isEn ? 'Used' : 'Utilisé'
                        : isEn ? 'Valid' : 'Valide'}
                    </span>
                  </div>

                  <div className="border-t border-white/5 pt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{tkt.eventDate || (isEn ? 'Official date' : 'Date officielle')}</span>
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
                      {isEn ? 'Holder:' : 'Titulaire :'} {tkt.holderName || wallet.user.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedTicketForQr(tkt)}
                      className="px-4 py-2 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-black" />
                      <span>{isEn ? 'Show QR' : 'Afficher QR'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <TicketIcon className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                {isEn ? 'You do not have any concert tickets yet.' : 'Vous ne possédez aucun billet de concert pour le moment.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                {isEn ? 'Discover lineup' : 'Découvrir la programmation'}
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
              {isEn ? 'My Perks & Privileges' : 'Mes Privilèges & Avantages'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'Live perks registered and verified server-side for LUMARÉEL CARD holders.'
                : 'Avantages réels enregistrés et contrôlés côté serveur pour les titulaires LUMARÉEL CARD.'}
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
                        {isExhausted
                          ? isEn ? 'Used up' : 'Épuisé'
                          : isEn
                          ? `${remaining} left`
                          : `${remaining} restant${remaining > 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed font-light">
                      {benefit.description}
                    </p>

                    <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-neutral-400">
                        {isEn ? (
                          <>
                            Used: <strong className="text-white">{used}</strong> of <strong>{totalAllowed}</strong>
                          </>
                        ) : (
                          <>
                            Utilisations : <strong className="text-white">{used}</strong> sur <strong>{totalAllowed}</strong>
                          </>
                        )}
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
                          <span>{isEn ? 'Redeem now' : 'Faire valider'}</span>
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
                {isEn
                  ? 'No perks attached to this account yet. Join the Founders Edition to unlock exclusive benefits.'
                  : 'Aucun avantage rattaché à ce compte. Rejoignez la Founders Edition pour débloquer les privilèges exclusifs.'}
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
              {isEn ? 'My Private Invitations' : 'Mes Invitations Privées'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'Confidential access to galas, artist receptions, and acoustic showcases.'
                : "Accès confidentiels aux galas, réceptions d'artistes et showcases acoustiques."}
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
                      {inv.status === 'accepted'
                        ? isEn ? 'Confirmed' : 'Confirmée'
                        : inv.status === 'used'
                        ? isEn ? 'Used' : 'Utilisée'
                        : isEn ? 'Pending' : 'En attente'}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 font-light leading-relaxed">
                    {inv.description}
                  </p>

                  <div className="border-t border-white/5 pt-3 space-y-1.5 text-xs text-neutral-400 font-mono">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{inv.eventDate} {isEn ? 'at' : 'à'} {inv.eventTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{inv.venue} ({inv.city})</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-white/10">
                    <span className="text-[11px] text-neutral-400">
                      {isEn ? 'Dress code:' : 'Dress code :'} <strong className="text-white">{inv.dressCode || (isEn ? 'Smart' : 'Élégant')}</strong>
                    </span>

                    {inv.status === 'pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                          className="px-3.5 py-1.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase cursor-pointer"
                        >
                          {isEn ? 'Accept' : 'Accepter'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespondInvitation(inv.id, 'declined')}
                          className="px-3.5 py-1.5 rounded-full bg-white/10 text-white font-agrandir-bold text-xs uppercase cursor-pointer"
                        >
                          {isEn ? 'Decline' : 'Décliner'}
                        </button>
                      </div>
                    ) : inv.status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedInvitationForQr(inv)}
                        className="px-4 py-2 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase cursor-pointer flex items-center gap-1.5"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-black" />
                        <span>{isEn ? 'QR Access Pass' : "Pass d'accès QR"}</span>
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
                {isEn ? 'No pending private invitations.' : 'Aucune invitation privée en attente.'}
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
              {isEn ? 'Order History' : 'Historique des Commandes'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn ? 'Review all your past orders placed on LUMARÉEL.' : 'Retrouvez le détail de toutes vos commandes passées sur LUMARÉEL.'}
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
                        {ord.paymentStatus === 'completed'
                          ? isEn ? 'Paid' : 'Payée'
                          : isEn ? 'Pending' : 'En attente'}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-400">
                      {ord.items?.map((it: any) => `${it.quantity}× ${it.categoryName}`).join(', ') ||
                        `${ord.quantity || 1}× ${ord.categoryName || (isEn ? 'Ticket(s)' : 'Billet(s)')}`}
                    </div>

                    <div className="text-[11px] text-neutral-500 font-mono">
                      {isEn ? 'Placed on' : 'Passée le'} {new Date(ord.createdAt).toLocaleDateString(locale)} {isEn ? 'via' : 'via'}{' '}
                      {(ord.paymentMethod || ord.paymentProvider || 'WAVE').toUpperCase()}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-none border-white/5 pt-2 sm:pt-0">
                    <div className="font-mono font-bold text-base text-[#d4af37]">
                      {(ord.totalAmount || 0).toLocaleString(locale)} FCFA
                    </div>
                    <div className="text-[10px] text-neutral-500 uppercase mt-0.5">
                      {isEn ? 'Secure Payment' : 'Paiement Sécurisé'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                {isEn ? 'No orders found.' : 'Aucune commande enregistrée.'}
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
              {isEn ? 'Payments & Receipts' : 'Paiements & Reçus Fiscaux'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'Verified history of completed bank card and Mobile Money transactions.'
                : 'Historique financier vérifié des transactions bancaires et Mobile Money réelles.'}
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
                      {isEn ? 'Ref:' : 'Réf :'} {p.reference}
                    </div>
                    <div className="text-xs text-neutral-300 truncate">
                      {p.product}
                    </div>
                    <div className="text-[11px] text-neutral-500 font-mono">
                      {new Date(p.date).toLocaleDateString(locale)} via {p.method.toUpperCase()}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm sm:text-base text-white">
                      {p.amount.toLocaleString(locale)} {p.currency}
                    </div>
                    <span className="inline-block mt-1 text-[10px] font-agrandir-bold text-emerald-400 uppercase">
                      {isEn ? 'Confirmed' : 'Confirmé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-[#0c0c0c] border border-white/10 text-center space-y-4">
              <Receipt className="w-10 h-10 text-neutral-500 mx-auto" />
              <p className="text-xs text-neutral-400">
                {isEn ? 'No confirmed payments found.' : 'Aucun paiement confirmé répertorié.'}
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
              {isEn ? 'Activity History' : 'Historique des Activités'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'Transparent audit log of your actions, gate entries, and perk validations.'
                : "Journal d'audit transparent de vos actions, passages aux portes et validations."}
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
                      {new Date(act.timestamp).toLocaleString(locale)}
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
                {isEn ? 'No recent activity.' : 'Aucune activité récente.'}
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
              {isEn ? 'My Member Profile' : 'Mon Profil Membre'}
            </h2>
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'Verified identity linked to your LUMARÉEL wallet.'
                : 'Identité nominative associée à votre portefeuille LUMARÉEL.'}
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                {isEn ? 'Full Name (Certified Identity)' : 'Nom complet (Identité nominative certifiée)'}
              </label>
              <div className="p-3.5 rounded-xl bg-black border border-white/15 text-sm font-agrandir-bold text-white">
                {wallet?.user.name || currentUser?.name || 'Dylan Bienao'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                {isEn ? 'Official Email Address' : 'Adresse e-mail officielle'}
              </label>
              <div className="p-3.5 rounded-xl bg-black border border-white/15 text-sm font-mono text-white">
                {wallet?.user.email || currentUser?.email || 'bienaodylan428@gmail.com'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                {isEn ? 'Account Role & Status' : 'Rôle & Statut de compte'}
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
                aria-label={t('nav.close')}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                  {isEn ? 'OFFICIAL CONCERT TICKET' : 'BILLET DE CONCERT OFFICIEL'}
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
                    alt="QR Code Ticket"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-black" />
                  </div>
                )}
              </div>

              <div className="text-xs text-neutral-400">
                {isEn ? 'Holder:' : 'Titulaire :'} <strong className="text-white">{selectedTicketForQr.holderName || wallet?.user.name}</strong>
              </div>

              <p className="text-[10px] text-neutral-500">
                {isEn
                  ? 'Each ticket is individual and can only be scanned once at venue gates.'
                  : "Chaque billet est individuel et ne peut être validé qu'une seule fois à l'entrée."}
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
                aria-label={t('nav.close')}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                  {isEn ? 'CONFIDENTIAL PRIVATE INVITE' : 'INVITATION PRIVÉE CONFIDENTIELLE'}
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
                {isEn ? 'Guest:' : 'Invité :'} <strong className="text-white">{selectedInvitationForQr.recipientName}</strong>
              </div>

              <div className="text-[10px] text-[#d4af37] uppercase font-mono">
                {isEn
                  ? `Valid for ${selectedInvitationForQr.plusOnesAllowed + 1} guest(s)`
                  : `Valable pour ${selectedInvitationForQr.plusOnesAllowed + 1} personne(s)`}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
