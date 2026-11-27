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
  const [selectedActiveTicketId, setSelectedActiveTicketId] = useState<string | null>(null);
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');

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

  const featuredTicket = useMemo(() => {
    if (activeTickets.length === 0) return null;
    if (selectedActiveTicketId) {
      const match = activeTickets.find((tkt) => tkt.id === selectedActiveTicketId);
      if (match) return match;
    }
    return activeTickets[0];
  }, [activeTickets, selectedActiveTicketId]);

  const otherActiveTickets = useMemo(() => {
    if (!featuredTicket) return [];
    return activeTickets.filter((tkt) => tkt.id !== featuredTicket.id);
  }, [activeTickets, featuredTicket]);

  const groupedOtherTickets = useMemo(() => {
    const groups: {
      key: string;
      primaryTicket: Ticket;
      count: number;
    }[] = [];
    const map = new Map<string, number>();

    otherActiveTickets.forEach((ticket) => {
      const key = `${ticket.eventId || ticket.eventTitle}__${ticket.categoryName}`;
      const idx = map.get(key);
      if (idx === undefined) {
        map.set(key, groups.length);
        groups.push({ key, primaryTicket: ticket, count: 1 });
      } else {
        groups[idx].count += 1;
      }
    });
    return groups;
  }, [otherActiveTickets]);

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

  useEffect(() => {
    if (selectedTicketForQr) {
      QRCode.toDataURL(selectedTicketForQr.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 520,
      }).then(setModalQrCodeUrl);
    } else {
      setModalQrCodeUrl('');
    }
  }, [selectedTicketForQr]);

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
          : 'Veuillez saisir une adresse e-mail valide pour le destinataire.',
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
        err?.message || (isEn ? 'Transfer failed. Please try again.' : 'Échec du transfert. Veuillez réessayer.'),
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
      className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 text-white font-agrandir-regular overflow-x-clip"
      style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* En-tête fidèle à la maquette 04 : Billets */}
      <header className="mb-5">
        <h1 className="text-[2.25rem] sm:text-5xl font-agrandir-extrabold tracking-tight leading-none text-white">
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
          title={isEn ? 'Sign in to access your tickets' : 'Connectez-vous pour voir vos billets'}
          description={
            isEn
              ? 'Your official QR passes, payment receipts and ticket transfers are securely linked to your LUMARÉEL account.'
              : 'Vos billets QR officiels, reçus de commande et transferts sécurisés sont associés à votre compte LUMARÉEL.'
          }
          actionLabel={isEn ? 'Sign in' : 'Se connecter'}
          onAction={() => setIsAuthModalOpen(true)}
        />
      ) : (
        <>
          {/* ONGLET 1 : À VENIR — QR CODE IMMÉDIATEMENT VISIBLE */}
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                  {/* Carte billet principale (0px) */}
                  <div className="lg:col-span-6 xl:col-span-5">
                    {featuredTicket && (
                      <QRTicket
                        eventTitle={featuredTicket.eventTitle}
                        dateTimeLine={`${formatShortDate(featuredTicket.eventDate)} · ${featuredTicket.eventTime || '20:00'}`}
                        status={featuredTicket.status}
                        qrDataUrl={qrCodeDataUrls[featuredTicket.id]}
                        serialNumber={featuredTicket.serialNumber}
                        categoryName={featuredTicket.categoryName}
                        holderName={featuredTicket.holderName}
                        venue={featuredTicket.eventVenue || 'Abidjan'}
                        doorsLine={`${featuredTicket.eventTime || '19:00'} · ${isEn ? 'Gate A' : 'Entrée A'}`}
                        directionsUrl={buildDirectionsUrl(featuredTicket.eventVenue)}
                        isEn={isEn}
                        onOpenQrFullscreen={() => setSelectedTicketForQr(featuredTicket)}
                        onTransfer={() => openTransferModal(featuredTicket)}
                      />
                    )}
                  </div>

                  {/* Autres billets actifs (liste compacte cliquable 0px) */}
                  <div className="lg:col-span-6 xl:col-span-7 space-y-5">
                    {groupedOtherTickets.length > 0 && (
                      <section>
                        <p className="hidden lg:block text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A] mb-3">
                          {isEn ? 'Other upcoming passes' : 'Autres billets à venir'}
                        </p>
                        <div className="divide-y divide-white/[0.12] border-b border-white/[0.12]">
                          {groupedOtherTickets.map(({ key, primaryTicket, count }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setSelectedActiveTicketId(primaryTicket.id);
                                if (typeof window !== 'undefined') {
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                              }}
                              className="w-full py-4 flex items-center justify-between gap-3.5 text-left hover:bg-white/[0.02] transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-14 h-14 overflow-hidden bg-[#0E0E0E] border border-white/[0.12] shrink-0">
                                  <img
                                    src={resolvePoster(primaryTicket)}
                                    alt={primaryTicket.eventTitle}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight truncate group-hover:text-[#D4AF6A] transition-colors">
                                    {primaryTicket.eventTitle}
                                  </h3>
                                  <p className="mt-0.5 text-xs text-[#9A9A9A] truncate">
                                    {formatDateLong(primaryTicket.eventDate, language)} ·{' '}
                                    {primaryTicket.categoryName} · ×{count}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight
                                className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0 transition-colors"
                                strokeWidth={1.6}
                              />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Accès rapide impression / sauvegarde */}
                    {featuredTicket && (
                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        {qrCodeDataUrls[featuredTicket.id] && (
                          <a
                            href={qrCodeDataUrls[featuredTicket.id]}
                            download={`QR_${featuredTicket.serialNumber}.png`}
                            className="min-h-[42px] px-4 rounded-[4px] border border-white/[0.16] hover:border-white/40 bg-[#0E0E0E] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white inline-flex items-center gap-2 transition-colors lum-press"
                          >
                            <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                            <span>{t('orders.saveQr')}</span>
                          </a>
                        )}
                        <a
                          href={`/api/customer/tickets/${featuredTicket.token}/print`}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-[42px] px-4 rounded-[4px] border border-white/[0.16] hover:border-white/40 bg-[#0E0E0E] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white inline-flex items-center gap-2 transition-colors lum-press"
                        >
                          <Printer className="w-3.5 h-3.5" strokeWidth={1.6} />
                          <span>{t('orders.print')}</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
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
                      : 'Vos billets déjà utilisés aux concerts et vos reçus de commandes apparaîtront ici.'
                  }
                />
              ) : (
                <>
                  {usedTickets.length > 0 && (
                    <section className="space-y-3">
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                        {isEn ? 'Scanned passes' : 'Billets scannés'}
                      </p>
                      <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                        {usedTickets.map((ticket) => (
                          <div key={ticket.id} className="py-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 overflow-hidden bg-[#0E0E0E] border border-white/[0.12] shrink-0">
                                <img
                                  src={resolvePoster(ticket)}
                                  alt={ticket.eventTitle}
                                  className="w-full h-full object-cover opacity-80"
                                />
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white truncate">
                                  {ticket.eventTitle}
                                </h3>
                                <p className="text-xs text-[#9A9A9A] truncate">
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
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A] flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Order receipts' : 'Historique des commandes'}</span>
                      </p>
                      <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                        {customerOrders.map((order) => {
                          const statusMeta =
                            order.paymentStatus === 'completed'
                              ? { label: isEn ? 'Paid' : 'Payée', cls: 'text-[#7FE0A6]' }
                              : order.paymentStatus === 'failed'
                              ? { label: isEn ? 'Failed' : 'Échouée', cls: 'text-[#F29AA4]' }
                              : { label: isEn ? 'Pending' : 'En attente', cls: 'text-[#D4AF6A]' };

                          return (
                            <div
                              key={order.id}
                              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-mono text-[#9A9A9A]">
                                  {order.reference || order.orderReference} · {formatDateLong(order.createdAt, language)}
                                </p>
                                <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white truncate mt-0.5">
                                  {order.eventTitle}
                                </h3>
                                <p className="text-xs text-[#9A9A9A]">
                                  {order.quantity} × {order.categoryName} · {order.paymentMethod || 'PayMeTrust'}
                                </p>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                                <span className="font-agrandir-extrabold text-sm sm:text-base text-white tabular-nums">
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
                <div className="border border-white/[0.12] bg-[#0E0E0E] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="font-agrandir-extrabold text-base text-white">
                      {isEn ? 'Send a ticket to a friend' : 'Transférer un billet actif'}
                    </h2>
                    <p className="text-xs text-[#9A9A9A] leading-relaxed max-w-lg">
                      {t('orders.transferDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTransferModal(activeTickets[0])}
                    className="min-h-[44px] px-5 rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs whitespace-nowrap inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 lum-press"
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
                      : 'Les billets que vous transférez à vos proches sont révoqués de votre compte et archivés ici.'
                  }
                />
              ) : (
                <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
                  {transferredTickets.map((ticket) => (
                    <div key={ticket.id} className="py-4 flex items-center justify-between gap-4 opacity-80">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 overflow-hidden bg-[#0E0E0E] border border-white/[0.12] shrink-0">
                          <img
                            src={resolvePoster(ticket)}
                            alt={ticket.eventTitle}
                            className="w-full h-full object-cover grayscale"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white truncate">
                            {ticket.eventTitle}
                          </h3>
                          <p className="text-xs text-[#9A9A9A] truncate">
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
          <div className="border border-[#7FE0A6]/30 bg-[#0F2A1A]/40 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#7FE0A6] shrink-0 mt-0.5" strokeWidth={1.6} />
              <div className="space-y-1">
                <h3 className="font-agrandir-extrabold text-base text-white">
                  {t('orders.transferValidated')}
                </h3>
                <p className="text-xs text-[#C8C8C8]">
                  {t('orders.transferSuccessDesc')}{' '}
                  <strong>{transferredToSummary?.name || recipientName}</strong> (
                  {transferredToSummary?.email || recipientContact}).
                </p>
                <p className="text-xs text-[#9A9A9A]">
                  {isEn
                    ? 'Your previous QR code has been revoked and a new valid ticket is ready in the recipient’s account.'
                    : 'Votre ancien QR code est révoqué et un nouveau billet valide est disponible dans l’espace du destinataire.'}
                </p>
              </div>
            </div>

            <div className="bg-black border border-white/[0.14] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs font-mono text-white">
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
                className="min-h-[32px] px-3 rounded-full bg-white text-black font-agrandir-extrabold text-[11px] inline-flex items-center gap-1 cursor-pointer shrink-0 lum-press"
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
              className="w-full min-h-[46px] rounded-[4px] bg-[#D4AF6A] text-black font-agrandir-extrabold text-xs hover:bg-[#DFBE7D] transition-colors cursor-pointer lum-press"
            >
              {isEn ? 'Done' : 'Terminer'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleConfirmTransfer} className="space-y-4">
            <div>
              <label className="block text-xs font-agrandir-semibold text-[#C8C8C8] mb-1.5">
                {t('orders.selectTicket')}
              </label>
              <select
                value={transferTicketId}
                onChange={(e) => setTransferTicketId(e.target.value)}
                className="w-full min-h-[44px] bg-[#141414] border border-white/[0.16] rounded-[4px] px-3.5 text-xs sm:text-sm text-white outline-none focus:border-[#D4AF6A]"
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
                <label className="block text-xs font-agrandir-semibold text-[#C8C8C8] mb-1.5">
                  {t('orders.recipientFullName')}
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t('orders.recipientName')}
                  className="w-full min-h-[44px] bg-[#141414] border border-white/[0.16] rounded-[4px] px-3.5 text-xs sm:text-sm text-white outline-none focus:border-[#D4AF6A]"
                  required
                  disabled={isTransferring}
                />
              </div>
              <div>
                <label className="block text-xs font-agrandir-semibold text-[#C8C8C8] mb-1.5">
                  {isEn ? 'Recipient email' : 'E-mail du destinataire'}
                </label>
                <input
                  type="email"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  placeholder="ami@exemple.com"
                  className="w-full min-h-[44px] bg-[#141414] border border-white/[0.16] rounded-[4px] px-3.5 text-xs sm:text-sm text-white outline-none focus:border-[#D4AF6A]"
                  required
                  disabled={isTransferring}
                />
              </div>
            </div>

            <div className="bg-[#141414] border border-white/[0.12] p-3.5 text-xs text-[#9A9A9A] flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#D4AF6A] shrink-0 mt-0.5" strokeWidth={1.6} />
              <span>{t('orders.transferNotice')}</span>
            </div>

            <button
              type="submit"
              disabled={isTransferring}
              className="w-full min-h-[48px] rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 lum-press"
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

      {/* MODALE QR PLEIN ÉCRAN — 0PX HAUT CONTRASTE FOND BLANC PUR */}
      {selectedTicketForQr && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-black/94 backdrop-blur-md"
          onClick={() => setSelectedTicketForQr(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-white text-black p-6 sm:p-7 text-center shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setSelectedTicketForQr(null)}
              className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full text-neutral-600 hover:text-black hover:bg-black/5 flex items-center justify-center transition-colors cursor-pointer"
              aria-label={t('nav.close')}
            >
              <X className="w-4 h-4" strokeWidth={1.6} />
            </button>

            <p className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-neutral-500 uppercase mb-1">
              {t('orders.qrScanTitle')}
            </p>
            <h3 className="font-agrandir-extrabold text-lg text-black leading-snug pr-6 pl-6">
              {selectedTicketForQr.eventTitle}
            </h3>
            <p className="mt-1 text-xs font-agrandir-semibold text-neutral-600 mb-5">
              {selectedTicketForQr.categoryName} · {selectedTicketForQr.holderName}
            </p>

            {modalQrCodeUrl ? (
              <div className="p-3 border border-neutral-200 bg-white mb-4">
                <img
                  src={modalQrCodeUrl}
                  alt={`QR ${selectedTicketForQr.serialNumber}`}
                  className="w-60 h-60 mx-auto object-contain"
                />
              </div>
            ) : (
              <div className="w-60 h-60 mx-auto bg-neutral-100 flex items-center justify-center text-xs text-neutral-500 mb-4">
                {t('orders.loading')}
              </div>
            )}

            <p className="text-xs font-mono font-bold text-black tracking-wider mb-1">
              N° {selectedTicketForQr.serialNumber}
            </p>
            <p className="text-[11px] text-neutral-500 leading-snug mb-5">
              {t('orders.accessNotice')}
            </p>

            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <a
                href={modalQrCodeUrl}
                download={`QR_${selectedTicketForQr.serialNumber}.png`}
                className="min-h-[42px] px-3 rounded-[4px] border border-neutral-300 text-xs font-agrandir-extrabold text-black hover:bg-neutral-100 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{t('orders.saveQr')}</span>
              </a>
              <a
                href={`/api/customer/tickets/${selectedTicketForQr.token}/print`}
                target="_blank"
                rel="noreferrer"
                className="min-h-[42px] px-3 rounded-[4px] bg-black text-white text-xs font-agrandir-extrabold hover:bg-neutral-800 inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{t('orders.print')}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
