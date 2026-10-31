import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  CheckCircle2,
  Loader2,
  Upload,
  Download
} from 'lucide-react';
import { formatDateLongFrench } from '../utils/dateUtils';
import { SYSTEM_PAPER_FORMATS, generateProductionPDF, PrintTicketItem } from './pdfEngine';

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
  const [selectedPaperKey, setSelectedPaperKey] = useState<string>('A3');
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState<boolean>(false);

  const ticketsRef = useRef<PrintTicketItem[]>([]);
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

    let generatedCount = 0;
    const CHUNK_SIZE = 50;

    const generateChunk = async () => {
      const chunkTickets: PrintTicketItem[] = [];
      const limit = Math.min(generatedCount + CHUNK_SIZE, quantity);

      for (let i = generatedCount + 1; i <= limit; i++) {
        const id = `tkt_phys_${Date.now()}_${i}`;
        const artistCode = selectedEvent.artist.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'LMR';
        const serialNumber = `LMR-2026-${artistCode}-${String(100000 + i).slice(-5)}`;
        const token = `TKT_SEC_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;

        chunkTickets.push({
          id,
          serialNumber,
          token,
          categoryName: currentCategory.name,
          price: currentCategory.price,
          artist: selectedEvent.artist,
          venue: selectedEvent.venue,
          dateStr: formatDateLongFrench(selectedEvent.date),
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
        showToast(`Lot de ${quantity} billets préparé avec succès.`, 'success');
      }
    };

    generateChunk();
  };

  const handleDownloadPDFs = async () => {
    const paper = SYSTEM_PAPER_FORMATS[selectedPaperKey];
    if (!paper) return;

    showToast('Génération du PDF RECTO en cours...', 'success');
    const rectoPdf = await generateProductionPDF(ticketsRef.current, paper, 'recto');
    rectoPdf.save(`LUMAREEL_RECTO_${selectedEvent.artist}_${selectedPaperKey}.pdf`);

    setTimeout(async () => {
      showToast('Génération du PDF VERSO en cours...', 'success');
      const versoPdf = await generateProductionPDF(ticketsRef.current, paper, 'verso');
      versoPdf.save(`LUMAREEL_VERSO_${selectedEvent.artist}_${selectedPaperKey}.pdf`);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular">
      
      <div className="relative w-full max-w-3xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-8 text-white shadow-2xl my-6">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">
                MOTEUR PDF PROFESSIONNEL (OPTIMISÉ SANS ESPACE)
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
                  Prêt
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
                  2. Catégorie de Place &amp; Design Officiel (1536 × 548 px)
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
                    VISUEL RECTO : {currentCategory.name}
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
                    Les billets sont agencés bord à bord sur la feuille pour une utilisation optimale de l'espace d'impression.
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  3. Format du Papier
                </label>
                {/* Sélecteur épuré affichant uniquement le nom et les dimensions officielles */}
                <select
                  value={selectedPaperKey}
                  onChange={(e) => setSelectedPaperKey(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]"
                >
                  {Object.entries(SYSTEM_PAPER_FORMATS).map(([key, paper]) => (
                    <option key={key} value={key}>
                      {paper.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  4. Quantité de billets à préparer
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
                    Préparation du lot... {generationProgress}%
                  </span>
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
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">
                Lot Prêt pour la Production
              </h3>
              <p className="text-[#888] text-xs max-w-md mx-auto leading-relaxed">
                <strong className="text-white font-agrandir-bold">{ticketsRef.current.length} billets</strong> configurés sur format <strong className="text-white">{SYSTEM_PAPER_FORMATS[selectedPaperKey]?.name}</strong>.
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
                onClick={handleDownloadPDFs}
                className="px-8 py-3.5 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-transform hover:scale-105 cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Télécharger les PDF (Recto/Verso)</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
