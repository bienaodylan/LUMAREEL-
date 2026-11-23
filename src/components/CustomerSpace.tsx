import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket } from '../types';
import QRCode from 'qrcode';
import {
  Ticket as TicketIcon,
  Printer,
  QrCode,
  Calendar,
  MapPin,
  CheckCircle2,
  User,
  ShieldCheck,
  ExternalLink,
  Download,
  Sparkles,
  Send,
  RefreshCw,
  Ban,
  Archive,
  ArrowRight,
  Clock,
  Check,
  Share2,
  AlertCircle,
  ArrowLeft,
  X,
  Loader2,
  Copy
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { formatDateLong } from '../utils/dateUtils';

type ScrollableTab = 'tickets' | 'transfer' | 'past';

export const CustomerSpace: React.FC = () => {
  const { currentUser, customerOrders, refreshCustomerOrders, events, setCurrentPage, showToast, language, t } = useApp();
  const [activeTab, setActiveTab] = useState<ScrollableTab>('tickets');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');

  // États pour le transfert de billet réel (côté serveur)
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

  // Aggregate all tickets from completed orders
  const allTickets: Ticket[] = [];
  customerOrders.forEach((ord) => {
    if (ord.paymentStatus === 'completed' && ord.tickets) {
      allTickets.push(...ord.tickets);
    }
  });

  // Seuls les billets encore valides peuvent être transférés
  const transferableTickets = allTickets.filter((tkt) => tkt.status === 'valid');

  // Generate QR codes for all valid/used tickets in real time
  useEffect(() => {
    allTickets.forEach((ticket) => {
      if (ticket.status !== 'cancelled' && !qrCodeDataUrls[ticket.id]) {
        QRCode.toDataURL(ticket.token, {
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          width: 320,
        }).then((url) => {
          setQrCodeDataUrls((prev) => ({ ...prev, [ticket.id]: url }));
        });
      }
    });
  }, [allTickets.length]);

  // Generate QR code for the modal when opened
  useEffect(() => {
    if (selectedTicketForQr) {
      QRCode.toDataURL(selectedTicketForQr.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 400,
      }).then(setModalQrCodeUrl);
    } else {
      setModalQrCodeUrl('');
    }
  }, [selectedTicketForQr]);

  const handlePrintTicket = () => {
    window.print();
  };

  // Traitement réel du transfert de billet côté serveur (révocation ancien QR + émission nouveau billet destinataire)
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
        language === 'en'
          ? 'Please enter a valid email address for the recipient.'
          : 'Veuillez saisir une adresse e-mail valide pour le destinataire.',
        'error'
      );
      return;
    }

    const selectedTicket = transferableTickets.find((tkt) => tkt.id === transferTicketId);
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
          data?.error ||
            (language === 'en' ? 'Unable to transfer this ticket.' : 'Impossible de transférer ce billet.')
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
        err?.message ||
          (language === 'en' ? 'Transfer failed. Please try again.' : 'Échec du transfert. Veuillez réessayer.'),
        'error'
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const tabsConfig: Array<{ id: ScrollableTab; label: string; count?: number; highlight?: boolean }> = [
    { id: 'tickets', label: t('orders.tabTickets'), count: allTickets.length },
    { id: 'past', label: t('orders.tabPast') },
    { id: 'transfer', label: t('orders.tabTransfer') },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-10 pb-20 select-none font-agrandir-regular overflow-x-clip">
      
      {/* Barre de retour supérieure */}
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
          title={t('nav.backHome')}
          aria-label={t('nav.close')}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* 1. Page Header — "MES COMMANDES" */}
      <div className="mb-6 border-b border-white/10 pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase mb-1">
              {t('orders.accountKicker')}
            </div>
            <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase">
              {t('orders.headerTitle')}
            </h1>
            <div className="text-xs font-agrandir-regular text-[#aaa] mt-1.5 flex items-center gap-3">
              <span>{t('orders.account')} <strong className="text-white">{currentUser?.email || 'bienaodylan428@gmail.com'}</strong></span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span className="text-emerald-400 font-agrandir-semibold">{t('orders.verified')}</span>
            </div>
          </div>
        </div>

        {/* 2. BARRE DE MENU DÉFILANT HORIZONTAL — "SCROLLABLE TABS" (Tout bien aligné sur une seule ligne) */}
        <div className="mt-6 pt-2">
          <div className="w-full overflow-x-auto scrollbar-none flex items-center gap-2 pb-1 text-xs select-none">
            <div className="inline-flex items-center gap-2 p-1.5 bg-[#121212]/90 backdrop-blur-md border border-white/10 rounded-full shrink-0 shadow-lg">
              {tabsConfig.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap px-4 sm:px-5 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-black shadow-md font-agrandir-extrabold'
                        : 'text-[#888] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-agrandir-extrabold ${
                          isActive ? 'bg-black text-white' : 'bg-white/10 text-[#aaa]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* --- ONGLET 1: MES BILLETS --- */}
      {activeTab === 'tickets' && (
        <div>
          {allTickets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/15 rounded-3xl bg-[#0c0c0c] p-8 space-y-4">
              <TicketIcon className="w-12 h-12 text-[#555] mx-auto" />
              <div className="space-y-1">
                <h3 className="font-agrandir-extrabold text-xl text-white uppercase">{t('orders.noTickets')}</h3>
                <p className="text-xs font-agrandir-regular text-[#888] max-w-sm mx-auto">
                  {t('orders.noTicketsDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="px-6 py-3 rounded-full bg-white text-black font-agrandir-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {t('orders.discoverConcerts')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-6">
              {allTickets.map((ticket) => {
                const matchingEvent = events.find(
                  (e) => e.id === ticket.eventId || e.title.toLowerCase() === ticket.eventTitle.toLowerCase()
                );
                const officialPoster = matchingEvent?.officialPoster || matchingEvent?.bannerImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg';
                const qrUrl = qrCodeDataUrls[ticket.id];

                const isCancelled = ticket.status === 'cancelled';

                return (
                  <div
                    key={ticket.id}
                    className={`bg-[#0d0d0d] border rounded-2xl sm:rounded-3xl shadow-2xl transition-all group overflow-hidden flex flex-row items-stretch relative ${
                      isCancelled
                        ? 'border-white/10 opacity-60'
                        : 'border-white/15 hover:border-white/30'
                    }`}
                  >
                    {/* GAUCHE : AFFICHE OFFICIELLE VERTICALE DU CONCERT */}
                    <div className="w-20 sm:w-44 md:w-56 shrink-0 relative bg-black border-r border-white/10 overflow-hidden">
                      {officialPoster ? (
                        <img
                          src={officialPoster}
                          alt={ticket.eventTitle}
                          className="w-full h-full object-cover filter contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-neutral-900" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      
                      <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                        <span className="rounded-full bg-black/80 backdrop-blur-md text-[8px] sm:text-[9px] font-agrandir-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 tracking-widest text-[#d4af37] border border-[#d4af37]/40 uppercase shadow-md flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#d4af37]" />
                          <span className="hidden sm:inline">{t('orders.officialBadge')}</span>
                        </span>
                      </div>
                    </div>

                    {/* MILIEU : DONNÉES DU CONCERT */}
                    <div className="flex-1 min-w-0 p-3.5 sm:p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
                          <div className="text-[9px] sm:text-[10px] font-agrandir-semibold text-[#888] tracking-widest uppercase truncate">
                            N° {ticket.serialNumber}
                          </div>
                          <span
                            className={`text-[8px] sm:text-[9px] font-agrandir-semibold tracking-wider uppercase px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 ${
                              ticket.status === 'valid'
                                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                                : isCancelled
                                ? 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                                : 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                            }`}
                          >
                            {ticket.status === 'valid'
                              ? t('orders.validEntry')
                              : isCancelled
                              ? (language === 'en' ? 'Transferred' : 'Transféré')
                              : t('orders.used')}
                          </span>
                        </div>

                        <h2 className="font-agrandir-extrabold text-sm sm:text-xl md:text-2xl text-white tracking-tight uppercase leading-tight mb-2 truncate">
                          {ticket.eventTitle}
                        </h2>

                        <div className="inline-block rounded-lg sm:rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/10 px-2.5 sm:px-3.5 py-1 mb-2.5 shadow-sm">
                          <div className="text-[7px] sm:text-[8px] font-agrandir-semibold text-[#d4af37] tracking-widest uppercase">
                            {t('orders.reservedCategory')}
                          </div>
                          <div className="font-agrandir-extrabold text-xs sm:text-base text-white tracking-wide uppercase">
                            {ticket.categoryName}
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs font-agrandir-regular text-[#ccc]">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                            <span className="font-agrandir-semibold text-white truncate"><strong className="font-agrandir-extrabold text-white">{formatDateLong(ticket.eventDate, language)}</strong> {t('orders.atTime')} <strong className="font-agrandir-extrabold text-white">{ticket.eventTime}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                            <span className="text-[#ddd] truncate"><strong className="font-agrandir-extrabold text-white">{ticket.eventVenue}</strong></span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#888] shrink-0" />
                            <span className="truncate">{t('orders.holder')} <strong className="text-white font-agrandir-semibold">{ticket.holderName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 sm:pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[8px] sm:text-[9px] text-[#777] font-agrandir-regular">
                        <span className="truncate hidden sm:inline">LUMARÉEL CO. · CRYPTO CHECK</span>
                        <span className="text-[#999] tracking-widest truncate">{t('orders.ref')} {ticket.orderRef}</span>
                      </div>
                    </div>

                    {/* LIGNE DE DÉCOUPE POINTILLÉE VERTICALE */}
                    <div className="w-[1px] bg-dashed border-r border-dashed border-white/20 relative shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#0a0a0a] absolute -top-1.5 -left-1.5 border border-white/10" />
                      <div className="w-3 h-3 rounded-full bg-[#0a0a0a] absolute -bottom-1.5 -left-1.5 border border-white/10" />
                    </div>

                    {/* DROITE : PETIT CARRÉ DÉTACHÉ POUR LE QR CODE */}
                    <div className="w-24 sm:w-44 md:w-56 shrink-0 bg-[#121212] p-2 sm:p-4 flex flex-col items-center justify-between text-center shadow-inner">
                      {isCancelled ? (
                        <div className="w-full flex-1 flex flex-col items-center justify-center gap-2 text-center px-1">
                          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-300">
                            <Ban className="w-5 h-5" />
                          </div>
                          <div className="text-[10px] font-agrandir-bold uppercase tracking-wider text-rose-300">
                            {language === 'en' ? 'QR Revoked' : 'QR révoqué'}
                          </div>
                          <p className="text-[9px] text-neutral-400 leading-snug">
                            {language === 'en'
                              ? 'Transferred to new holder'
                              : 'Transféré au nouveau porteur'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="w-full flex flex-col items-center">
                            <div className="text-[8px] sm:text-[9px] font-agrandir-semibold tracking-wider text-[#d4af37] uppercase mb-1 sm:mb-1.5 flex items-center justify-center gap-1">
                              <QrCode className="w-3 h-3 shrink-0" />
                              <span className="hidden sm:inline">PASS QR</span>
                            </div>

                            <div
                              className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 mx-auto bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 flex items-center justify-center shadow-lg relative group cursor-pointer"
                              onClick={() => setSelectedTicketForQr(ticket)}
                            >
                              {qrUrl && qrUrl.trim() !== '' ? (
                                <img
                                  src={qrUrl}
                                  alt={`QR Code ${ticket.serialNumber}`}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-black text-[9px] sm:text-xs">
                                  {t('orders.generating')}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-agrandir-semibold">
                                {t('orders.enlarge')}
                              </div>
                            </div>
                          </div>

                          <div className="w-full space-y-1.5 mt-2 pt-2 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() => setSelectedTicketForQr(ticket)}
                              className="w-full py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-agrandir-semibold tracking-wider uppercase bg-white text-black rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm"
                            >
                              <QrCode className="w-3 h-3 shrink-0" />
                              <span>{t('orders.viewQr')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={handlePrintTicket}
                              className="hidden sm:flex w-full py-1.5 text-[8px] sm:text-[9px] font-agrandir-regular tracking-wider uppercase border border-white/20 hover:border-white text-[#bbb] hover:text-white rounded-full transition-colors items-center justify-center gap-1.5 cursor-pointer bg-white/5"
                            >
                              <Printer className="w-3 h-3 shrink-0" />
                              <span>{t('orders.printUpper')}</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET: TRANSFÉRER --- */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#d4af37]">
              <Send className="w-5 h-5" />
              <h2 className="font-agrandir-extrabold text-lg uppercase tracking-tight text-white">
                {t('orders.transferTitle')}
              </h2>
            </div>
            <p className="text-xs text-[#888] leading-relaxed">
              {t('orders.transferDesc')}
            </p>
          </div>

          {transferSuccessToken ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <div className="font-agrandir-extrabold text-white uppercase text-base">{t('orders.transferValidated')}</div>
                <div className="text-xs text-neutral-300">
                  {t('orders.transferSuccessDesc')} <strong>{transferredToSummary?.name || recipientName}</strong>{' '}
                  ({transferredToSummary?.email || recipientContact}).
                </div>
                <p className="text-[11px] text-neutral-400">
                  {language === 'en'
                    ? 'Your old QR code has been permanently revoked and a brand-new ticket is now available in the recipient’s space.'
                    : 'Votre ancien QR code a été révoqué définitivement et un nouveau billet valide est disponible dans l’espace du destinataire.'}
                </p>
                <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 text-xs font-mono text-[#d4af37] mt-2 flex items-center justify-between gap-2">
                  <span className="truncate">{t('orders.transferToken')} {transferSuccessToken}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(transferSuccessToken);
                      setCopiedTransferToken(true);
                      setTimeout(() => setCopiedTransferToken(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedTransferToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedTransferToken ? (language === 'en' ? 'Copied' : 'Copié') : (language === 'en' ? 'Copy' : 'Copier')}</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTransferSuccessToken(null);
                  setTransferredToSummary(null);
                  setRecipientName('');
                  setRecipientContact('');
                }}
                className="px-4 py-2 rounded-full bg-white text-black font-agrandir-semibold text-xs uppercase cursor-pointer"
              >
                {t('orders.anotherTransfer')}
              </button>
            </div>
          ) : transferableTickets.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-400">
              {t('orders.noTransferTickets')}
            </div>
          ) : (
            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  {t('orders.selectTicket')}
                </label>
                <select
                  value={transferTicketId}
                  onChange={(e) => setTransferTicketId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isTransferring}
                >
                  <option value="">{t('orders.chooseValidTicket')}</option>
                  {transferableTickets.map((tkt) => (
                    <option key={tkt.id} value={tkt.id}>
                      {tkt.eventTitle} — {tkt.categoryName} ({tkt.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  {t('orders.recipientFullName')}
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t('orders.recipientName')}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isTransferring}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  {language === 'en' ? 'Recipient email address' : 'Adresse e-mail du destinataire'}
                </label>
                <input
                  type="email"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  placeholder="ami@exemple.com"
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isTransferring}
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-[#888] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>
                  {t('orders.transferNotice')}
                </span>
              </div>

              <button
                type="submit"
                disabled={isTransferring}
                className="w-full py-3.5 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{language === 'en' ? 'Transferring...' : 'Transfert en cours...'}</span>
                  </>
                ) : (
                  <span>{t('orders.confirmTransfer')}</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}



      {/* --- ONGLET: MES ANCIENS BILLETS --- */}
      {activeTab === 'past' && (
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-agrandir-bold">
                  <span className="text-white font-agrandir-extrabold text-sm uppercase">TRK {t('home.inConcert')}</span>
                  <span className="text-neutral-500 font-mono">2025</span>
                </div>
                <div className="text-[11px] text-[#aaa]">
                  <strong className="text-white font-agrandir-bold">Palais des Congrès du Sofitel Ivoire</strong> · {language === 'en' ? '360° sound & visual scenography' : 'Scénographie sonore et visuelle 360°'}
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] text-neutral-300 uppercase font-agrandir-semibold">
                    {t('orders.archivedTicket')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-agrandir-semibold">{t('orders.completed')}</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-agrandir-bold">
                  <span className="text-white font-agrandir-extrabold text-sm uppercase">DOPELYM {t('home.inConcert')}</span>
                  <span className="text-neutral-500 font-mono">2025</span>
                </div>
                <div className="text-[11px] text-[#aaa]">
                  <strong className="text-white font-agrandir-bold">Palais de la Culture d'Abidjan</strong> · Live Show Signature
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] text-neutral-300 uppercase font-agrandir-semibold">
                    {t('orders.archivedTicket')}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-agrandir-semibold">{t('orders.completed')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE QR CODE PLEIN ÉCRAN POUR SCAN AUX PORTES --- */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-white text-black p-8 rounded-3xl text-center shadow-2xl">
            <button
              onClick={() => setSelectedTicketForQr(null)}
              className="absolute top-4 right-4 p-2 text-black hover:bg-black/10 rounded-full transition-colors cursor-pointer"
              aria-label={t('nav.close')}
            >
              ✕
            </button>

            <div className="text-[10px] font-agrandir-regular tracking-widest text-[#666] uppercase mb-1">
              {t('orders.qrScanTitle')}
            </div>
            <h3 className="font-agrandir-extrabold text-xl mb-1 uppercase text-black">
              {selectedTicketForQr.eventTitle}
            </h3>
            <div className="text-xs font-agrandir-semibold text-[#444] mb-4 uppercase">
              {selectedTicketForQr.categoryName} · {selectedTicketForQr.holderName}
            </div>

            {modalQrCodeUrl && modalQrCodeUrl.trim() !== '' ? (
              <div className="p-3 border-2 border-black rounded-2xl bg-white mb-4">
                <img
                  src={modalQrCodeUrl}
                  alt="QR Code"
                  className="w-56 h-56 mx-auto object-contain"
                />
              </div>
            ) : (
              <div className="w-56 h-56 mx-auto bg-neutral-100 flex items-center justify-center text-xs mb-4">
                {t('orders.loading')}
              </div>
            )}

            <div className="text-[11px] font-agrandir-semibold text-black tracking-widest uppercase mb-1">
              {selectedTicketForQr.serialNumber}
            </div>
            <p className="text-[10px] text-[#666] leading-tight mb-4">
              {t('orders.accessNotice')}
            </p>

            <div className="flex items-center justify-center gap-2 mb-3">
              <a
                href={modalQrCodeUrl}
                download={`QR_${selectedTicketForQr.serialNumber}.png`}
                className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 font-agrandir-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('orders.saveQr')}</span>
              </a>

              <a
                href={`/api/customer/tickets/${selectedTicketForQr.token}/print`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-200 text-black border border-neutral-300 font-agrandir-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t('orders.print')}</span>
              </a>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTicketForQr(null)}
              className="w-full py-2.5 bg-black text-white font-agrandir-semibold text-xs rounded-full uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              {t('orders.close')}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
