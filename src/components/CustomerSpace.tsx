import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Ticket } from '../types';
import QRCode from 'qrcode';
import { Ticket as TicketIcon, Printer, QrCode, Calendar, MapPin, CheckCircle2, User } from 'lucide-react';

export const CustomerSpace: React.FC = () => {
  const { currentUser, customerOrders, refreshCustomerOrders } = useApp();
  const [activeTab, setActiveTab] = useState<'tickets' | 'orders' | 'profile'>('tickets');
  const [selectedTicketForQr, setSelectedTicketForQr] = useState<Ticket | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    refreshCustomerOrders();
  }, [currentUser]);

  // Generate QR code for the selected ticket
  useEffect(() => {
    if (selectedTicketForQr) {
      QRCode.toDataURL(selectedTicketForQr.token, {
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
        width: 320,
      }).then(setQrCodeDataUrl);
    } else {
      setQrCodeDataUrl('');
    }
  }, [selectedTicketForQr]);

  // Aggregate all tickets from completed orders
  const allTickets: Ticket[] = [];
  customerOrders.forEach((ord) => {
    if (ord.paymentStatus === 'completed' && ord.tickets) {
      allTickets.push(...ord.tickets);
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#1c1c1c] pb-8">
        <div>
          <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
            ESPACE PERSONNEL CLIENT
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white tracking-tight uppercase">
            MES BILLETS &amp; COMMANDES
          </h1>
          <div className="text-xs font-agrandir-regular text-[#aaa] mt-2 flex items-center gap-3">
            <span>Compte : {currentUser?.email || 'Non connecté'}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#666]">Statut : Vérifié</span>
          </div>
        </div>

        {/* Tab Controls with rounded capsule */}
        <div className="flex items-center gap-1.5 p-1.5 bg-[#121212] border border-white/10 rounded-full">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'tickets' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Billets ({allTickets.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'orders' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Commandes ({customerOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-agrandir-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer ${
              activeTab === 'profile' ? 'bg-white text-black shadow-md' : 'text-[#888] hover:text-white'
            }`}
          >
            Compte
          </button>
        </div>
      </div>

      {/* --- TAB 1: MES BILLETS --- */}
      {activeTab === 'tickets' && (
        <div>
          {allTickets.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/15 rounded-3xl bg-[#0c0c0c] p-8">
              <TicketIcon className="w-10 h-10 text-[#555] mx-auto mb-4" />
              <h3 className="font-agrandir-extrabold text-lg text-white mb-2 uppercase">AUCUN BILLET ACTIF</h3>
              <p className="text-xs font-agrandir-regular text-[#888] max-w-sm mx-auto mb-6">
                Vous n’avez pas encore de billets réservés sous cette adresse e-mail.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 sm:p-7 flex flex-col justify-between relative group hover:border-white/30 transition-all shadow-xl"
                >
                  <div>
                    {/* Status badge & serial */}
                    <div className="flex items-center justify-between text-xs font-agrandir-regular mb-4 pb-3 border-b border-white/10">
                      <span className="text-[#888] tracking-widest font-agrandir-semibold">{ticket.serialNumber}</span>
                      <span
                        className={`text-[10px] font-agrandir-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${
                          ticket.status === 'valid'
                            ? 'border-emerald-500/50 text-emerald-400 bg-emerald-950/20'
                            : 'border-amber-500/50 text-amber-400 bg-amber-950/20'
                        }`}
                      >
                        {ticket.status === 'valid' ? 'VALIDE POUR ENTRÉE' : 'DÉJÀ VALIDÉ (UTILISÉ)'}
                      </span>
                    </div>

                    <h2 className="font-agrandir-extrabold text-xl text-white tracking-tight mb-1 uppercase">
                      {ticket.eventTitle}
                    </h2>
                    <div className="text-xs font-agrandir-semibold text-[#ccc] mb-4">
                      {ticket.categoryName}
                    </div>

                    {/* Coordinates */}
                    <div className="space-y-2 text-xs font-agrandir-regular text-[#888] mb-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>{ticket.eventDate} à {ticket.eventTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span className="truncate">{ticket.eventVenue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-[#666]" />
                        <span>Titulaire : {ticket.holderName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & QR trigger */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedTicketForQr(ticket)}
                      className="flex-1 py-2.5 text-xs font-agrandir-semibold tracking-wider uppercase border border-white/20 hover:border-white text-white rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer bg-white/5 shadow-sm"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>AFFICHER LE QR</span>
                    </button>

                    <a
                      href={`/api/customer/tickets/${ticket.id}/print`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 border border-white/20 hover:border-white text-[#aaa] hover:text-white rounded-full transition-colors cursor-pointer bg-white/5"
                      title="Imprimer / Télécharger le billet PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </a>
                  </div>

                </div>
              ))}
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
                      {ord.paymentStatus === 'completed' ? 'PAYÉE' : 'EN ATTENTE'}
                    </span>
                  </div>

                  <div className="text-white text-sm font-agrandir-semibold mt-1">
                    {ord.eventTitle}
                  </div>
                  <div className="text-[#888] text-[11px] mt-0.5">
                    {ord.quantity}x {ord.categoryName} · {ord.eventDate} ({ord.eventVenue})
                  </div>
                  <div className="text-[#666] text-[10px] mt-1">
                    Date d’achat : {new Date(ord.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>

                <div className="text-right flex flex-col md:items-end justify-between gap-2">
                  <div className="text-base sm:text-lg font-agrandir-extrabold text-white">
                    {ord.totalAmount.toLocaleString()} {ord.currency}
                  </div>
                  <div className="text-[10px] text-[#777]">
                    Transaction : {ord.paymentRef || 'N/A'}
                  </div>
                  {ord.paymentStatus === 'completed' && ord.tickets && ord.tickets.length > 0 && (
                    <button
                      className="text-[11px] text-white underline cursor-pointer font-agrandir-semibold"
                      onClick={() => setActiveTab('tickets')}
                    >
                      Voir les {ord.tickets.length} billets correspondants →
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* --- TAB 3: INFORMATIONS DE COMPTE --- */}
      {activeTab === 'profile' && (
        <div className="max-w-xl bg-[#0e0e0e] border border-white/10 rounded-3xl p-8 font-agrandir-regular text-xs space-y-6 shadow-xl">
          <div className="border-b border-white/10 pb-4">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">IDENTITÉ DU TITULAIRE</div>
            <div className="text-white text-base font-agrandir-extrabold">{currentUser?.name}</div>
          </div>

          <div className="border-b border-white/10 pb-4">
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">ADRESSE E-MAIL ASSOCIÉE</div>
            <div className="text-white">{currentUser?.email}</div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1.5 font-agrandir-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Adresse vérifiée par le protocole de billetterie</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-[#777] uppercase tracking-wider mb-1 font-agrandir-semibold">RÔLE SYSTÈME</div>
            <div className="text-white uppercase font-agrandir-semibold">{currentUser?.role}</div>
          </div>
        </div>
      )}

      {/* --- MODAL QR CODE PLEIN ÉCRAN POUR SCAN PORTES --- */}
      {selectedTicketForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-sm bg-white text-black p-8 rounded-3xl text-center shadow-2xl">
            <button
              onClick={() => setSelectedTicketForQr(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-black font-agrandir-semibold text-xs cursor-pointer transition-colors"
            >
              ✕
            </button>

            <div className="text-[10px] font-agrandir-regular tracking-[0.2em] text-[#666] uppercase mb-1">
              LUMARÉEL CO. · BILLET ACCÈS
            </div>
            <h3 className="font-agrandir-extrabold text-lg uppercase tracking-tight mb-2">
              {selectedTicketForQr.eventTitle}
            </h3>
            <div className="text-xs font-agrandir-regular text-[#555] mb-6">
              {selectedTicketForQr.categoryName} · {selectedTicketForQr.holderName}
            </div>

            {/* QR Code */}
            <div className="p-4 bg-white border border-black/15 rounded-2xl inline-block mb-4 shadow-md">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code d'accès" className="w-56 h-56 mx-auto rounded-lg" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs font-agrandir-regular">
                  Génération du QR...
                </div>
              )}
            </div>

            <div className="font-agrandir-extrabold text-xs tracking-wider mb-1">
              {selectedTicketForQr.serialNumber}
            </div>
            <div className="font-agrandir-regular text-[9px] text-[#666] break-all mb-4">
              {selectedTicketForQr.token}
            </div>

            <div className="text-[10px] font-agrandir-regular text-[#777] border-t border-black/10 pt-3">
              Présentez ce QR code au terminal de l’agent à l’entrée.
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
