import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent, TicketCategory } from '../types';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  CheckCircle2,
  Loader2,
  Upload,
  Check
} from 'lucide-react';
import { formatDateLongFrench } from '../utils/dateUtils';

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

const PAPER_FORMATS = [
  { name: 'A1 (594 × 841 mm)', width: 594, height: 841, cols: 6, rows: 8 }, // ~48 billets
  { name: 'A2 (420 × 594 mm)', width: 420, height: 594, cols: 2, rows: 2 }, // ~4 billets
  { name: 'A3 (297 × 420 mm)', width: 297, height: 420, cols: 2, rows: 4 }, // ~8 billets
  { name: 'A4 (210 × 297 mm)', width: 210, height: 297, cols: 2, rows: 2 }, // ~4 billets
  { name: 'A5 (148 × 210 mm)', width: 148, height: 210, cols: 1, rows: 2 }, // ~2 billets
  { name: 'A6 (105 × 148 mm)', width: 105, height: 148, cols: 1, rows: 1 }, // 1 billet
  { name: 'B1 (707 × 1000 mm)', width: 707, height: 1000, cols: 8, rows: 8 }, // ~64 billets
  { name: 'B2 (500 × 707 mm)', width: 500, height: 707, cols: 6, rows: 6 }, // ~36 billets
  { name: 'B3 (353 × 500 mm)', width: 353, height: 500, cols: 3, rows: 4 }, // ~12 billets
  { name: 'B4 (250 × 353 mm)', width: 250, height: 353, cols: 2, rows: 8 }, // ~16 billets
  { name: 'B5 (176 × 250 mm)', width: 176, height: 250, cols: 1, rows: 2 }, // ~2 billets
  { name: 'SRA2 (450 × 640 mm)', width: 450, height: 640, cols: 2, rows: 2 }, // ~4 billets
  { name: 'SRA3 (320 × 450 mm)', width: 320, height: 450, cols: 2, rows: 4 }, // ~8 billets
  { name: 'A3+ (329 × 483 mm)', width: 329, height: 483, cols: 2, rows: 5 }, // ~10 billets
];

export const TicketBatchPrintModal: React.FC<TicketBatchPrintModalProps> = ({
  isOpen,
  onClose,
  initialEventId,
}) => {
  const { events, showToast, saveEvent } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialEventId && events.some((e) => e.id === initialEventId)
      ? initialEventId
      : (events[0]?.id || '')
  );

  useEffect(() => {
    if (initialEventId && events.some((e) => e.id === initialEventId)) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId, isOpen]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    selectedEvent?.categories[0]?.id || ''
  );

  useEffect(() => {
    if (selectedEvent && selectedEvent.categories.length > 0) {
      if (!selectedEvent.categories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(selectedEvent.categories[0].id);
      }
    }
  }, [selectedEventId, selectedEvent]);

  const [quantity, setQuantity] = useState<number>(10);
  const [printOrderMode, setPrintOrderMode] = useState<'batched' | 'paired'>('batched');
  const [selectedPaper, setSelectedPaper] = useState(PAPER_FORMATS[2]); // A3 par défaut
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState<boolean>(false);

  const ticketsRef = useRef<GeneratedPrintTicket[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);

  useEffect(() => {
    setIsReadyToPrint(false);
    ticketsRef.current = [];
    setGenerationProgress(0);
  }, [selectedEventId, selectedCategoryId, isOpen]);

  if (!isOpen) return null;

  const currentCategory =
    selectedEvent?.categories.find((c) => c.id === selectedCategoryId) ||
    selectedEvent?.categories[0];

  const categoryDesignUrl =
    currentCategory?.ticketImageUrl ||
    selectedEvent?.officialPoster ||
    selectedEvent?.bannerImage ||
    selectedEvent?.artistPortrait ||
    '';

  const handleUploadCategoryDesign = async (file: File) => {
    if (!selectedEvent || !currentCategory) return;
    try {
      setIsUploadingDesign(true);
      let fileUrl = '';
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.url) fileUrl = data.url;
        }
      } catch (e) {
        console.warn('Upload fallback to dataURL', e);
      }

      if (!fileUrl) {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const updatedCategories = selectedEvent.categories.map((c) =>
        c.id === currentCategory.id ? { ...c, ticketImageUrl: fileUrl } : c
      );
      const updatedEvent = { ...selectedEvent, categories: updatedCategories };
      await saveEvent(updatedEvent);
      showToast(`Design de la catégorie ${currentCategory.name} mis à jour !`, 'success');
    } catch {
      showToast("Erreur lors de l'import du visuel de ticket.", 'error');
    } finally {
      setIsUploadingDesign(false);
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !currentCategory || quantity <= 0) {
      showToast('Configuration d’impression incomplète.', 'error');
      return;
    }
    if (!categoryDesignUrl) {
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
        const artistCode = selectedEvent.artist.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'LMR';
        const serialNumber = `LMR-2026-${artistCode}-${String(100000 + i).slice(-5)}`;
        const token = `TKT_SEC_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

        const qrDataUrl = await QRCode.toDataURL(token, {
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          width: 340,
        });

        chunkTickets.push({
          id,
          serialNumber,
          token,
          qrDataUrl,
          categoryName: currentCategory.name,
          price: currentCategory.price,
          currency: 'FCFA',
          event: selectedEvent,
          batchNumber: batchNum,
          ticketDesignUrl: categoryDesignUrl,
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
        showToast(`Préparation de ${quantity} billets en grille terminée.`, 'success');
      }
    };

    generateChunk();
  };

  const handlePrint = () => {
    window.print();
  };

  // Regroupement des billets par pages en fonction de la capacité de la grille (cols * rows)
  const ticketsPerPage = selectedPaper.cols * selectedPaper.rows;
  const chunkArray = (arr: GeneratedPrintTicket[], size: number) => {
    const res = [];
    for (let i = 0; i < arr.length; i += size) {
      res.push(arr.slice(i, i + size));
    }
    return res;
  };

  const ticketPages = chunkArray(ticketsRef.current, ticketsPerPage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular print:fixed print:inset-0 print:bg-white print:z-[99999] print:p-0 print:m-0">
      
      {/* UI Modal Box - Strictement masqué pendant l'impression */}
      <div className="relative w-full max-w-3xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-8 text-white shadow-2xl my-6 print:hidden">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">
                MODULE PROFESSIONNEL D'IMPOSITION EN GRILLE
              </div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white">
                Générateur de Billets Physiques
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isReadyToPrint ? (
          <form onSubmit={handleGenerateBatch} className="space-y-6">
            
            {initialEventId && selectedEvent ? (
              <div className="p-4 bg-[#141414] border border-[#d4af37]/30 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedEvent.officialPoster || selectedEvent.artistPortrait}
                    alt={selectedEvent.artist}
                    className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0"
                  />
                  <div>
                    <div className="text-[9px] text-[#d4af37] font-agrandir-bold tracking-[0.2em] uppercase">
                      ÉVÉNEMENT SÉLECTIONNÉ
                    </div>
                    <div className="text-white font-agrandir-extrabold text-base uppercase">
                      {selectedEvent.artist} EN CONCERT
                    </div>
                    <div className="text-xs text-neutral-300 mt-0.5">
                      <strong className="text-white font-agrandir-bold">{selectedEvent.venue}</strong> · <strong className="text-white font-agrandir-bold">{formatDateLongFrench(selectedEvent.date)}</strong>
                    </div>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-agrandir-semibold uppercase">
                  Production Active
                </span>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  1. Sélectionner l'Événement
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isGenerating}
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.artist} EN CONCERT — {evt.venue} ({formatDateLongFrench(evt.date)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedEvent && (
              <div className="space-y-2">
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888]">
                  2. Catégorie de Place &amp; Design (1536 × 548 px)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedEvent.categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    const hasCustomDesign = Boolean(cat.ticketImageUrl);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#181818] border-[#d4af37] ring-1 ring-[#d4af37]/40 shadow-lg'
                            : 'bg-[#111] border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-agrandir-extrabold text-sm text-white uppercase">
                            {cat.name}
                          </span>
                          <span className="text-xs font-agrandir-bold text-[#d4af37]">
                            {cat.price.toLocaleString()} FCFA
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{cat.quota.toLocaleString()} places prévues</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-agrandir-semibold ${
                            hasCustomDesign ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-neutral-300'
                          }`}>
                            {hasCustomDesign ? 'Design spécifique' : 'Affiche par défaut'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {currentCategory && (
              <div className="p-4 bg-[#141414] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider">
                    VISUEL RECTO OFFICIEL : {currentCategory.name}
                  </div>
                  <label className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3 h-3 text-[#d4af37]" />
                    <span>{isUploadingDesign ? 'Import...' : 'Changer le visuel'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingDesign}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadCategoryDesign(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-60 aspect-[1536/548] overflow-hidden rounded-xl bg-black border border-white/20 shrink-0 relative group">
                    <img
                      src={categoryDesignUrl}
                      alt={currentCategory.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-relaxed">
                    Le format de chaque billet est normalisé à <strong className="text-white font-mono">1536 × 548 px</strong> et disposé automatiquement en grille sur la feuille sélectionnée.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  3. Format du Papier
                </label>
                <select
                  value={selectedPaper.name}
                  onChange={(e) => {
                    const p = PAPER_FORMATS.find(x => x.name === e.target.value);
                    if (p) setSelectedPaper(p);
                  }}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]"
                >
                  {PAPER_FORMATS.map((paper) => (
                    <option key={paper.name} value={paper.name}>
                      {paper.name} (~{paper.cols * paper.rows} billets/feuille)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  4. Quantité de billets
                </label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]"
                  required
                  disabled={isGenerating}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  5. Mode d'impression
                </label>
                <select
                  value={printOrderMode}
                  onChange={(e) => setPrintOrderMode(e.target.value as 'batched' | 'paired')}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]"
                >
                  <option value="batched">Tous les Rectos puis tous les Versos</option>
                  <option value="paired">Recto / Verso Alterné</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !categoryDesignUrl}
              className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden"
            >
              {isGenerating ? (
                <>
                  <div
                    className="absolute inset-0 bg-[#d4af37]/20"
                    style={{ width: `${generationProgress}%`, transition: 'width 0.3s' }}
                  />
                  <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                  <span className="relative z-10">
                    Génération des planches en grille... {generationProgress}%
                  </span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Préparer {quantity.toLocaleString()} billets physiques</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">
                Planches Prêtes à l'Impression
              </h3>
              <p className="text-[#888] text-xs max-w-md mx-auto leading-relaxed">
                <strong className="text-white font-agrandir-bold">{ticketsRef.current.length} billets</strong> répartis sur <strong className="text-[#d4af37] font-agrandir-bold">{ticketPages.length} feuille(s)</strong> au format <strong className="text-white">{selectedPaper.name}</strong> ({selectedPaper.cols} colonnes × {selectedPaper.rows} lignes par page).
              </p>
            </div>

            <div className="flex items-center gap-4 mt-6">
              <button
                type="button"
                onClick={() => setIsReadyToPrint(false)}
                className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-agrandir-bold uppercase tracking-wider cursor-pointer"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-8 py-3.5 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-transform hover:scale-105 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Lancer l'impression PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MOTEUR D'IMPRESSION NATIVE EN GRILLE (MASQUE TOUT LE RESTE DU SITE)
         ========================================================================= */}
      {isReadyToPrint && (
        <div className="hidden print:block print:w-full print:bg-white print:text-black print:m-0 print:p-0">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-sheet-area, #printable-sheet-area * {
                    visibility: visible !important;
                  }
                  #printable-sheet-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    background: #ffffff !important;
                  }
                  @page {
                    size: ${selectedPaper.width}mm ${selectedPaper.height}mm;
                    margin: 0 !important;
                  }
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-page-grid {
                    width: ${selectedPaper.width}mm !important;
                    height: ${selectedPaper.height}mm !important;
                    max-width: ${selectedPaper.width}mm !important;
                    max-height: ${selectedPaper.height}mm !important;
                    overflow: hidden !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    display: grid !important;
                    grid-template-columns: repeat(${selectedPaper.cols}, 1fr) !important;
                    grid-template-rows: repeat(${selectedPaper.rows}, 1fr) !important;
                    gap: 2mm !important;
                    padding: 5mm !important;
                    box-sizing: border-box !important;
                    background: #ffffff !important;
                  }
                  .print-ticket-cell {
                    border: 1px dashed #666666 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    overflow: hidden !important;
                    background: #ffffff !important;
                    box-sizing: border-box !important;
                  }
                }
              `,
            }}
          />

          <div id="printable-sheet-area">
            {printOrderMode === 'batched' ? (
              <>
                {/* 1. TOUTES LES PAGES RECTO EN GRILLE */}
                {ticketPages.map((pageTickets, pageIdx) => (
                  <div key={`recto-grid-page-${pageIdx}`} className="print-page-grid">
                    {pageTickets.map((t) => (
                      <div key={`recto-cell-${t.id}`} className="print-ticket-cell">
                        <img
                          src={t.ticketDesignUrl}
                          alt={t.categoryName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>
                ))}

                {/* 2. TOUTES LES PAGES VERSO EN GRILLE */}
                {ticketPages.map((pageTickets, pageIdx) => (
                  <div key={`verso-grid-page-${pageIdx}`} className="print-page-grid">
                    {pageTickets.map((t) => (
                      <div key={`verso-cell-${t.id}`} className="print-ticket-cell p-2 flex flex-col justify-between text-black bg-white">
                        <div className="flex justify-between text-[7px] font-bold border-b border-black pb-0.5">
                          <span>{t.event.artist}</span>
                          <span>{t.categoryName} · {t.price}F</span>
                        </div>
                        <div className="my-auto flex flex-col items-center">
                          <img src={t.qrDataUrl} alt="QR" style={{ width: '55px', height: '55px' }} />
                          <span className="text-[6px] font-mono mt-0.5">{t.serialNumber}</span>
                        </div>
                        <div className="text-[5px] text-center border-t border-black pt-0.5">
                          LUMARÉEL CO. · SÉCURITÉ VIGILE
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              /* Mode Alterné : Page Recto, puis Page Verso pour chaque lot */
              ticketPages.map((pageTickets, pageIdx) => (
                <React.Fragment key={`paired-grid-group-${pageIdx}`}>
                  {/* Recto Page */}
                  <div className="print-page-grid">
                    {pageTickets.map((t) => (
                      <div key={`paired-recto-cell-${t.id}`} className="print-ticket-cell">
                        <img
                          src={t.ticketDesignUrl}
                          alt={t.categoryName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Verso Page */}
                  <div className="print-page-grid">
                    {pageTickets.map((t) => (
                      <div key={`paired-verso-cell-${t.id}`} className="print-ticket-cell p-2 flex flex-col justify-between text-black bg-white">
                        <div className="flex justify-between text-[7px] font-bold border-b border-black pb-0.5">
                          <span>{t.event.artist}</span>
                          <span>{t.categoryName} · {t.price}F</span>
                        </div>
                        <div className="my-auto flex flex-col items-center">
                          <img src={t.qrDataUrl} alt="QR" style={{ width: '55px', height: '55px' }} />
                          <span className="text-[6px] font-mono mt-0.5">{t.serialNumber}</span>
                        </div>
                        <div className="text-[5px] text-center border-t border-black pt-0.5">
                          LUMARÉEL CO. · SÉCURITÉ VIGILE
                        </div>
                      </div>
                    ))}
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};