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
import { loadStoredMemberCard, saveStoredMemberCard } from '../utils/memberCardStorage';
import { SkeletonBlock, StatusBadge, Tabs } from './ui/LumareelKit';
import {
  Ticket as TicketIcon,
  Mail,
  Activity,
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
 * Affichage de la carte active (« Ta carte ») avec Billets · Invitations · Activités.
 * Strictement Noir & Blanc, entièrement réactif aux modes Clair et Sombre.
 */
export const LumareelWalletView: React.FC<LumareelWalletViewProps> = ({
  embedded = false,
  initialCard = null,
}) => {
  const {
    currentUser,
    customerOrders,
    setCurrentPage,
    goBack,
    showToast,
    language,
    t,
  } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';

  const [activeTab, setActiveTab] = useState<WalletTab>('tickets');
  const [loading, setLoading] = useState<boolean>(
    !(initialCard || loadStoredMemberCard(currentUser?.email))
  );
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const storedFallbackCard = loadStoredMemberCard(currentUser?.email);

  const parseJsonSafely = async (res: Response): Promise<any | null> => {
    try {
      const text = await res.text();
      return text && text.trim() ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [ticketQrModalUrl, setTicketQrModalUrl] = useState<string>('');
  const [selectedInvitationForQr, setSelectedInvitationForQr] =
    useState<PrivateInvitation | null>(null);
  const [invitationQrModalUrl, setInvitationQrModalUrl] = useState<string>('');

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
        const data = await parseJsonSafely(res);
        if (data?.success && data?.overview) {
          if (data.overview.card) {
            saveStoredMemberCard(data.overview.card, currentUser?.email);
          }
          setWallet(data.overview);
          return;
        }
      }

      if (currentUser?.email) {
        const cardRes = await fetch(
          `/api/membership/my-card?email=${encodeURIComponent(currentUser.email)}`,
          { headers }
        );
        const cardData = await parseJsonSafely(cardRes);
        if (cardData?.success && cardData?.hasCard && cardData?.card) {
          saveStoredMemberCard(cardData.card, currentUser.email);
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

      if (!initialCard && !loadStoredMemberCard(currentUser?.email)) {
        setWallet(null);
      }
    } catch (err) {
      console.error('Error loading member card overview:', err);
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

  const handleRespondInvitation = async (
    invitationId: string,
    response: 'accepted' | 'declined'
  ) => {
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
            ? 'Invitation accepted! Your pass is ready.'
            : 'Invitation acceptée ! Ton pass est prêt.'
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
      <div className="w-full max-w-2xl mx-auto px-5 pt-10 pb-20 space-y-6">
        <SkeletonBlock className="aspect-[85.6/53.98] max-w-[400px] mx-auto rounded-[11px]" />
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </div>
    );
  }

  const activeCard = wallet?.card || initialCard || storedFallbackCard;

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
  const activities =
    wallet?.activities && wallet.activities.length > 0
      ? wallet.activities
      : activeCard
      ? [
          {
            id: `act_init_${activeCard.id}`,
            title: isEn ? 'LUMARÉEL Black Card Activated' : 'Ta LUMARÉEL Black Card est active',
            description: isEn
              ? `Member reference ${activeCard.cardNumber}.`
              : `Référence ${activeCard.cardNumber}.`,
            timestamp: activeCard.issuedAt || new Date().toISOString(),
          },
        ]
      : [];

  return (
    <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 pb-20 select-none font-agrandir-regular text-[#111111] dark:text-white transition-colors duration-200">
      {!embedded && (
        <div className="flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-black/[0.06] hover:bg-black/[0.12] dark:bg-white/10 dark:hover:bg-white/20 border border-black/10 dark:border-white/[0.16] flex items-center justify-center text-black/70 hover:text-black dark:text-[#C8C8C8] dark:hover:text-white transition-all cursor-pointer lum-press"
            aria-label={t('nav.close')}
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* Carte active */}
      {activeCard && (
        <section className="pt-2 pb-10">
          <DigitalMembershipCard
            card={activeCard}
            onRefresh={() => fetchWalletOverview(true)}
            isRefreshing={refreshing}
          />
        </section>
      )}

      {/* Onglets Noir & Blanc : Billets · Invitations · Activités */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          {
            id: 'tickets',
            label: `${isEn ? 'Tickets' : 'Billets'}${tickets.length ? ` (${tickets.length})` : ''}`,
          },
          {
            id: 'invitations',
            label: `Invitations${invitations.length ? ` (${invitations.length})` : ''}`,
          },
          { id: 'activity', label: isEn ? 'Activity' : 'Activités' },
        ]}
      />

      {/* 1. Billets */}
      {activeTab === 'tickets' && (
        <div className="pt-2">
          {tickets.length > 0 ? (
            <ul className="divide-y divide-black/[0.08] dark:divide-white/[0.12]">
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
                      <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center shrink-0">
                        <TicketIcon
                          className="w-4 h-4 text-[#111111] dark:text-white"
                          strokeWidth={1.6}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-extrabold text-[#111111] dark:text-white truncate">
                          {tkt.eventTitle}
                        </div>
                        <div className="text-xs text-black/55 dark:text-[#9A9A9A] truncate mt-0.5">
                          {tkt.categoryName}
                          {tkt.eventDate ? ` · ${tkt.eventDate}` : ''}
                        </div>
                      </div>
                    </div>

                    {isCancelled ? (
                      <StatusBadge variant="neutral" label={isEn ? 'TRANSFERRED' : 'TRANSFÉRÉ'} />
                    ) : isUsed ? (
                      <StatusBadge variant="retained" label={isEn ? 'USED' : 'UTILISÉ'} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTicketForQr(tkt)}
                        className="min-h-[40px] px-4 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 lum-press"
                      >
                        <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>QR</span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-12 text-center space-y-4">
              <p className="text-sm text-black/55 dark:text-[#9A9A9A]">
                {isEn
                  ? 'You don’t have any concert tickets yet.'
                  : 'Tu n’as pas encore de billet de concert.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="min-h-[44px] px-6 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-xs transition-colors cursor-pointer lum-press"
              >
                {isEn ? 'Explore concerts' : 'Voir les concerts'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Invitations */}
      {activeTab === 'invitations' && (
        <div className="pt-2">
          {invitations.length > 0 ? (
            <ul className="divide-y divide-black/[0.08] dark:divide-white/[0.12]">
              {invitations.map((inv) => (
                <li key={inv.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                        <Mail
                          className="w-4 h-4 text-[#111111] dark:text-white"
                          strokeWidth={1.6}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-extrabold text-[#111111] dark:text-white truncate">
                          {inv.title}
                        </div>
                        <div className="text-xs text-black/55 dark:text-[#9A9A9A] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" strokeWidth={1.6} />
                            {inv.eventDate} · {inv.eventTime}
                          </span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" strokeWidth={1.6} />
                            {inv.venue}
                          </span>
                        </div>
                      </div>
                    </div>

                    <StatusBadge
                      variant={
                        inv.status === 'accepted'
                          ? 'valid'
                          : inv.status === 'used'
                          ? 'neutral'
                          : 'retained'
                      }
                      label={
                        inv.status === 'accepted'
                          ? isEn
                            ? 'CONFIRMED'
                            : 'CONFIRMÉE'
                          : inv.status === 'used'
                          ? isEn
                            ? 'USED'
                            : 'UTILISÉE'
                          : isEn
                          ? 'PENDING'
                          : 'EN ATTENTE'
                      }
                    />
                  </div>

                  {inv.status === 'pending' && (
                    <div className="pl-[54px] flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, 'accepted')}
                        className="min-h-[40px] px-4 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors lum-press"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                        <span>{isEn ? 'Accept' : 'Accepter'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, 'declined')}
                        className="min-h-[40px] px-4 rounded-full border border-black/15 dark:border-white/[0.16] text-black/70 hover:text-black dark:text-[#C8C8C8] dark:hover:text-white font-agrandir-semibold text-xs cursor-pointer transition-colors lum-press"
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
                        className="min-h-[40px] px-4 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer lum-press"
                      >
                        <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Show pass QR' : 'Afficher mon pass'}</span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-black/55 dark:text-[#9A9A9A]">
                {isEn
                  ? 'No private invitations yet.'
                  : 'Tu n’as pas encore d’invitation privée.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Activités */}
      {activeTab === 'activity' && (
        <div className="pt-2">
          {activities.length > 0 ? (
            <ul className="divide-y divide-black/[0.08] dark:divide-white/[0.12]">
              {activities.map((act) => (
                <li key={act.id} className="py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-[#111111] border border-black/[0.08] dark:border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity
                        className="w-4 h-4 text-[#111111] dark:text-white"
                        strokeWidth={1.6}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-agrandir-extrabold text-[#111111] dark:text-white truncate">
                        {act.title}
                      </div>
                      <p className="text-xs text-black/55 dark:text-[#9A9A9A] mt-0.5 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-black/50 dark:text-[#9A9A9A] shrink-0 pt-0.5">
                    {new Date(act.timestamp).toLocaleDateString(locale, {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-black/55 dark:text-[#9A9A9A]">
                {isEn ? 'No recent activity.' : 'Aucune activité pour le moment.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modale QR Billet */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedTicketForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/75 dark:bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedTicketForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="rounded-[24px] bg-white text-[#111111] dark:bg-[#0E0E0E] dark:text-white border border-black/10 dark:border-white/[0.16] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTicketForQr(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/[0.06] hover:bg-black/[0.12] dark:bg-white/10 dark:hover:bg-white/20 text-[#111111] dark:text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-agrandir-semibold text-black/50 dark:text-white/55 tracking-widest uppercase">
                      {isEn ? 'CONCERT TICKET' : 'TON BILLET'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-[#111111] dark:text-white uppercase truncate">
                      {selectedTicketForQr.eventTitle}
                    </h3>
                    <div className="text-xs text-black/60 dark:text-[#C8C8C8]">
                      {selectedTicketForQr.categoryName} ·{' '}
                      {selectedTicketForQr.serialNumber || selectedTicketForQr.id}
                    </div>
                  </div>

                  <div className="p-4 rounded-[16px] bg-white ring-1 ring-black/10 dark:ring-0 shadow-xl mx-auto w-fit">
                    {ticketQrModalUrl ? (
                      <img
                        src={ticketQrModalUrl}
                        alt="QR Code Ticket"
                        className="w-56 h-56 object-contain"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-black/55 dark:text-[#9A9A9A]">
                    {selectedTicketForQr.holderName || wallet?.user.name}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Modale QR Invitation */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedInvitationForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/75 dark:bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedInvitationForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="rounded-[24px] bg-white text-[#111111] dark:bg-[#0E0E0E] dark:text-white border border-black/15 dark:border-white/[0.18] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedInvitationForQr(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/[0.06] hover:bg-black/[0.12] dark:bg-white/10 dark:hover:bg-white/20 text-[#111111] dark:text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-agrandir-semibold text-black/50 dark:text-white/55 tracking-widest uppercase">
                      {isEn ? 'PRIVATE INVITATION' : 'TON INVITATION'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-[#111111] dark:text-white uppercase truncate">
                      {selectedInvitationForQr.title}
                    </h3>
                    <div className="text-xs text-black/60 dark:text-[#C8C8C8]">
                      {selectedInvitationForQr.venue}
                    </div>
                  </div>

                  <div className="p-4 rounded-[16px] bg-white ring-1 ring-black/10 dark:ring-0 shadow-xl mx-auto w-fit">
                    {invitationQrModalUrl ? (
                      <img
                        src={invitationQrModalUrl}
                        alt="QR Code Invitation"
                        className="w-56 h-56 object-contain"
                      />
                    ) : (
                      <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-black/55 dark:text-[#C8C8C8]">
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
