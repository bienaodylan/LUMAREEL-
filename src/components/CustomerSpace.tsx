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
  AlertCircle
} from 'lucide-react';

import { formatDateLongFrench } from '../utils/dateUtils';

type ScrollableTab = 'tickets' | 'orders' | 'transfer' | 'exchange' | 'past';

export const CustomerSpace: React.FC = () => {
  const { currentUser, customerOrders, refreshCustomerOrders, events, setCurrentPage, showToast, language, t } = useApp();
  const [activeTab, setActiveTab] = useState<ScrollableTab>('tickets');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');

  // États pour le transfert de billet
  const [transferTicketId, setTransferTicketId] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientContact, setRecipientContact] = useState<string>('');
  const [transferSuccessToken, setTransferSuccessToken] = useState<string | null>(null);

  // États pour l'échange de billet
  const [exchangeTicketId, setExchangeTicketId] = useState<string>('');
  const [exchangeTargetCategory, setExchangeTargetCategory] = useState<string>('');
  const [exchangeSubmitted, setExchangeSubmitted] = useState<boolean>(false);

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

  // Generate QR codes for all tickets in real time
  useEffect(() => {
    allTickets.forEach((ticket) => {
      if (!qrCodeDataUrls[ticket.id]) {
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

  // Traitement du transfert de billet
  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTicketId || !recipientName || !recipientContact) {
      showToast('Veuillez remplir toutes les informations du destinataire.', 'error');
      return;
    }
    const token = `TRF_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    setTransferSuccessToken(token);
    showToast(`Billet transféré à ${recipientName}. Jeton : ${token}`, 'success');
  };

  // Traitement de l'échange de billet
  const handleConfirmExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeTicketId || !exchangeTargetCategory) {
      showToast('Veuillez sélectionner un billet et une catégorie cible.', 'error');
      return;
    }
    setExchangeSubmitted(true);
    showToast('Demande d’échange enregistrée. Un agent la validera sous 24h.', 'success');
  };

  const tabsConfig: Array<{ id: ScrollableTab; label: string; count?: number }> = [
    { id: 'tickets', label: t('orders.tabTickets'), count: allTickets.length },
    { id: 'orders', label: t('orders.tabOrders'), count: customerOrders.length },
    { id: 'transfer', label: t('orders.tabTransfer') },
    { id: 'exchange', label: t('orders.tabExchange') },
    { id: 'past', label: t('orders.tabPast') },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-32 select-none font-agrandir-regular">
      
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
                <h3 className="font-agrandir-extrabold text-xl text-white uppercase">AUCUN BILLET ACTIF</h3>
                <p className="text-xs font-agrandir-regular text-[#888] max-w-sm mx-auto">
                  Vous n’avez pas encore de billets réservés. Choisissez un concert officiel dans la programmation pour réserver vos places.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="px-6 py-3 rounded-full bg-white text-black font-agrandir-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                DÉCOUVRIR LES CONCERTS
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

                return (
                  <div
                    key={ticket.id}
                    className="bg-[#0d0d0d] border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl hover:border-white/30 transition-all group overflow-hidden flex flex-row items-stretch relative"
                  >
                    {/* GAUCHE : AFFICHE OFFICIELLE VERTICALE DU CONCERT */}
                    <div className="w-24 sm:w-44 md:w-56 shrink-0 relative bg-black border-r border-white/10 overflow-hidden">
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
                          <span className="hidden sm:inline">OFFICIEL</span>
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
                                : 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                            }`}
                          >
                            {ticket.status === 'valid' ? '✓ ENTRÉE VALIDE' : 'UTILISÉ'}
                          </span>
                        </div>

                        <h2 className="font-agrandir-extrabold text-sm sm:text-xl md:text-2xl text-white tracking-tight uppercase leading-tight mb-2 truncate">
                          {ticket.eventTitle}
                        </h2>

                        <div className="inline-block rounded-lg sm:rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/10 px-2.5 sm:px-3.5 py-1 mb-2.5 shadow-sm">
                          <div className="text-[7px] sm:text-[8px] font-agrandir-semibold text-[#d4af37] tracking-widest uppercase">
                            CATÉGORIE RÉSERVÉE
                          </div>
                          <div className="font-agrandir-extrabold text-xs sm:text-base text-white tracking-wide uppercase">
                            {ticket.categoryName}
                          </div>
                        </div>

                        <div className="space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs font-agrandir-regular text-[#ccc]">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                            <span className="font-agrandir-semibold text-white truncate"><strong className="font-agrandir-extrabold text-white">{formatDateLongFrench(ticket.eventDate)}</strong> à <strong className="font-agrandir-extrabold text-white">{ticket.eventTime}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                            <span className="text-[#ddd] truncate"><strong className="font-agrandir-extrabold text-white">{ticket.eventVenue}</strong></span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-[#888] shrink-0" />
                            <span className="truncate">Titulaire : <strong className="text-white font-agrandir-semibold">{ticket.holderName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 sm:pt-3 border-t border-white/10 flex items-center justify-between gap-2 text-[8px] sm:text-[9px] text-[#777] font-agrandir-regular">
                        <span className="truncate hidden sm:inline">LUMARÉEL CO. · CRYPTO CHECK</span>
                        <span className="text-[#999] tracking-widest truncate">RÉF : {ticket.orderRef}</span>
                      </div>
                    </div>

                    {/* LIGNE DE DÉCOUPE POINTILLÉE VERTICALE */}
                    <div className="w-[1px] bg-dashed border-r border-dashed border-white/20 relative shrink-0">
                      <div className="w-3 h-3 rounded-full bg-[#0a0a0a] absolute -top-1.5 -left-1.5 border border-white/10" />
                      <div className="w-3 h-3 rounded-full bg-[#0a0a0a] absolute -bottom-1.5 -left-1.5 border border-white/10" />
                    </div>

                    {/* DROITE : PETIT CARRÉ DÉTACHÉ POUR LE QR CODE */}
                    <div className="w-28 sm:w-44 md:w-56 shrink-0 bg-[#121212] p-2.5 sm:p-4 flex flex-col items-center justify-between text-center shadow-inner">
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
                              Génération...
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-agrandir-semibold">
                            Agrandir
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
                          <span>VOIR QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={handlePrintTicket}
                          className="hidden sm:flex w-full py-1.5 text-[8px] sm:text-[9px] font-agrandir-regular tracking-wider uppercase border border-white/20 hover:border-white text-[#bbb] hover:text-white rounded-full transition-colors items-center justify-center gap-1.5 cursor-pointer bg-white/5"
                        >
                          <Printer className="w-3 h-3 shrink-0" />
                          <span>IMPRIMER</span>
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- ONGLET 2: COMMANDES --- */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {customerOrders.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/15 rounded-3xl bg-[#0c0c0c] p-8">
              <p className="text-xs font-agrandir-regular text-[#777]">Aucune commande enregistrée.</p>
            </div>
          ) : (
            customerOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 font-agrandir-regular text-xs shadow-lg"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-agrandir-extrabold text-white text-sm tracking-wide">{ord.reference}</span>
                    <span
                      className={`text-[10px] font-agrandir-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                        ord.paymentStatus === 'completed'
                          ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20'
                          : 'border-amber-500/50 text-amber-400 bg-amber-950/20'
                      }`}
                    >
                      {ord.paymentStatus === 'completed' ? 'PAYÉE & CONFIRMÉE' : 'EN ATTENTE'}
                    </span>
                  </div>

                  <div className="text-white text-sm font-agrandir-semibold mt-1">
                    {ord.eventTitle}
                  </div>
                  <div className="text-[#888] text-[11px] mt-0.5">
                    {ord.quantity}x {ord.categoryName} · {ord.eventDate} ({ord.eventVenue})
                  </div>
                  <div className="text-[#666] text-[10px] mt-1">
                    Date d’achat : {new Date(ord.createdAt).toLocaleDateString('fr-FR')} · Réf. transaction : {ord.paymentRef}
                  </div>
                </div>

                <div className="text-right flex flex-col md:items-end justify-between gap-2">
                  <div className="text-base sm:text-lg font-agrandir-extrabold text-white">
                    {ord.totalAmount.toLocaleString()} {ord.currency}
                  </div>
                  {ord.paymentStatus === 'completed' && ord.tickets && ord.tickets.length > 0 && (
                    <button
                      type="button"
                      className="text-[11px] text-[#d4af37] hover:underline cursor-pointer font-agrandir-semibold"
                      onClick={() => setActiveTab('tickets')}
                    >
                      Voir mes {ord.tickets.length} billets →
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- ONGLET 3: TRANSFÉRER --- */}
      {activeTab === 'transfer' && (
        <div className="max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#d4af37]">
              <Send className="w-5 h-5" />
              <h2 className="font-agrandir-extrabold text-lg uppercase tracking-tight text-white">
                Transférer un billet
              </h2>
            </div>
            <p className="text-xs text-[#888] leading-relaxed">
              Cédez en toute sécurité un billet nominatif à un proche. Le QR code d'origine sera instantanément invalidé et un nouveau billet cryptographique sera réémis au nom du nouveau titulaire.
            </p>
          </div>

          {allTickets.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-neutral-400">
              Vous n'avez aucun billet disponible pour le transfert.
            </div>
          ) : transferSuccessToken ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <div className="font-agrandir-extrabold text-white uppercase text-base">Transfert Validé</div>
                <div className="text-xs text-neutral-300">
                  Le billet a été transféré avec succès à <strong>{recipientName}</strong>.
                </div>
                <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 text-xs font-mono text-[#d4af37] mt-2">
                  Jeton de transfert : {transferSuccessToken}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTransferSuccessToken(null);
                  setRecipientName('');
                  setRecipientContact('');
                }}
                className="px-4 py-2 rounded-full bg-white text-black font-agrandir-semibold text-xs uppercase cursor-pointer"
              >
                Effectuer un autre transfert
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmTransfer} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  1. Sélectionner le billet à céder
                </label>
                <select
                  value={transferTicketId}
                  onChange={(e) => setTransferTicketId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                >
                  <option value="">-- Choisir parmi mes billets valides --</option>
                  {allTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.eventTitle} — {t.categoryName} ({t.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  2. Nom complet du nouveau bénéficiaire
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ex: Jean-Marc Kouassi"
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  3. Adresse e-mail ou WhatsApp du destinataire
                </label>
                <input
                  type="text"
                  value={recipientContact}
                  onChange={(e) => setRecipientContact(e.target.value)}
                  placeholder="jean.marc@gmail.com ou +225 07..."
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-[#888] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span>
                  Ce transfert est irréversible. Dès validation, votre ancien billet deviendra inutilisable lors du contrôle aux portes.
                </span>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg"
              >
                Confirmer le transfert sécurisé
              </button>
            </form>
          )}
        </div>
      )}

      {/* --- ONGLET 4: ÉCHANGER --- */}
      {activeTab === 'exchange' && (
        <div className="max-w-2xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#d4af37]">
              <RefreshCw className="w-5 h-5" />
              <h2 className="font-agrandir-extrabold text-lg uppercase tracking-tight text-white">
                Échanger ou surclasser un billet
              </h2>
            </div>
            <p className="text-xs text-[#888] leading-relaxed">
              Vous souhaitez passer en Carré Or, VIP ou changer de date ? Sélectionnez votre billet actuel et formulez votre demande de réattribution.
            </p>
          </div>

          {exchangeSubmitted ? (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-3">
              <Check className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="font-agrandir-extrabold text-white uppercase text-base">Demande d'Échange Transmise</div>
              <div className="text-xs text-neutral-300">
                Votre dossier est en cours de traitement par notre régie billetterie. Vous recevrez un lien de confirmation sous 24h.
              </div>
              <button
                type="button"
                onClick={() => setExchangeSubmitted(false)}
                className="px-4 py-2 rounded-full bg-white text-black font-agrandir-semibold text-xs uppercase cursor-pointer"
              >
                Nouvelle demande
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmExchange} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  1. Billet d'origine
                </label>
                <select
                  value={exchangeTicketId}
                  onChange={(e) => setExchangeTicketId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                >
                  <option value="">-- Sélectionner un billet --</option>
                  {allTickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.eventTitle} — {t.categoryName} ({t.serialNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-agrandir-semibold text-[#888] block mb-1">
                  2. Catégorie ou surclassement souhaité
                </label>
                <input
                  type="text"
                  value={exchangeTargetCategory}
                  onChange={(e) => setExchangeTargetCategory(e.target.value)}
                  placeholder="Ex: Surclassement en PASS VIP ou Carré Or"
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg"
              >
                Transmettre la demande d'échange
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
                  <span className="text-white font-agrandir-extrabold text-sm uppercase">TRK EN CONCERT</span>
                  <span className="text-neutral-500 font-mono">2025</span>
                </div>
                <div className="text-[11px] text-[#aaa]">
                  <strong className="text-white font-agrandir-bold">Palais des Congrès du Sofitel Ivoire</strong> · Scénographie sonore et visuelle 360°
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] text-neutral-300 uppercase font-agrandir-semibold">
                    Billet Archivé
                  </span>
                  <span className="text-[10px] text-emerald-400 font-agrandir-semibold">Terminé</span>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-agrandir-bold">
                  <span className="text-white font-agrandir-extrabold text-sm uppercase">DOPELYM EN CONCERT</span>
                  <span className="text-neutral-500 font-mono">2025</span>
                </div>
                <div className="text-[11px] text-[#aaa]">
                  <strong className="text-white font-agrandir-bold">Palais de la Culture d'Abidjan</strong> · Live Show Signature
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] text-neutral-300 uppercase font-agrandir-semibold">
                    Billet Archivé
                  </span>
                  <span className="text-[10px] text-emerald-400 font-agrandir-semibold">Terminé</span>
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
              aria-label="Fermer"
            >
              ✕
            </button>

            <div className="text-[10px] font-agrandir-regular tracking-widest text-[#666] uppercase mb-1">
              SCAN DE CONTRÔLE D’ACCÈS
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
                Chargement...
              </div>
            )}

            <div className="text-[11px] font-agrandir-semibold text-black tracking-widest uppercase mb-1">
              {selectedTicketForQr.serialNumber}
            </div>
            <p className="text-[10px] text-[#666] leading-tight mb-4">
              Présentez cet écran avec luminosité maximale au portillon d'accès.
            </p>

            <button
              type="button"
              onClick={() => setSelectedTicketForQr(null)}
              className="w-full py-3 bg-black text-white font-agrandir-semibold text-xs rounded-full uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              FERMER
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
