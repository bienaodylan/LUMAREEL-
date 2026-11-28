import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket } from '../types';
import QRCode from 'qrcode';
import {
  Ticket as TicketIcon,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Download,
  Send,
  Check,
  X,
  Loader2,
  Copy,
  ChevronRight,
  Clock,
  Lock,
  Receipt,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { formatDateLong } from '../utils/dateUtils';
import { EmptyState } from './ui/EditorialPrimitives';
import { BottomSheet, QRTicket, StatusBadge, Tabs } from './ui/LumareelKit';

type TicketsTab = 'upcoming' | 'history' | 'transferred';

/**
 * 04 — Billets & QR code
 * Carte billet 0px, QR 236px blanc pur immédiat, perforation pointillés, grille 2×2, Transférer | Itinéraire.
 */
export const CustomerSpace: React.FC = () => {
  const {
    currentUser,
    setIsAuthModalOpen,
    customerOrders,
    refreshCustomerOrders,
    events,
    setCurrentPage,
    showToast,
    language,
    t,
  } = useApp();

  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<TicketsTab>('upcoming');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});

  // Transfert de billet réel côté serveur (BottomSheet dédié)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferTicketId, setTransferTicketId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transferSuccessToken, setTransferSuccessToken] = useState<string | null>(null);
  const [transferredToSummary, setTransferredToSummary] = useState<{ name: string; email: string } | null>(null);
  const [copiedTransferToken, setCopiedTransferToken] = useState<boolean>(false);

  useEffect(() => {
    refreshCustomerOrders();
  }, [currentUser]);

  const allTickets = useMemo<Ticket[]>(() => {
    const list: Ticket[] = [];
    customerOrders.forEach((ord) => {
      if (ord.paymentStatus === 'completed' && ord.tickets) {
        list.push(...ord.tickets);
      }
    });
    return list;
  }, [customerOrders]);

  const activeTickets = useMemo(
    () =>
      allTickets
        .filter((tkt) => tkt.status === 'valid')
        .sort((a, b) => {
          const da = new Date(a.eventDate || 0).getTime() || 0;
          const db = new Date(b.eventDate || 0).getTime() || 0;
          return da - db;
        }),
    [allTickets]
  );

  const usedTickets = useMemo(
    () => allTickets.filter((tkt) => tkt.status === 'used'),
    [allTickets]
  );

  const transferredTickets = useMemo(
    () => allTickets.filter((tkt) => tkt.status === 'cancelled'),
    [allTickets]
  );

  useEffect(() => {
    allTickets.forEach((ticket) => {
      if (ticket.status !== 'cancelled' && !qrCodeDataUrls[ticket.id]) {
        QRCode.toDataURL(ticket.token, {
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          width: 440,
        }).then((url) => {
          setQrCodeDataUrls((prev) => ({ ...prev, [ticket.id]: url }));
        });
      }
    });
  }, [allTickets]);

  const openTransferModal = (ticket?: Ticket) => {
    setTransferSuccessToken(null);
    setTransferredToSummary(null);
    setRecipientName('');
    setRecipientContact('');
    setTransferTicketId(ticket?.id || activeTickets[0]?.id || '');
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = recipientName.trim();
    const cleanEmail = recipientContact.trim().toLowerCase();

    if (!transferTicketId || !cleanName || !cleanEmail) {
      showToast(t('orders.fillRecipientError'), 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      showToast(
        isEn
          ? 'Please enter a valid email address for the recipient.'
          : 'Entre une adresse e-mail valide pour le destinataire.',
        'error'
      );
      return;
    }

    const selectedTicket = activeTickets.find((tkt) => tkt.id === transferTicketId);
    const senderEmail = (currentUser?.email || selectedTicket?.holderEmail || '').trim().toLowerCase();

    setIsTransferring(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (isSupabaseConfigured) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers.Authorization = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const res = await fetch('/api/tickets/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ticketId: transferTicketId,
          senderEmail,
          recipientName: cleanName,
          recipientEmail: cleanEmail,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success || !data?.transferToken) {
        throw new Error(
          data?.error || (isEn ? 'Unable to transfer this ticket.' : 'Impossible de transférer ce billet.')
        );
      }

      setTransferSuccessToken(data.transferToken);
      setTransferredToSummary({ name: cleanName, email: cleanEmail });
      setTransferTicketId('');
      showToast(
        t('orders.transferSuccessToast')
          .replace('{name}', cleanName)
          .replace('{token}', data.transferToken),
        'success'
      );
      await refreshCustomerOrders();
    } catch (err: any) {
      showToast(
        err?.message || (isEn ? 'Transfer failed. Please try again.' : 'Échec du transfert. Réessaie.'),
        'error'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const resolvePoster = (ticket: Ticket) => {
    const matchingEvent = events.find(
      (e) => e.id === ticket.eventId || e.title.toLowerCase() === ticket.eventTitle.toLowerCase()
    );
    return (
      matchingEvent?.officialPoster ||
      matchingEvent?.bannerImage ||
      '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg'
    );
  };

  const buildDirectionsUrl = (venue?: string) => {
    const query = encodeURIComponent(venue ? `${venue}, Abidjan` : 'Abidjan');
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return isEn ? 'TBA' : 'À confirmer';
    return formatDateLong(dateStr, language).toUpperCase();
  };

  return (
    <div
      className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 text-[#111111] dark:text-white font-agrandir-regular overflow-x-clip transition-colors duration-200"
      style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* En-tête : Billets */}
      <header className="mb-5">
        <h1 className="text-[2.25rem] sm:text-5xl font-agrandir-extrabold tracking-tight leading-none text-[#111111] dark:text-white">
          {isEn ? 'Tickets' : 'Billets'}
        </h1>
      </header>

      <Tabs
        className="mb-6"
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'upcoming', label: isEn ? 'Upcoming' : 'À venir' },
          { id: 'history', label: isEn ? 'History' : 'Historique' },
          { id: 'transferred', label: isEn ? 'Transferred' : 'Transférés' },
        ]}
      />

      {!currentUser && allTickets.length === 0 ? (
        <EmptyState
          icon={<Lock className="w-5 h-5" strokeWidth={1.6} />}
          title={isEn ? 'Sign in to access your tickets' : 'Connecte-toi pour voir tes billets'}
          description={
            isEn
              ? 'Your official QR passes, payment receipts and ticket transfers are linked to your LUMARÉEL account.'
              : 'Tes billets officiels, tes reçus et tes transferts sont liés à ton compte LUMARÉEL.'
          }
          actionLabel={isEn ? 'Sign in' : 'Se connecter'}
          onAction={() => setIsAuthModalOpen(true)}
        />
      ) : (
        <>
          {/* ONGLET 1 : À VENIR */}
          {activeTab === 'upcoming' && (
            <div>
              {activeTickets.length === 0 ? (
                <EmptyState
                  icon={<TicketIcon className="w-5 h-5" strokeWidth={1.6} />}
                  title={t('orders.noTickets')}
                  description={t('orders.noTicketsDesc')}
                  actionLabel={t('orders.discoverConcerts')}
                  onAction={() => setCurrentPage('home')}
                />
              ) : (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3 pb-2">
                    <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-black/50 dark:text-[#9A9A9A]">
                      {isEn ? 'Your upcoming passes' : 'Tes prochains billets'}
                    </p>
                    <span className="text-[11px] text-[#111111] dark:text-white font-agrandir-semibold tabular-nums">
                      {activeTickets.length} {isEn ? 'TICKET(S)' : 'BILLET(S)'}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {activeTickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setSelectedTicketForQr(ticket)}
                        className="w-full text-left flex items-center gap-3.5 p-3 sm:p-4 rounded-[18px] border border-black/[0.08] dark:border-white/[0.11] bg-white dark:bg-[#101010] hover:border-black/25 dark:hover:border-white/30 transition-all group cursor-pointer"
                      >
                        <div className="w-[76px] h-[88px] sm:w-[88px] sm:h-[96px] rounded-[12px] overflow-hidden bg-black/[0.05] dark:bg-[#1A1A1A] shrink-0 border border-black/[0.06] dark:border-white/[0.08]">
                          <img src={resolvePoster(ticket)} alt={ticket.eventTitle} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1 py-0.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white shrink-0" />
                            <span className="text-[9px] font-agrandir-extrabold tracking-[0.16em] text-[#111111] dark:text-white uppercase">
                              {isEn ? 'Valid' : 'Valide'}
                            </span>
                          </div>
                          <h3 className="font-agrandir-extrabold text-[14px] sm:text-base leading-tight text-[#111111] dark:text-white uppercase tracking-tight line-clamp-2 group-hover:opacity-75 transition-opacity">
                            {ticket.eventTitle}
                          </h3>
                          <p className="mt-1.5 text-[11px] sm:text-xs text-black/60 dark:text-[#B5B5B5] truncate">
                            {formatDateLong(ticket.eventDate, language)} · {ticket.eventTime || '20:00'}
                          </p>
                          <p className="mt-1 text-[10px] sm:text-[11px] text-black/45 dark:text-[#777] truncate">
                            {ticket.categoryName} · N° {ticket.serialNumber}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-center gap-1 text-black/45 group-hover:text-black dark:text-[#8A8A8A] dark:group-hover:text-white transition-colors">
                          <TicketIcon className="w-5 h-5" strokeWidth={1.6} />
                          <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="pt-2 text-[10px] leading-relaxed text-black/45 dark:text-[#777] text-center">
                    {isEn
                      ? 'Tap a ticket to display its entry QR code and full details.'
                      : 'Touche un billet pour afficher ton QR code et toutes les infos.'}
                  </p>
                </section>
              )}
            </div>
          )}

          {/* ONGLET 2 : HISTORIQUE */}
          {activeTab === 'history' && (
            <div className="space-y-8">
              {usedTickets.length === 0 && customerOrders.length === 0 ? (
                <EmptyState
                  icon={<Clock className="w-5 h-5" strokeWidth={1.6} />}
                  title={isEn ? 'No past tickets or orders' : 'Aucun historique pour le moment'}
                  description={
                    isEn
                      ? 'Your scanned concert passes and purchase receipts will appear here automatically.'
                      : 'Tes billets déjà utilisés et tes reçus de commande apparaîtront ici.'
                  }
                />
              ) : (
                <>
                  {usedTickets.length > 0 && (
                    <section className="space-y-3">
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/55">
                        {isEn ? 'Scanned passes' : 'Billets scannés'}
                      </p>
                      <div className="divide-y divide-black/[0.08] dark:divide-white/[0.12] border-y border-black/[0.08] dark:border-white/[0.12]">
                        {usedTickets.map((ticket) => (
                          <div key={ticket.id} className="py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-black/[0.05] dark:bg-[#0E0E0E] border border-black/[0.08] dark:border-white/[0.12] shrink-0">
                                <img
                                  src={resolvePoster(ticket)}
                                  alt={ticket.eventTitle}
                                  className="w-full h-full object-cover opacity-80"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-agrandir-extrabold text-sm sm:text-base text-[#111111] dark:text-white truncate">
                                  {ticket.eventTitle}
                                </h3>
                                <p className="text-xs text-black/55 dark:text-[#9A9A9A] truncate">
                                  {formatDateLong(ticket.eventDate, language)} · {ticket.categoryName} · N° {ticket.serialNumber}
                                </p>
                              </div>
                            </div>
                            <StatusBadge variant="retained" label={isEn ? 'SCANNED' : 'UTILISÉ'} />
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {customerOrders.length > 0 && (
                    <section className="space-y-3">
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-black/50 dark:text-[#9A9A9A] flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Order receipts' : 'Historique des commandes'}</span>
                      </p>
                      <div className="divide-y divide-black/[0.08] dark:divide-white/[0.12] border-y border-black/[0.08] dark:border-white/[0.12]">
                        {customerOrders.map((order) => {
                          const statusMeta =
                            order.paymentStatus === 'completed'
                              ? { label: isEn ? 'Paid' : 'Payée', cls: 'text-[#111111] dark:text-white' }
                              : order.paymentStatus === 'failed'
                              ? { label: isEn ? 'Failed' : 'Échouée', cls: 'text-black/45 dark:text-white/45' }
                              : { label: isEn ? 'Pending' : 'En attente', cls: 'text-black/60 dark:text-white/65' };

                          return (
                            <div
                              key={order.id}
                              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-mono text-black/50 dark:text-[#9A9A9A]">
                                  {order.reference || order.orderReference} · {formatDateLong(order.createdAt, language)}
                                </p>
                                <h3 className="font-agrandir-extrabold text-sm sm:text-base text-[#111111] dark:text-white truncate mt-0.5">
                                  {order.eventTitle}
                                </h3>
                                <p className="text-xs text-black/55 dark:text-[#9A9A9A]">
                                  {order.quantity} × {order.categoryName} · {order.paymentMethod || 'PayMeTrust'}
                                </p>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                                <span className="font-agrandir-extrabold text-sm sm:text-base text-[#111111] dark:text-white tabular-nums">
                                  {Number(order.totalAmount || 0).toLocaleString('fr-FR')} {order.currency || 'FCFA'}
                                </span>
                                <span className={`text-xs font-agrandir-semibold ${statusMeta.cls}`}>
                                  {statusMeta.label}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}

          {/* ONGLET 3 : TRANSFÉRÉS */}
          {activeTab === 'transferred' && (
            <div className="space-y-6">
              {activeTickets.length > 0 && (
                <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#0E0E0E] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-agrandir-extrabold text-base text-[#111111] dark:text-white">
                      {isEn ? 'Send a ticket to a friend' : 'Envoyer un billet à un proche'}
                    </h2>
                    <p className="text-xs text-black/55 dark:text-[#9A9A9A] leading-relaxed max-w-lg">
                      {t('orders.transferDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTransferModal(activeTickets[0])}
                    className="min-h-[44px] px-5 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-xs whitespace-nowrap inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 lum-press"
                  >
                    <Send className="w-3.5 h-3.5" strokeWidth={1.6} />
                    <span>{isEn ? 'Transfer a ticket' : 'Transférer un billet'}</span>
                  </button>
                </div>
              )}

              {transferredTickets.length === 0 ? (
                <EmptyState
                  icon={<Send className="w-5 h-5" strokeWidth={1.6} />}
                  title={isEn ? 'No transferred tickets' : 'Aucun billet transféré'}
                  description={
                    isEn
                      ? 'Tickets you transfer to friends are automatically revoked on your device and listed here.'
                      : 'Les billets que tu transfères à tes proches sont désactivés chez toi et listés ici.'
                  }
                />
              ) : (
                <div className="divide-y divide-black/[0.08] dark:divide-white/[0.12] border-y border-black/[0.08] dark:border-white/[0.12]">
                  {transferredTickets.map((ticket) => (
                    <div key={ticket.id} className="py-4 flex items-center justify-between gap-4 opacity-80">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-[12px] overflow-hidden bg-black/[0.05] dark:bg-[#0E0E0E] border border-black/[0.08] dark:border-white/[0.12] shrink-0">
                          <img
                            src={resolvePoster(ticket)}
                            alt={ticket.eventTitle}
                            className="w-full h-full object-cover grayscale"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-agrandir-extrabold text-sm sm:text-base text-[#111111] dark:text-white truncate">
                            {ticket.eventTitle}
                          </h3>
                          <p className="text-xs text-black/55 dark:text-[#9A9A9A] truncate">
                            {ticket.categoryName} · N° {ticket.serialNumber}
                          </p>
                        </div>
                      </div>
                      <StatusBadge variant="neutral" label={isEn ? 'TRANSFERRED' : 'TRANSFÉRÉ'} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* BOTTOM SHEET TRANSFERT SÉCURISÉ RÉEL */}
      <BottomSheet
        open={isTransferModalOpen}
        onClose={() => !isTransferring && setIsTransferModalOpen(false)}
        kicker={isEn ? 'Secure Transfer' : 'Transfert sécurisé'}
        title={t('orders.transferTitle')}
      >
        {transferSuccessToken ? (
          <div className="rounded-[18px] border border-black/15 dark:border-white/20 bg-black/[0.03] dark:bg-white/[0.05] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#111111] dark:text-white shrink-0 mt-0.5" strokeWidth={1.6} />
              <div className="space-y-1">
                <h3 className="font-agrandir-extrabold text-base text-[#111111] dark:text-white">
                  {t('orders.transferValidated')}
                </h3>
                <p className="text-xs text-black/65 dark:text-[#C8C8C8]">
                  {t('orders.transferSuccessDesc')}{' '}
                  <strong>{transferredToSummary?.name || recipientName}</strong> (
                  {transferredToSummary?.email || recipientContact}).
                </p>
                <p className="text-xs text-black/55 dark:text-[#9A9A9A]">
                  {isEn
                    ? 'Your previous QR code has been revoked and a new valid ticket is ready in the recipient’s account.'
                    : 'Ton ancien QR code est désactivé et un nouveau billet valide est prêt dans le compte du destinataire.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F5F7] dark:bg-black border border-black/10 dark:border-white/[0.14] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-mono text-[#111111] dark:text-white">
              <span className="truncate">
                {t('orders.transferToken')} {transferSuccessToken}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(transferSuccessToken);
                  setCopiedTransferToken(true);
                  setTimeout(() => setCopiedTransferToken(false), 2000);
                }}
                className="min-h-[32px] px-3 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 lum-press"
              >
                {copiedTransferToken ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={1.8} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.6} />
                )}
                <span>{copiedTransferToken ? (isEn ? 'Copied' : 'Copié') : isEn ? 'Copy' : 'Copier'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsTransferModalOpen(false);
                setActiveTab('transferred');
              }}
              className="w-full min-h-[46px] rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-xs hover:opacity-90 transition-opacity cursor-pointer lum-press"
            >
              {isEn ? 'Done' : 'Terminer'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-agrandir-semibold text-black/70 dark:text-[#C8C8C8] mb-1.5">
                {t('orders.selectTicket')}
              </label>
              <select
                value={transferTicketId}
                onChange={(e) => setTransferTicketId(e.target.value)}
                className="w-full min-h-[44px] bg-[#F5F5F7] dark:bg-[#141414] border border-black/15 dark:border-white/[0.16] rounded-xl px-3.5 text-xs sm:text-sm text-[#111111] dark:text-white outline-none focus:border-black dark:focus:border-white"
                required
                disabled={isTransferring}
              >
                <option value="">{t('orders.chooseValidTicket')}</option>
                {activeTickets.map((tkt) => (
                  <option key={tkt.id} value={tkt.id}>
                    {tkt.eventTitle} — {tkt.categoryName} ({tkt.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-agrandir-semibold text-black/70 dark:text-[#C8C8C8] mb-1.5">
                  {t('orders.recipientFullName')}
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t('orders.recipientName')}
                  className="w-full min-h-[44px] bg-[#F5F5F7] dark:bg-[#141414] border border-black/15 dark:border-white/[0.16] rounded-xl px-3.5 text-xs sm:text-sm text-[#111111] dark:text-white outline-none focus:border-black dark:focus:border-white"
                  required
                  disabled={isTransferring}
                />
              </div>
              <div>
                <label className="block text-xs font-agrandir-semibold text-black/70 dark:text-[#C8C8C8] mb-1.5">
                  {isEn ? 'Recipient email' : 'E-mail du destinataire'}
                </label>
                <input
                  type="email"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  placeholder="ami@exemple.com"
                  className="w-full min-h-[44px] bg-[#F5F5F7] dark:bg-[#141414] border border-black/15 dark:border-white/[0.16] rounded-xl px-3.5 text-xs sm:text-sm text-[#111111] dark:text-white outline-none focus:border-black dark:focus:border-white"
                  required
                  disabled={isTransferring}
                />
              </div>
            </div>

            <div className="rounded-[14px] bg-[#F5F5F7] dark:bg-[#141414] border border-black/10 dark:border-white/[0.12] p-3.5 text-xs text-black/60 dark:text-[#9A9A9A] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#111111] dark:text-white shrink-0 mt-0.5" strokeWidth={1.6} />
              <span>{t('orders.transferNotice')}</span>
            </div>

            <button
              type="submit"
              disabled={isTransferring}
              className="w-full min-h-[48px] rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 lum-press"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Transferring…' : 'Transfert en cours…'}</span>
                </>
              ) : (
                <span>{t('orders.confirmTransfer')}</span>
              )}
            </button>
          </form>
        )}
      </BottomSheet>

      {/* VUE DÉTAILLÉE DU BILLET */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-[95] bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white overflow-y-auto overscroll-contain">
          <div className="sticky top-0 z-20 bg-[#FBFBFD]/92 dark:bg-black/90 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08] px-4 sm:px-6 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedTicketForQr(null)}
              className="min-h-[42px] inline-flex items-center gap-2 text-[#111111] dark:text-white hover:opacity-70 transition-opacity cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 rotate-180" strokeWidth={1.7} />
              <span className="text-xs font-agrandir-semibold">
                {isEn ? 'Back to tickets' : 'Retour aux billets'}
              </span>
            </button>
            <span className="text-[9px] uppercase tracking-[0.2em] text-black/55 dark:text-white/60 font-agrandir-extrabold">
              LUMARÉEL · {isEn ? 'YOUR PASS' : 'TON BILLET'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedTicketForQr(null)}
              aria-label={t('nav.close')}
              className="w-9 h-9 rounded-full border border-black/15 dark:border-white/[0.12] flex items-center justify-center text-black/65 hover:text-black dark:text-[#BDBDBD] dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
          <div className="w-full max-w-[520px] mx-auto px-4 pt-5 pb-12">
            <QRTicket
              eventTitle={selectedTicketForQr.eventTitle}
              dateTimeLine={`${formatShortDate(selectedTicketForQr.eventDate)} · ${selectedTicketForQr.eventTime || '20:00'}`}
              status={selectedTicketForQr.status}
              qrDataUrl={qrCodeDataUrls[selectedTicketForQr.id]}
              serialNumber={selectedTicketForQr.serialNumber}
              categoryName={selectedTicketForQr.categoryName}
              holderName={selectedTicketForQr.holderName}
              venue={selectedTicketForQr.eventVenue || 'Abidjan'}
              doorsLine={`${selectedTicketForQr.eventTime || '19:00'} · ${isEn ? 'Gate A' : 'Entrée A'}`}
              directionsUrl={buildDirectionsUrl(selectedTicketForQr.eventVenue)}
              isEn={isEn}
              onOpenQrFullscreen={() => setIsQrExpanded(true)}
              onTransfer={() => openTransferModal(selectedTicketForQr)}
            />
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {qrCodeDataUrls[selectedTicketForQr.id] && (
                <a
                  href={qrCodeDataUrls[selectedTicketForQr.id]}
                  download={`QR_${selectedTicketForQr.serialNumber}.png`}
                  className="min-h-[46px] rounded-full border border-black/15 dark:border-white/[0.16] bg-white dark:bg-[#101010] text-[#111111] dark:text-white text-[11px] font-agrandir-extrabold inline-flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" strokeWidth={1.6} />
                  <span>{t('orders.saveQr')}</span>
                </a>
              )}
              <a
                href={`/api/customer/tickets/${selectedTicketForQr.token}/print`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[46px] rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-[11px] font-agrandir-extrabold inline-flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" strokeWidth={1.6} />
                <span>{t('orders.print')}</span>
              </a>
            </div>
          </div>
          {isQrExpanded && (
            <div
              className="fixed inset-0 z-[110] bg-black flex flex-col items-center justify-center p-6"
              onClick={() => setIsQrExpanded(false)}
            >
              <button
                type="button"
                onClick={() => setIsQrExpanded(false)}
                className="absolute top-6 right-5 w-10 h-10 rounded-full border border-white/20 text-white flex items-center justify-center cursor-pointer"
                aria-label={t('nav.close')}
              >
                <X className="w-5 h-5" strokeWidth={1.6} />
              </button>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/70 font-agrandir-extrabold mb-5">
                {isEn ? 'SHOW AT THE ENTRANCE' : 'À MONTRER À L’ENTRÉE'}
              </p>
              {qrCodeDataUrls[selectedTicketForQr.id] ? (
                <div
                  className="w-[min(82vw,420px)] aspect-square bg-white rounded-[22px] p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={qrCodeDataUrls[selectedTicketForQr.id]}
                    alt={`QR ${selectedTicketForQr.serialNumber}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-72 aspect-square rounded-2xl bg-white/10 animate-pulse" />
              )}
              <p className="mt-5 text-xs font-mono tracking-[0.16em] text-white">
                N° {selectedTicketForQr.serialNumber}
              </p>
              <p className="mt-2 text-[11px] text-[#999] text-center">
                {isEn
                  ? 'Turn up your screen brightness for scanning.'
                  : 'Augmente la luminosité de ton écran pour le scan.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
