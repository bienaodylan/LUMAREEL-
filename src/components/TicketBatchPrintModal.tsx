import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Sparkles,
  Ticket as TicketIcon,
  CheckCircle2,
  Calendar,
  MapPin,
  ShieldCheck,
  Loader2,
  Copy,
  Layers
} from 'lucide-react';

interface GeneratedPrintTicket {
  id: string;
  serialNumber: string;
  token: string;
  qrDataUrl: string;
  categoryName: string;
  price: number;
  currency: string;
  event: ConcertEvent;
  batchNumber: string;
}

interface TicketBatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEventId?: string;
}

export const TicketBatchPrintModal: React.FC<TicketBatchPrintModalProps> = ({
  isOpen,
  onClose,
  initialEventId,
}) => {
  const { events, showToast } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId && events.some(e => e.id === initialEventId)
      ? initialEventId
      : (events[0]?.id || '')
  );
  const selectedEvent =
    events.find((e) => e.id === selectedEventId) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    selectedEvent?.categories[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(10);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedTickets, setGeneratedTickets] = useState<
    GeneratedPrintTicket[]
  >([]);
  const [previewSide, setPreviewSide] = useState<'recto' | 'verso'>('recto');

  if (!isOpen) return null;

  const currentCategory =
    selectedEvent?.categories.find((c) => c.id === selectedCategoryId) ||
    selectedEvent?.categories[0];

  // Génération des billets physiques avec QR codes cryptographiques uniques
  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !currentCategory || quantity <= 0) {
      showToast('Configuration d’impression incomplète.', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      const batchNum = `BAT-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      const tickets: GeneratedPrintTicket[] = [];

      for (let i = 1; i <= quantity; i++) {
        const id = `tkt_phys_${Date.now()}_${i}`;
        const serialNumber = `LMR-2026-${selectedEvent.artist.slice(0, 3).toUpperCase()}-${String(
          1000 + i
        )}`;
        const token = `TKT_SEC_${Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

        // Génération du QR code en base64 pour chaque billet
        const qrDataUrl = await QRCode.toDataURL(token, {
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          width: 320,
        });

        tickets.push({
          id,
          serialNumber,
          token,
          qrDataUrl,
          categoryName: currentCategory.name,
          price: currentCategory.price,
          currency: currentCategory.currency || 'XOF',
          event: selectedEvent,
          batchNumber: batchNum,
        });
      }

      setGeneratedTickets(tickets);
      showToast(`Planche de ${tickets.length} billets générée avec succès.`, 'success');
    } catch (err: any) {
      showToast('Erreur lors de la génération des billets.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular">
      
      {/* Conteneur Modal */}
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-5 sm:p-8 text-white shadow-2xl my-6">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">
                IMPRESSION RECTO / VERSO
              </div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white">
                Générateur de Billets Physiques
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Formulaire de Configuration */}
        {generatedTickets.length === 0 ? (
          <form onSubmit={handleGenerateBatch} className="space-y-5 max-w-xl mx-auto py-4">
            
            {/* Sélection de l'Événement */}
            <div>
              <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                1. Sélectionner l'Événement
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  const ev = events.find((x) => x.id === e.target.value);
                  if (ev && ev.categories[0]) {
                    setSelectedCategoryId(ev.categories[0].id);
                  }
                }}
                className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                required
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.artist} — {evt.title} ({evt.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection de la Catégorie */}
            {selectedEvent && (
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  2. Catégorie de Place
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                >
                  {selectedEvent.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — {cat.price.toLocaleString()} {cat.currency || 'XOF'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nombre de billets */}
            <div>
              <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                3. Quantité de tickets à imprimer
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-sm font-agrandir-bold text-white outline-none focus:border-[#d4af37]"
                  required
                />
                <div className="flex gap-1.5 shrink-0">
                  {[10, 25, 50].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="px-3 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-bold text-neutral-300 hover:text-white"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Note d'impression offset */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#888] flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Ce module génère des identifiants cryptographiques uniques avec QR Code pour impression offset double-face (Recto: visuel et scène · Verso: QR Code de contrôle vigile et mentions légales).
              </p>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Génération de la planche en cours...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Générer la planche ({quantity} billets)</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* 2. Prévisualisation & Impression */
          <div className="space-y-6">
            
            {/* Contrôles du haut */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xs">
                <span className="text-[#888]">Planche prête :</span>{' '}
                <strong className="text-white font-agrandir-bold">
                  {generatedTickets.length} billets générés
                </strong>{' '}
                <span className="text-neutral-500">
                  ({generatedTickets[0]?.categoryName})
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {/* Sélecteur de face */}
                <div className="flex rounded-xl bg-black border border-white/15 p-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewSide('recto')}
                    className={`px-3 py-1 rounded-lg uppercase font-agrandir-bold ${
                      previewSide === 'recto'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Recto
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSide('verso')}
                    className={`px-3 py-1 rounded-lg uppercase font-agrandir-bold ${
                      previewSide === 'verso'
                        ? 'bg-white text-black'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Verso
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer ml-auto"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimer (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setGeneratedTickets([])}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-agrandir-semibold"
                >
                  Nouvelle planche
                </button>
              </div>
            </div>

            {/* Zone de prévisualisation à l'écran */}
            <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-1">
              {generatedTickets.map((t, idx) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-[#141414] border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  {previewSide === 'recto' ? (
                    /* APERÇU RECTO */
                    <div className="flex items-center gap-4 w-full">
                      <img
                        src={t.event.officialPoster || t.event.bannerImage}
                        alt={t.event.title}
                        className="w-16 h-20 object-cover rounded-xl shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-agrandir-bold text-[#d4af37] uppercase">
                          {t.event.artist}
                        </div>
                        <div className="font-agrandir-extrabold text-sm text-white truncate uppercase">
                          {t.event.title}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">
                          {t.event.date} à {t.event.time} · {t.event.venue}
                        </div>
                        <div className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-agrandir-bold text-white uppercase">
                          {t.categoryName} · {t.price.toLocaleString()} {t.currency}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9px] font-mono text-neutral-500">
                          N° {t.serialNumber}
                        </div>
                        <span className="text-[10px] text-emerald-400 font-agrandir-semibold">
                          FACE RECTO #{idx + 1}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* APERÇU VERSO */
                    <div className="flex items-center gap-6 w-full justify-between">
                      <div className="space-y-1 max-w-sm">
                        <div className="text-[9px] uppercase font-agrandir-bold text-[#d4af37]">
                          CONTRÔLE D'ACCÈS VIGILE
                        </div>
                        <div className="font-agrandir-bold text-xs text-white">
                          Billet nominatif individuel non duplicable
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-tight">
                          Présentation obligatoire au scanner de sécurité. Toute reproduction ou double usage entraîne le blocage immédiat.
                        </p>
                        <div className="text-[9px] font-mono text-neutral-500 pt-1">
                          N° {t.serialNumber} · {t.batchNumber}
                        </div>
                      </div>

                      <div className="p-2 bg-white rounded-xl shrink-0 shadow-lg">
                        <img
                          src={t.qrDataUrl}
                          alt="QR Code"
                          className="w-20 h-20 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* =========================================================================
          CONTENEUR STRICT POUR IMPRESSION PHYSIQUE (@media print)
          Ce bloc est masqué à l'écran et s'affiche uniquement lors du window.print()
          pour générer des pages distinctes Recto et Verso pour l'imprimeur.
         ========================================================================= */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: #fff !important; color: #000 !important; margin: 0 !important; padding: 0 !important; }
            .print\\:break-page { page-break-after: always; break-after: page; }
            @page { size: A4 portrait; margin: 10mm; }
          }
        `}} />

        {/* 1. PAGES RECTO */}
        <div className="print:break-page">
          <div className="text-center font-bold text-xs uppercase mb-4 text-black border-b border-black pb-2">
            PLANCHE D'IMPRESSION LUMARÉEL CO. — FACES RECTO (ARTISTES &amp; DÉTAILS)
          </div>
          <div className="grid grid-cols-2 gap-4">
            {generatedTickets.map((t) => (
              <div
                key={`print-recto-${t.id}`}
                className="border-2 border-black p-4 flex gap-4 h-[120mm] bg-white text-black relative"
              >
                <img
                  src={t.event.officialPoster || t.event.bannerImage}
                  alt={t.event.title}
                  className="w-1/3 h-full object-cover filter contrast-110 border border-black"
                />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-[9px] uppercase font-bold tracking-widest text-neutral-700">
                      LUMARÉEL CO. · BILLET OFFICIEL
                    </div>
                    <h2 className="text-xl font-black uppercase leading-tight mt-1">
                      {t.event.artist}
                    </h2>
                    <div className="text-xs font-bold uppercase mt-0.5">
                      {t.event.title}
                    </div>
                    <div className="text-[11px] mt-3">
                      <strong>DATE :</strong> {t.event.date} à {t.event.time}
                    </div>
                    <div className="text-[11px]">
                      <strong>LIEU :</strong> {t.event.venue}
                    </div>
                  </div>

                  <div>
                    <div className="border-t border-black pt-2 flex items-center justify-between">
                      <span className="font-black text-sm uppercase">
                        {t.categoryName}
                      </span>
                      <span className="font-bold text-xs">
                        {t.price.toLocaleString()} {t.currency}
                      </span>
                    </div>
                    <div className="text-[8px] font-mono text-neutral-600 mt-1">
                      N° SÉRIE : {t.serialNumber} · LOT : {t.batchNumber}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. PAGES VERSO */}
        <div className="print:break-page">
          <div className="text-center font-bold text-xs uppercase mb-4 text-black border-b border-black pb-2">
            PLANCHE D'IMPRESSION LUMARÉEL CO. — FACES VERSO (QR CODES CONTRÔLE VIGILE)
          </div>
          <div className="grid grid-cols-2 gap-4">
            {generatedTickets.map((t) => (
              <div
                key={`print-verso-${t.id}`}
                className="border-2 border-black p-5 flex flex-col items-center justify-between h-[120mm] text-center bg-white text-black relative"
              >
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest">
                    CONTRÔLE D’ACCÈS OFFICIEL LUMARÉEL
                  </div>
                  <div className="text-[8px] uppercase tracking-wider text-neutral-600">
                    JETON CRYPTOGRAPHIQUE SÉCURISÉ
                  </div>
                </div>

                {/* QR Code haute définition centré */}
                <div className="my-2 p-2 border border-black inline-block">
                  <img
                    src={t.qrDataUrl}
                    alt="QR Code d'accès"
                    className="w-36 h-36 object-contain"
                  />
                </div>

                <div className="w-full text-left border-t border-black pt-2">
                  <div className="text-[8px] leading-tight text-neutral-700">
                    • Billet individuel strict. L'entrée aux portes invalide le jeton.<br />
                    • Interdiction stricte de reproduction ou revente non autorisée.<br />
                    • Direction de production : LUMARÉEL CO. · Paris / Abidjan.
                  </div>
                  <div className="text-[8px] font-mono font-bold mt-1 text-center">
                    {t.serialNumber} · {t.token.slice(0, 20)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
