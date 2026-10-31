import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent, TicketCategory } from '../types';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2
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
  ticketDesignUrl: string;
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
  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    selectedEvent?.categories[0]?.id || ''
  );
  
  const [quantity, setQuantity] = useState<number>(1000); 
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  
  const ticketsRef = useRef<GeneratedPrintTicket[]>([]); 
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  useEffect(() => {
    setIsReadyToPrint(false);
    ticketsRef.current = [];
    setGenerationProgress(0);
  }, [selectedEventId, selectedCategoryId, isOpen]);

  if (!isOpen) return null;

  const currentCategory = selectedEvent?.categories.find((c) => c.id === selectedCategoryId) || selectedEvent?.categories[0];
  const defaultTicketDesign = currentCategory?.ticketImageUrl || selectedEvent?.officialPoster || selectedEvent?.artistPortrait || '';

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !currentCategory || quantity <= 0) {
      showToast('Configuration d’impression incomplète.', 'error');
      return;
    }
    if (!defaultTicketDesign) {
       showToast("Aucun design ou affiche n'est disponible pour ce billet.", 'error');
       return;
    }

    setIsGenerating(true);
    setIsReadyToPrint(false);
    ticketsRef.current = [];
    setGenerationProgress(0);

    const batchNum = `BAT-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const CHUNK_SIZE = 100; 
    let generatedCount = 0;

    const generateChunk = async () => {
        const chunkTickets: GeneratedPrintTicket[] = [];
        const limit = Math.min(generatedCount + CHUNK_SIZE, quantity);

        for (let i = generatedCount + 1; i <= limit; i++) {
          const id = `tkt_phys_${Date.now()}_${i}`;
          const serialNumber = `LMR-2026-${selectedEvent.artist.slice(0, 3).toUpperCase()}-${String(100000 + i).slice(-5)}`;
          const token = `TKT_SEC_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

          const qrDataUrl = await QRCode.toDataURL(token, {
            margin: 1,
            color: { dark: '#000000', light: '#ffffff' },
            width: 300,
          });

          chunkTickets.push({
            id,
            serialNumber,
            token,
            qrDataUrl,
            categoryName: currentCategory.name,
            price: currentCategory.price,
            currency: currentCategory.currency || 'XOF',
            event: selectedEvent,
            batchNumber: batchNum,
            ticketDesignUrl: defaultTicketDesign
          });
        }

        ticketsRef.current = [...ticketsRef.current, ...chunkTickets];
        generatedCount = limit;
        setGenerationProgress(Math.round((generatedCount / quantity) * 100));

        if (generatedCount < quantity) {
           setTimeout(generateChunk, 10); 
        } else {
           setIsGenerating(false);
           setIsReadyToPrint(true);
           showToast(`Préparation de ${quantity} billets terminée.`, 'success');
        }
    };

    generateChunk();
  };

  // CORRECTION MAJEURE ICI : window.print() doit être appelé de façon synchrone (sans setTimeout)
  const handlePrint = () => {
    window.print();
  };

  return (
    // CORRECTION CSS : print:static et print:bg-white permettent au navigateur de paginer les 10 000 billets
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular print:static print:bg-white print:p-0 print:block">
      
      {/* Conteneur Modal de l'UI - Caché pendant l'impression avec print:hidden */}
      <div className="relative w-full max-w-4xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-5 sm:p-8 text-white shadow-2xl my-6 print:hidden">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">
                IMPRESSION RECTO / VERSO (HAUTE CAPACITÉ)
              </div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white">
                Générateur de Billets
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isReadyToPrint ? (
          <form onSubmit={handleGenerateBatch} className="space-y-5 max-w-xl mx-auto py-4">
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
                disabled={isGenerating}
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>{evt.artist} — {evt.title} ({evt.date})</option>
                ))}
              </select>
            </div>

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
                  disabled={isGenerating}
                >
                  {selectedEvent.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} — {cat.price.toLocaleString()} {cat.currency || 'XOF'} 
                      {cat.ticketImageUrl ? ' (Design Uploadé)' : ' (Affiche par défaut)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {defaultTicketDesign && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                  <div className="w-28 aspect-[1536/548] overflow-hidden rounded bg-black border border-white/20 shrink-0">
                    <img src={defaultTicketDesign} alt="Design" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-[10px] text-neutral-400">
                      <div>Format standard recommandé : <strong className="text-[#d4af37] font-mono">1536 × 548 pixels</strong></div>
                      <div>Visuel appliqué sur le <strong className="text-white">Recto</strong> de la catégorie {currentCategory?.name}.</div>
                  </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                3. Quantité de tickets à imprimer
              </label>
              <div className="flex flex-col gap-3">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-lg font-agrandir-bold text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isGenerating}
                />
                <div className="flex flex-wrap gap-2">
                  {[100, 500, 1000, 5000].map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setQuantity(q)}
                      className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-bold text-neutral-300 hover:text-white"
                    >
                      {q.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
              
              {quantity > 1000 && (
                <div className="mt-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-2 text-yellow-500 text-[10px]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Processus lourd découpé en lots. Ne fermez pas l'onglet.</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isGenerating || !defaultTicketDesign}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
            >
              {isGenerating ? (
                <>
                  <div className="absolute inset-0 bg-[#d4af37]/20" style={{ width: `${generationProgress}%`, transition: 'width 0.3s' }} />
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  <span className="relative z-10">Génération en cours... {generationProgress}%</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Préparer {quantity.toLocaleString()} billets</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
                 <CheckCircle2 className="w-10 h-10 text-emerald-500" />
             </div>
             <div>
                <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">Planche Prête</h3>
                <p className="text-[#888] text-sm max-w-md mx-auto leading-relaxed">
                   <strong>{ticketsRef.current.length.toLocaleString()} billets</strong> de catégorie <strong className="text-white">{currentCategory?.name}</strong> prêts à l'impression.
                </p>
             </div>
             <div className="flex items-center gap-4 mt-8">
                <button onClick={() => setIsReadyToPrint(false)} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-xs font-agrandir-bold uppercase tracking-wider">
                  Annuler
                </button>
                <button
                  onClick={handlePrint}
                  className="px-8 py-3 rounded-2xl bg-[#d4af37] hover:bg-[#c29d2b] text-black font-agrandir-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-transform hover:scale-105"
                >
                  <Printer className="w-5 h-5" />
                  <span>Lancer l'Impression PDF</span>
                </button>
             </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          CONTENEUR STRICT POUR IMPRESSION (Invisible sauf à l'impression)
         ========================================================================= */}
      {isReadyToPrint && (
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
          <div className="text-center font-bold text-xs uppercase mb-3 text-black border-b border-black pb-1.5 flex items-center justify-between">
            <span>LUMARÉEL CO. — FACES RECTO ({currentCategory?.name})</span>
            <span className="font-mono text-[9px]">RÉSOLUTION : 1536 × 548 PX (153.6 × 54.8 MM)</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            {ticketsRef.current.map((t) => (
              <div key={`print-recto-${t.id}`} className="w-[153.6mm] h-[54.8mm] border border-black p-0 bg-white relative overflow-hidden shrink-0 shadow-none">
                <img src={t.ticketDesignUrl} alt={t.categoryName} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* 2. PAGES VERSO */}
        <div className="print:break-page">
          <div className="text-center font-bold text-xs uppercase mb-3 text-black border-b border-black pb-1.5 flex items-center justify-between">
            <span>LUMARÉEL CO. — FACES VERSO (CONTRÔLE VIGILE CRYPTOGRAPHIQUE)</span>
            <span className="font-mono text-[9px]">FORMAT SÉCURISÉ 153.6 × 54.8 MM</span>
          </div>
          <div className="flex flex-col items-center gap-4">
            {ticketsRef.current.map((t) => (
              <div key={`print-verso-${t.id}`} className="w-[153.6mm] h-[54.8mm] border border-black p-3.5 flex items-center justify-between text-left bg-white text-black relative shrink-0">
                <div className="flex-1 pr-3 flex flex-col justify-between h-full">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-black">
                      {t.event.artist} EN CONCERT
                    </div>
                    <div className="text-[8px] font-bold uppercase tracking-wider text-neutral-800 mt-0.5">
                      CATÉGORIE : {t.categoryName} · {t.price.toLocaleString()} {t.currency}
                    </div>
                    <div className="text-[8px] text-neutral-600 mt-0.5">
                      {t.event.venue} · {t.event.date}
                    </div>
                  </div>

                  <div className="border-t border-black/40 pt-1.5 mt-1">
                    <div className="text-[7px] leading-tight text-neutral-700">
                      • Billet individuel strict. L'entrée aux portes invalide le jeton.<br />
                      • Toute copie ou reproduction est passible de poursuites.<br />
                      • Contrôle d'accès et régie : LUMARÉEL CO.
                    </div>
                    <div className="text-[7.5px] font-mono font-bold mt-1 text-black">
                      N° {t.serialNumber} · {t.token.slice(0, 22)}...
                    </div>
                  </div>
                </div>

                <div className="p-1 border border-black shrink-0 flex flex-col items-center justify-center bg-white">
                  <img src={t.qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                  <span className="text-[7px] font-mono font-bold mt-0.5">SCAN OFFICIEL</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

    </div>
  );
};