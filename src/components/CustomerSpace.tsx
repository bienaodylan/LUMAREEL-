import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket } from '../types';
import QRCode from 'qrcode';
import { Ticket as TicketIcon, Printer, QrCode, Calendar, MapPin, CheckCircle2, User, ShieldCheck, ExternalLink, Download, Sparkles } from 'lucide-react';

export const CustomerSpace: React.FC = () => {
  const { currentUser, customerOrders, refreshCustomerOrders, events, setCurrentPage, setSelectedEventSlug } = useApp();
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders' | 'profile'>('tickets');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [qrCodeDataUrls, setQrCodeDataUrls] = useState<Record<string, string>>({});
  const [modalQrCodeUrl, setModalQrCodeUrl] = useState<string>('');

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

  const handlePrintTicket = (ticket: Ticket) => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 border-b border-white/10 pb-8">
        <div>
          <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase mb-1">
            ESPACE PERSONNEL CLIENT · LUMARÉEL CO.
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase">
            MES BILLETS &amp; ENTRÉES
          </h1>
          <div className="text-xs font-agrandir-regular text-[#aaa] mt-2 flex items-center gap-3">
            <span>Compte client : <strong className="text-white">{currentUser?.email || 'bienaodylan428@gmail.com'}</strong></span>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="text-emerald-400 font-agrandir-semibold">Titulaire Vérifié</span>
          </div>
        </div>

        {/* Tab Controls with rounded capsule */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/10 rounded-full">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-5 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'tickets' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Mes Billets ({allTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-5 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Commandes ({customerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-5 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Profil
          </button>
        </div>
      </div>

      {/* --- TAB 1: MES BILLETS (AFFICHAGE VERTICAL AVEC CARRÉ QR CODE DÉTACHÉ) --- */}
      {activeTab === 'tickets' && (
        <div>
          {allTickets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/15 rounded-3xl bg-[#0c0c0c] p-8">
              <TicketIcon className="w-12 h-12 text-[#555] mx-auto mb-4" />
              <h3 className="font-agrandir-extrabold text-xl text-white mb-2 uppercase">AUCUN BILLET ACTIF</h3>
              <p className="text-xs font-agrandir-regular text-[#888] max-w-sm mx-auto mb-6">
                Vous n’avez pas encore de billets réservés. Choisissez un concert officiel dans la programmation pour réserver vos places.
              </p>
              <button
                onClick={() => setCurrentPage('home')}
                className="px-6 py-3 rounded-full bg-white text-black font-agrandir-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition-colors"
              >
                DÉCOUVRIR LES CONCERTS
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-8">
              {allTickets.map((ticket) => {
                // Find matching event from state to obtain the exact official poster
                const matchingEvent = events.find(
                  (e) => e.id === ticket.eventId || e.title.toLowerCase() === ticket.eventTitle.toLowerCase()
                );
                const officialPoster = matchingEvent?.officialPoster || matchingEvent?.bannerImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg';
                const qrUrl = qrCodeDataUrls[ticket.id];

                return (
                  <div
                    key={ticket.id}
                    className="flex flex-col lg:flex-row items-stretch gap-6 bg-[#0c0c0c] border border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl hover:border-white/30 transition-all group"
                  >
                    
                    {/* =========================================================
                        PARTIE 1 : LE BILLET OFFICIEL PERSONNALISÉ DU CONCERT
                        Affiche officielle en grand, catégorie choisie, lieu et détails
                       ========================================================= */}
                    <div className="flex-1 flex flex-col sm:flex-row gap-6 bg-gradient-to-r from-[#141414] via-[#111111] to-[#0e0e0e] border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 overflow-hidden relative">
                      
                      {/* Affiche officielle du concert (Portrait 3:4) */}
                      <div className="w-full sm:w-[200px] md:w-[240px] aspect-[3/4] rounded-2xl overflow-hidden relative shadow-2xl shrink-0 border border-white/15 bg-black">
                        <img
                          src={officialPoster}
                          alt={ticket.eventTitle}
                          className="w-full h-full object-cover filter contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                        
                        {/* Tag Hologramme Lumareel */}
                        <div className="absolute top-3 left-3">
                          <span className="rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold px-2.5 py-1 tracking-widest text-[#d4af37] border border-[#d4af37]/40 uppercase shadow-md flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#d4af37]" />
                            <span>OFFICIEL</span>
                          </span>
                        </div>
                      </div>

                      {/* Données personnalisées sur le billet */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          
                          {/* Ligne d'en-tête du ticket */}
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
                            <div className="text-[10px] font-agrandir-semibold text-[#888] tracking-widest uppercase">
                              N° {ticket.serialNumber}
                            </div>
                            <span
                              className={`text-[10px] font-agrandir-semibold tracking-wider uppercase px-3 py-1 rounded-full border ${
                                ticket.status === 'valid'
                                  ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/30'
                                  : 'border-amber-500/50 text-amber-400 bg-amber-950/30'
                              }`}
                            >
                              {ticket.status === 'valid' ? '✓ VALIDE POUR ENTRÉE' : 'BILLET UTILISÉ'}
                            </span>
                          </div>

                          {/* Titre du Concert */}
                          <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase leading-tight mb-2">
                            {ticket.eventTitle}
                          </h2>

                          {/* Catégorie choisie personnalisée avec style prestige */}
                          <div className="inline-block rounded-xl border border-[#d4af37]/60 bg-gradient-to-r from-[#d4af37]/20 via-[#d4af37]/10 to-transparent px-4 py-1.5 mb-4 shadow-sm">
                            <div className="text-[9px] font-agrandir-semibold text-[#d4af37] tracking-widest uppercase">
                              CATÉGORIE RÉSERVÉE
                            </div>
                            <div className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-wide uppercase">
                              {ticket.categoryName}
                            </div>
                          </div>

                          {/* Informations Lieu & Date */}
                          <div className="space-y-2 text-xs font-agrandir-regular text-[#ccc] mb-4">
                            <div className="flex items-center gap-2.5">
                              <Calendar className="w-4 h-4 text-[#d4af37] shrink-0" />
                              <span className="font-agrandir-semibold text-white">{ticket.eventDate} à {ticket.eventTime} (GMT)</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <MapPin className="w-4 h-4 text-[#d4af37] shrink-0" />
                              <span className="text-[#ddd]">{ticket.eventVenue}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <User className="w-4 h-4 text-[#888] shrink-0" />
                              <span>Titulaire officiel : <strong className="text-white font-agrandir-semibold">{ticket.holderName}</strong></span>
                            </div>
                          </div>

                        </div>

                        {/* Pied du ticket avec sceau de sécurité */}
                        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#777] font-agrandir-regular">
                          <span>ÉMIS PAR LUMARÉEL CO. · SÉCURITÉ CRYPTOGRAPHIQUE</span>
                          <span className="text-[#999] tracking-widest">COMMANDE : {ticket.orderRef}</span>
                        </div>

                      </div>

                    </div>

                    {/* =========================================================
                        PARTIE 2 : LE PETIT CARRÉ DÉTACHÉ DU TICKET POUR LE QR CODE
                        Détaché du billet avec contour pointillé et actions directes
                       ========================================================= */}
                    <div className="w-full lg:w-[260px] shrink-0 bg-[#121212] border-2 border-dashed border-white/20 rounded-2xl sm:rounded-3xl p-5 flex flex-col items-center justify-between text-center shadow-xl">
                      
                      <div className="w-full">
                        <div className="text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#d4af37] uppercase mb-1 flex items-center justify-center gap-1.5">
                          <QrCode className="w-3.5 h-3.5" />
                          <span>PASS D’ACCÈS RAPIDE</span>
                        </div>
                        <div className="text-[11px] font-agrandir-regular text-[#888] mb-3">
                          Présentez ce QR au scanner de contrôle
                        </div>

                        {/* Carré Blanc contenant le vrai QR Code généré */}
                        <div className="w-36 h-36 sm:w-40 sm:h-40 mx-auto bg-white rounded-2xl p-2.5 flex items-center justify-center shadow-2xl relative group cursor-pointer"
                          onClick={() => setSelectedTicketForQr(ticket)}
                        >
                          {qrUrl ? (
                            <img
                              src={qrUrl}
                              alt={`QR Code ${ticket.serialNumber}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-black text-xs">
                              Génération...
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-agrandir-semibold">
                            Cliquer pour agrandir
                          </div>
                        </div>

                        <div className="text-[9px] font-agrandir-semibold text-[#666] tracking-widest uppercase mt-2.5 truncate max-w-[200px]">
                          {ticket.token.substring(0, 24)}...
                        </div>
                      </div>

                      {/* Boutons d'action détachés */}
                      <div className="w-full space-y-2 mt-4 pt-3 border-t border-white/10">
                        <button
                          onClick={() => setSelectedTicketForQr(ticket)}
                          className="w-full py-2.5 text-xs font-agrandir-semibold tracking-wider uppercase bg-white text-black rounded-full hover:bg-neutral-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>AGRANDIR LE QR</span>
                        </button>

                        <button
                          onClick={() => handlePrintTicket(ticket)}
                          className="w-full py-2 text-xs font-agrandir-regular tracking-wider uppercase border border-white/20 hover:border-white text-[#bbb] hover:text-white rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer bg-white/5"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>IMPRIMER MON BILLET</span>
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

      {/* --- TAB 2: HISTORIQUE DES COMMANDES --- */}
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

      {/* --- TAB 3: PROFIL CLIENT --- */}
      {activeTab === 'profile' && (
        <div className="max-w-xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 font-agrandir-regular text-xs space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">IDENTITÉ DU TITULAIRE</div>
            <div className="text-white text-base font-agrandir-extrabold">{currentUser?.name || 'Alexandre V.'}</div>
          </div>

          <div className="border-b border-white/10 pb-4">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">ADRESSE E-MAIL ASSOCIÉE</div>
            <div className="text-white">{currentUser?.email || 'bienaodylan428@gmail.com'}</div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5 font-agrandir-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Adresse sécurisée et vérifiée par LUMARÉEL</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">STATUT DE BILLETTERIE</div>
            <div className="text-white uppercase font-agrandir-semibold">Client Titulaire Certifié</div>
          </div>
        </div>
      )}

      {/* --- MODAL QR CODE PLEIN ÉCRAN POUR SCAN AUX PORTES --- */}
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

            {modalQrCodeUrl ? (
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
