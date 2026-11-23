import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import {
  WalletOverview,
  PrivateInvitation,
  Ticket,
  MembershipCard,
} from '../types';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import {
  Ticket as TicketIcon,
  Mail,
  Activity,
  ArrowLeft,
  X,
  RefreshCw,
  Calendar,
  MapPin,
  QrCode,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';

type WalletTab = 'tickets' | 'invitations' | 'activity';

interface LumareelWalletViewProps {
  embedded?: boolean;
  initialCard?: MembershipCard | null;
}

/**
 * Vue Black Card installée — inspirée d'une carte bancaire moderne (Apple Wallet / Revolut).
 * - Aucun bloc lourd ni carte imbriquée.
 * - Aucune section ni bouton "Mes avantages".
 * - Onglets épurés uniquement pour Billets, Invitations et Activités.
 */
export const LumareelWalletView: React.FC<LumareelWalletViewProps> = ({
  embedded = false,
  initialCard = null,
}) => {
  const {
    currentUser,
    customerOrders,
    setCurrentPage,
    showToast,
    language,
    t,
  } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';

  const [activeTab, setActiveTab] = useState<WalletTab>('tickets');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [wallet, setWallet] = useState<WalletOverview | null>(null);

  // Modales QR plein écran pour les billets & invitations
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [ticketQrModalUrl, setTicketQrModalUrl] = useState<string>('');
  const [selectedInvitationForQr, setSelectedInvitationForQr] = useState<PrivateInvitation | null>(null);
  const [invitationQrModalUrl, setInvitationQrModalUrl] = useState<string>('');

  // Bloquer le scroll arrière-plan lorsqu'une modale QR est ouverte
  useEffect(() => {
    const isModalOpen = Boolean(selectedTicketForQr || selectedInvitationForQr);
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedTicketForQr, selectedInvitationForQr]);

  useEffect(() => {
    fetchWalletOverview(false);
  }, [currentUser]);

  const fetchWalletOverview = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
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
            benefits: [],
            invitations: [],
            orders: customerOrders || [],
            payments: [],
            activities: [],
            metrics: {
              activeTicketsCount: (cardData.concertTickets || []).length,
              availableBenefitsCount: 0,
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
      setRefreshing(false);
    }
  };

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

  const handleRespondInvitation = async (invitationId: string, response: 'accepted' | 'declined') => {
    try {
      const res = await fetch(`/api/wallet/invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(
          data.error ||
            (isEn ? 'Unable to update invitation.' : 'Impossible de mettre à jour l’invitation.')
        );
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
      fetchWalletOverview(true);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  if (loading && !initialCard) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 pt-16 pb-24 flex flex-col items-center justify-center min-h-[55vh] space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#d4af37]" />
        <p className="text-xs text-neutral-400">
          {isEn ? 'Loading your LUMARÉEL Black Card...' : 'Chargement de votre LUMARÉEL Black Card...'}
        </p>
      </div>
    );
  }

  const activeCard = wallet?.card || initialCard;

  // Fusionner les billets issus du wallet et des commandes locales complétées (sans doublons)
  const localTickets: Ticket[] = [];
  (customerOrders || []).forEach((ord) => {
    if (ord.paymentStatus === 'completed' && Array.isArray(ord.tickets)) {
      localTickets.push(...ord.tickets);
    }
  });
  const seenTicketIds = new Set<string>();
  const tickets: Ticket[] = [...(wallet?.tickets || []), ...localTickets].filter((tkt) => {
    if (!tkt?.id || seenTicketIds.has(tkt.id)) return false;
    seenTicketIds.add(tkt.id);
    return true;
  });

  const invitations = wallet?.invitations || [];
  const activities = wallet?.activities || [];

  const tabs: Array<{ id: WalletTab; label: string; count?: number }> = [
    { id: 'tickets', label: isEn ? 'Tickets' : 'Billets', count: tickets.length },
    { id: 'invitations', label: 'Invitations', count: invitations.length },
    { id: 'activity', label: isEn ? 'Activity' : 'Activités' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 pt-2 pb-12 select-none font-agrandir-regular text-white">
      {/* Barre de retour (uniquement si affichée hors page membre) */}
      {!embedded && (
        <div className="flex items-center justify-between gap-3 mb-6">
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="min-h-[44px] inline-flex items-center gap-2 text-xs font-agrandir-bold tracking-wider text-neutral-300 hover:text-white uppercase transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
            <span>{t('nav.back')}</span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* CARTE NOIRE INSTALLÉE — PRÉSENTATION BANCAIRE OUVERTE (ZÉRO BLOCS)    */}
      {/* ===================================================================== */}
      {activeCard && (
        <section className="pt-2 pb-9">
          <DigitalMembershipCard
            card={activeCard}
            onRefresh={() => fetchWalletOverview(true)}
            isRefreshing={refreshing}
          />
        </section>
      )}

      {/* ===================================================================== */}
      {/* ONGLETS ÉPURÉS : BILLETS · INVITATIONS · ACTIVITÉS (SANS AVANTAGES)   */}
      {/* ===================================================================== */}
      <div className="border-b border-white/10">
        <nav
          aria-label={isEn ? 'LUMARÉEL Black Card sections' : 'Sections LUMARÉEL Black Card'}
          className="grid grid-cols-3"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative min-h-[46px] pb-3 pt-2 text-xs sm:text-sm font-agrandir-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isActive ? 'text-[#d4af37]' : 'text-neutral-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="wallet-active-tab-line"
                    className="absolute bottom-0 inset-x-3 h-[2px] rounded-full bg-white"
                    transition={{ duration: 0.2 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ===================================================================== */}
      {/* 1. BILLETS — LISTE OUVERTE FAÇON RELEVÉ BANCAIRE                      */}
      {/* ===================================================================== */}
      {activeTab === 'tickets' && (
        <div className="pt-2 animate-fadeIn">
          {tickets.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {tickets.map((tkt) => {
                const isCancelled = tkt.status === 'cancelled';
                const isUsed = tkt.status === 'used';
                return (
                  <li
                    key={tkt.id}
                    className={`py-4 flex items-center justify-between gap-3 ${
                      isCancelled ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                        <TicketIcon className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-bold text-white truncate">
                          {tkt.eventTitle}
                        </div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">
                          {tkt.categoryName}
                          {tkt.eventDate ? ` · ${tkt.eventDate}` : ''}
                        </div>
                      </div>
                    </div>

                    {isCancelled ? (
                      <span className="text-xs text-rose-400 shrink-0">
                        {isEn ? 'Transferred' : 'Transféré'}
                      </span>
                    ) : isUsed ? (
                      <span className="text-xs text-neutral-500 shrink-0">
                        {isEn ? 'Used' : 'Utilisé'}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForQr(tkt)}
                        className="min-h-[40px] px-3.5 rounded-full bg-white/10 hover:bg-white hover:text-black text-white text-xs font-agrandir-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-14 text-center space-y-4">
              <p className="text-sm text-neutral-400">
                {isEn ? 'No concert tickets yet.' : 'Aucun billet de concert pour le moment.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {isEn ? 'Explore concerts' : 'Voir les concerts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. INVITATIONS — LISTE OUVERTE SANS BLOCS                             */}
      {/* ===================================================================== */}
      {activeTab === 'invitations' && (
        <div className="pt-2 animate-fadeIn">
          {invitations.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {invitations.map((inv) => (
                <li key={inv.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-[#d4af37]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-bold text-white truncate">
                          {inv.title}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#d4af37]" />
                            {inv.eventDate} · {inv.eventTime}
                          </span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" />
                            {inv.venue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-agrandir-semibold shrink-0 ${
                        inv.status === 'accepted'
                          ? 'text-emerald-400'
                          : inv.status === 'used'
                          ? 'text-neutral-500'
                          : 'text-[#d4af37]'
                      }`}
                    >
                      {inv.status === 'accepted'
                        ? isEn ? 'Confirmed' : 'Confirmée'
                        : inv.status === 'used'
                        ? isEn ? 'Used' : 'Utilisée'
                        : isEn ? 'Pending' : 'En attente'}
                    </span>
                  </div>

                  {inv.status === 'pending' && (
                    <div className="pl-[54px] flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                        className="min-h-[40px] px-4 rounded-full bg-white text-black font-agrandir-bold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-neutral-200 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Accept' : 'Accepter'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, 'declined')}
                        className="min-h-[40px] px-4 rounded-full bg-white/10 text-neutral-300 hover:text-white font-agrandir-semibold text-xs cursor-pointer transition-colors"
                      >
                        {isEn ? 'Decline' : 'Décliner'}
                      </button>
                    </div>
                  )}

                  {inv.status === 'accepted' && (
                    <div className="pl-[54px]">
                      <button
                        type="button"
                        onClick={() => setSelectedInvitationForQr(inv)}
                        className="min-h-[40px] px-4 rounded-full bg-white/10 hover:bg-white hover:text-black text-white text-xs font-agrandir-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Open pass QR' : 'Afficher le pass QR'}</span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-14 text-center">
              <p className="text-sm text-neutral-400">
                {isEn ? 'No private invitations yet.' : 'Aucune invitation privée pour le moment.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ACTIVITÉS — JOURNAL LINÉAIRE FAÇON TRANSACTIONS BANCAIRES          */}
      {/* ===================================================================== */}
      {activeTab === 'activity' && (
        <div className="pt-2 animate-fadeIn">
          {activities.length > 0 ? (
            <ul className="divide-y divide-white/10">
              {activities.map((act) => (
                <li key={act.id} className="py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-[#d4af37]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-agrandir-bold text-white truncate">
                        {act.title}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-neutral-500 shrink-0 pt-0.5">
                    {new Date(act.timestamp).toLocaleDateString(locale, {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-14 text-center">
              <p className="text-sm text-neutral-400">
                {isEn ? 'No recent activity.' : 'Aucune activité récente.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODALE QR BILLET PLEIN ÉCRAN (PORTAL SUR DOCUMENT.BODY)               */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedTicketForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedTicketForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="bg-[#101010] border border-white/15 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTicketForQr(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                      {isEn ? 'CONCERT TICKET' : 'BILLET DE CONCERT'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-white uppercase truncate">
                      {selectedTicketForQr.eventTitle}
                    </h3>
                    <div className="text-xs text-neutral-300">
                      {selectedTicketForQr.categoryName} · {selectedTicketForQr.serialNumber || selectedTicketForQr.id}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white shadow-2xl mx-auto w-fit">
                    {ticketQrModalUrl ? (
                      <img
                        src={ticketQrModalUrl}
                        alt="QR Code Ticket"
                        className="w-52 h-52 object-contain"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-7 h-7 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-neutral-400">
                    {selectedTicketForQr.holderName || wallet?.user.name}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ===================================================================== */}
      {/* MODALE QR INVITATION PLEIN ÉCRAN (PORTAL SUR DOCUMENT.BODY)           */}
      {/* ===================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedInvitationForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedInvitationForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="bg-[#101010] border border-[#d4af37]/30 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedInvitationForQr(null)}
                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-mono text-[#d4af37] tracking-widest uppercase">
                      {isEn ? 'PRIVATE INVITATION' : 'INVITATION PRIVÉE'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-white uppercase truncate">
                      {selectedInvitationForQr.title}
                    </h3>
                    <div className="text-xs text-neutral-300">{selectedInvitationForQr.venue}</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white shadow-2xl mx-auto w-fit">
                    {invitationQrModalUrl ? (
                      <img
                        src={invitationQrModalUrl}
                        alt="QR Code Invitation"
                        className="w-52 h-52 object-contain"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-7 h-7 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-neutral-300">
                    {selectedInvitationForQr.recipientName}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
