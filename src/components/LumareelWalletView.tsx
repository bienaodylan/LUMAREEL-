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
import { BottomSheet, SkeletonBlock, StatusBadge, Tabs } from './ui/LumareelKit';
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
  ShieldAlert,
  Radio,
} from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';

type WalletTab = 'tickets' | 'invitations' | 'activity';

interface LumareelWalletViewProps {
  embedded?: boolean;
  initialCard?: MembershipCard | null;
}

/**
 * Vue Black Card active (« Ma carte ») — Écran 05.
 * Matérialise le statut membre (numérique + carte physique NFC). Ce n'est pas une carte de paiement.
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
  const [loading, setLoading] = useState<boolean>(!(initialCard || loadStoredMemberCard(currentUser?.email)));
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const storedFallbackCard = loadStoredMemberCard(currentUser?.email);

  // Carte physique NFC — signalement de perte (BottomSheet)
  const [lossSheetOpen, setLossSheetOpen] = useState(false);
  const [lossReported, setLossReported] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lumareel_nfc_loss_reported') === '1';
    } catch {
      return false;
    }
  });

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
  const [selectedInvitationForQr, setSelectedInvitationForQr] = useState<PrivateInvitation | null>(null);
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

  const handleConfirmLossReport = () => {
    setLossReported(true);
    try {
      localStorage.setItem('lumareel_nfc_loss_reported', '1');
    } catch {}
    setLossSheetOpen(false);
    showToast(
      isEn
        ? 'Physical NFC card flagged as lost. Your digital pass remains active; our team will contact you for replacement.'
        : 'Perte enregistrée. Votre puce NFC est désactivée et votre carte numérique reste active dans l’app.',
      'info'
    );
  };

  if (loading && !initialCard) {
    return (
      <div className="w-full max-w-2xl mx-auto px-5 pt-8 pb-20 space-y-6">
        <SkeletonBlock className="aspect-[1.586/1] max-w-[420px] mx-auto" />
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
            title: isEn ? 'LUMARÉEL Black Card Activated' : 'LUMARÉEL Black Card activée',
            description: isEn
              ? `Member reference ${activeCard.cardNumber} active.`
              : `Référence membre ${activeCard.cardNumber} active.`,
            timestamp: activeCard.issuedAt || new Date().toISOString(),
          },
        ]
      : [];

  return (
    <div className="w-full max-w-3xl mx-auto px-5 sm:px-8 pt-3 sm:pt-6 pb-16 select-none font-agrandir-regular text-white">
      {!embedded && (
        <div className="flex items-center justify-end mb-4">
          <button
            type="button"
            onClick={goBack}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/[0.16] flex items-center justify-center text-[#C8C8C8] hover:text-white transition-all cursor-pointer lum-press"
            aria-label={t('nav.close')}
          >
            <X className="w-4 h-4" strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* Carte numérique active */}
      {activeCard && (
        <section className="pt-2 pb-8">
          <DigitalMembershipCard
            card={activeCard}
            onRefresh={() => fetchWalletOverview(true)}
            isRefreshing={refreshing}
          />
        </section>
      )}

      {/* Bloc Carte physique NFC — statut d'association, nom imprimé, lieu de retrait, Signaler une perte */}
      {activeCard && (
        <section className="mb-8 bg-[#0E0E0E] border border-white/[0.12] p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{isEn ? 'PHYSICAL NFC CARD' : 'CARTE PHYSIQUE NFC'}</span>
              </p>
              <h2 className="mt-1 font-agrandir-extrabold text-base sm:text-lg text-white">
                {isEn ? 'Member status card' : 'Carte statut membre'}
              </h2>
            </div>
            <StatusBadge
              variant={lossReported ? 'rejected' : 'valid'}
              dot={!lossReported}
              label={
                lossReported
                  ? isEn
                    ? 'LOST REPORTED'
                    : 'PERTE SIGNALÉE'
                  : isEn
                  ? 'LINKED'
                  : 'ASSOCIÉE'
              }
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/[0.12] text-xs">
            <div>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#9A9A9A]">
                {isEn ? 'PRINTED NAME' : 'NOM IMPRIMÉ'}
              </span>
              <span className="mt-1 block font-agrandir-extrabold text-white uppercase">
                {activeCard.cardholderName || currentUser?.name || 'MEMBRE LUMARÉEL'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#9A9A9A]">
                {isEn ? 'PICKUP POINT' : 'LIEU DE RETRAIT'}
              </span>
              <span className="mt-1 block font-agrandir-semibold text-[#C8C8C8]">
                {isEn ? 'LUMARÉEL Desk, Cocody · Abidjan' : 'Bureau LUMARÉEL, Cocody · Abidjan'}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-[#9A9A9A]">
                {isEn ? 'NATURE' : 'NATURE'}
              </span>
              <span className="mt-1 block font-agrandir-semibold text-[#C8C8C8]">
                {isEn ? 'Member status only (non-payment)' : 'Statut membre · hors paiement'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/[0.12] flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-[#9A9A9A] max-w-md">
              {isEn
                ? 'This NFC card authenticates your member lane and private invitations. It is not a payment card.'
                : 'Cette carte NFC authentifie votre statut membre en entrée dédiée. Elle ne permet aucun paiement.'}
            </p>
            <button
              type="button"
              disabled={lossReported}
              onClick={() => setLossSheetOpen(true)}
              className="min-h-[40px] px-4 rounded-[4px] border border-white/[0.18] hover:border-[#D4AF6A] text-xs font-agrandir-extrabold text-white hover:text-[#D4AF6A] inline-flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed lum-press"
            >
              <ShieldAlert className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>
                {lossReported
                  ? isEn
                    ? 'Loss reported'
                    : 'Perte déjà signalée'
                  : isEn
                  ? 'Report a loss'
                  : 'Signaler une perte'}
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Onglets épurés : Billets · Invitations · Activités */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'tickets', label: `${isEn ? 'Tickets' : 'Billets'}${tickets.length ? ` (${tickets.length})` : ''}` },
          { id: 'invitations', label: `Invitations${invitations.length ? ` (${invitations.length})` : ''}` },
          { id: 'activity', label: isEn ? 'Activity' : 'Activités' },
        ]}
      />

      {/* 1. Billets */}
      {activeTab === 'tickets' && (
        <div className="pt-2">
          {tickets.length > 0 ? (
            <ul className="divide-y divide-white/[0.12]">
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
                      <div className="w-10 h-10 bg-[#0E0E0E] border border-white/[0.12] flex items-center justify-center shrink-0">
                        <TicketIcon className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-extrabold text-white truncate">
                          {tkt.eventTitle}
                        </div>
                        <div className="text-xs text-[#9A9A9A] truncate mt-0.5">
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
                        className="min-h-[40px] px-3.5 rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 lum-press"
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
              <p className="text-sm text-[#9A9A9A]">
                {isEn ? 'No concert tickets yet.' : 'Aucun billet de concert pour le moment.'}
              </p>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="min-h-[44px] px-6 rounded-[4px] bg-[#D4AF6A] text-black font-agrandir-extrabold text-xs hover:bg-[#DFBE7D] transition-colors cursor-pointer lum-press"
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
            <ul className="divide-y divide-white/[0.12]">
              {invitations.map((inv) => (
                <li key={inv.id} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-[#0E0E0E] border border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-agrandir-extrabold text-white truncate">
                          {inv.title}
                        </div>
                        <div className="text-xs text-[#9A9A9A] mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#C8C8C8]" strokeWidth={1.6} />
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
                        className="min-h-[40px] px-4 rounded-[4px] bg-[#D4AF6A] text-black font-agrandir-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-[#DFBE7D] transition-colors lum-press"
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                        <span>{isEn ? 'Accept' : 'Accepter'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, 'declined')}
                        className="min-h-[40px] px-4 rounded-[4px] border border-white/[0.16] text-[#C8C8C8] hover:text-white font-agrandir-semibold text-xs cursor-pointer transition-colors lum-press"
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
                        className="min-h-[40px] px-4 rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer lum-press"
                      >
                        <QrCode className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Open pass QR' : 'Afficher le pass QR'}</span>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-[#9A9A9A]">
                {isEn ? 'No private invitations yet.' : 'Aucune invitation privée pour le moment.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. Activités */}
      {activeTab === 'activity' && (
        <div className="pt-2">
          {activities.length > 0 ? (
            <ul className="divide-y divide-white/[0.12]">
              {activities.map((act) => (
                <li key={act.id} className="py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-[#0E0E0E] border border-white/[0.12] flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-agrandir-extrabold text-white truncate">
                        {act.title}
                      </div>
                      <p className="text-xs text-[#9A9A9A] mt-0.5 leading-relaxed">
                        {act.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-[#9A9A9A] shrink-0 pt-0.5">
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
              <p className="text-sm text-[#9A9A9A]">
                {isEn ? 'No recent activity.' : 'Aucune activité récente.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* BottomSheet : Signaler une perte de carte physique NFC */}
      <BottomSheet
        open={lossSheetOpen}
        onClose={() => setLossSheetOpen(false)}
        kicker={isEn ? 'PHYSICAL NFC CARD' : 'CARTE PHYSIQUE NFC'}
        title={isEn ? 'Report a lost card' : 'Signaler la perte de votre carte'}
      >
        <div className="space-y-4">
          <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
            {isEn
              ? 'Your physical NFC chip will be immediately deactivated so no one else can use your member lane. Your digital Black Card inside the app remains active without interruption.'
              : 'La puce de votre carte physique NFC sera immédiatement désactivée pour protéger votre accès membre. Votre Black Card numérique dans l’application reste active sans interruption.'}
          </p>
          <div className="bg-[#141414] border border-white/[0.12] p-3.5 text-xs text-[#9A9A9A]">
            {isEn
              ? 'Our team will contact you to arrange a replacement pickup at Cocody, Abidjan.'
              : 'L’équipe LUMARÉEL vous contactera pour organiser la remise d’une nouvelle carte au bureau de Cocody, Abidjan.'}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setLossSheetOpen(false)}
              className="min-h-[46px] rounded-[4px] border border-white/[0.16] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white cursor-pointer lum-press"
            >
              {isEn ? 'Cancel' : 'Annuler'}
            </button>
            <button
              type="button"
              onClick={handleConfirmLossReport}
              className="min-h-[46px] rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold cursor-pointer lum-press"
            >
              {isEn ? 'Confirm loss' : 'Confirmer la perte'}
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Modale QR Billet (0px) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedTicketForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedTicketForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="bg-[#0E0E0E] border border-white/[0.16] p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedTicketForQr(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-mono text-[#D4AF6A] tracking-widest uppercase">
                      {isEn ? 'CONCERT TICKET' : 'BILLET DE CONCERT'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-white uppercase truncate">
                      {selectedTicketForQr.eventTitle}
                    </h3>
                    <div className="text-xs text-[#C8C8C8]">
                      {selectedTicketForQr.categoryName} · {selectedTicketForQr.serialNumber || selectedTicketForQr.id}
                    </div>
                  </div>

                  <div className="p-4 bg-white shadow-2xl mx-auto w-fit">
                    {ticketQrModalUrl ? (
                      <img src={ticketQrModalUrl} alt="QR Code Ticket" className="w-56 h-56 object-contain" />
                    ) : (
                      <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-[#9A9A9A]">
                    {selectedTicketForQr.holderName || wallet?.user.name}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* Modale QR Invitation (0px) */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {selectedInvitationForQr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 touch-none"
                onClick={() => setSelectedInvitationForQr(null)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  className="bg-[#0E0E0E] border border-[#D4AF6A]/45 p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedInvitationForQr(null)}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                    aria-label={t('nav.close')}
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>

                  <div className="space-y-1 pr-6">
                    <div className="text-[10px] font-mono text-[#D4AF6A] tracking-widest uppercase">
                      {isEn ? 'PRIVATE INVITATION' : 'INVITATION PRIVÉE'}
                    </div>
                    <h3 className="font-agrandir-extrabold text-base text-white uppercase truncate">
                      {selectedInvitationForQr.title}
                    </h3>
                    <div className="text-xs text-[#C8C8C8]">{selectedInvitationForQr.venue}</div>
                  </div>

                  <div className="p-4 bg-white shadow-2xl mx-auto w-fit">
                    {invitationQrModalUrl ? (
                      <img src={invitationQrModalUrl} alt="QR Code Invitation" className="w-56 h-56 object-contain" />
                    ) : (
                      <div className="w-56 h-56 bg-neutral-100 flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-black" />
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-[#C8C8C8]">{selectedInvitationForQr.recipientName}</div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
