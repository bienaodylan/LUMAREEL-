import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent, TicketCategory } from '../types';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Upload,
  Check,
  Layers,
  Sparkles,
  Scissors
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

  // Sync event when initialEventId changes or modal opens
  useEffect(() => {
    if (initialEventId && events.some((e) => e.id === initialEventId)) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId, isOpen]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    selectedEvent?.categories[0]?.id || ''
  );

  // Sync selectedCategoryId when selectedEvent changes
  useEffect(() => {
    if (selectedEvent && selectedEvent.categories.length > 0) {
      if (!selectedEvent.categories.some((c) => c.id === selectedCategoryId)) {
        setSelectedCategoryId(selectedEvent.categories[0].id);
      }
    }
  }, [selectedEventId, selectedEvent]);

  const [quantity, setQuantity] = useState<number>(10);
  const [printOrderMode, setPrintOrderMode] = useState<'paired' | 'batched'>('paired');
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

  // Handle uploading specific category design right from print modal
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
        showToast(`Préparation de ${quantity} billets A5 terminée.`, 'success');
      }
    };

    generateChunk();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular print:static print:bg-white print:p-0 print:block">
      
      {/* UI Modal Box - Hidden during native print dialog */}
      <div className="relative w-full max-w-3xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-8 text-white shadow-2xl my-6 print:hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">
                RÉGIE IMPRESSION PHYSIQUE HAUTE SÉCURITÉ
              </div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl uppercase tracking-tight text-white">
                Générateur de Billets Officiels
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
            
            {/* 1. Event Selection (Locked automatically when opened from workspace) */}
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
                      ÉVÉNEMENT VERROUILLÉ AUTOMATIQUEMENT
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
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                  }}
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

            {/* 2. Category Selector */}
            {selectedEvent && (
              <div className="space-y-2">
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888]">
                  2. Catégorie de Place &amp; Design Associé
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

            {/* 3. Ticket Design Preview & Upload for Selected Category */}
            {currentCategory && (
              <div className="p-4 bg-[#141414] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider">
                    VISUEL RECTO CATÉGORIE : {currentCategory.name}
                  </div>
                  <label className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors">
                    <Upload className="w-3 h-3 text-[#d4af37]" />
                    <span>{isUploadingDesign ? 'Import...' : 'Changer le design'}</span>
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white">
                      1536 × 548 px
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400 leading-relaxed">
                    Format standard : <strong className="text-white font-mono">1536 × 548 px</strong>.<br />
                    Ce visuel est imprimé sur le <strong className="text-white">Recto</strong> de la page A5 avec les découpes massicot. Le <strong className="text-white">Verso</strong> génère le code QR unitaire et les mentions de contrôle vigile.
                  </div>
                </div>
              </div>
            )}

            {/* 4. Format & Print Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  3. Quantité de billets
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-base font-agrandir-bold text-white outline-none focus:border-[#d4af37]"
                    required
                    disabled={isGenerating}
                  />
                  <div className="flex gap-1.5">
                    {[10, 50, 100, 500, 1000].map((q) => (
                      <button
                        key={q}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setQuantity(q)}
                        className={`flex-1 py-1.5 rounded-xl border text-[10px] font-agrandir-bold transition-colors ${
                          quantity === q
                            ? 'bg-white text-black border-white'
                            : 'bg-white/5 border-white/10 text-neutral-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">
                  4. Mode de mise en page A5
                </label>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintOrderMode('paired')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      printOrderMode === 'paired'
                        ? 'bg-white/10 border-white text-white font-agrandir-bold'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>Recto / Verso Alterné (Imprimante recto-verso)</span>
                    {printOrderMode === 'paired' && <Check className="w-3.5 h-3.5 text-[#d4af37]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPrintOrderMode('batched')}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      printOrderMode === 'batched'
                        ? 'bg-white/10 border-white text-white font-agrandir-bold'
                        : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>Tous les Rectos puis tous les Versos</span>
                    {printOrderMode === 'batched' && <Check className="w-3.5 h-3.5 text-[#d4af37]" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Generation Button */}
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
                    Génération des planches sécurisées... {generationProgress}%
                  </span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>
                    Préparer {quantity.toLocaleString()} billets A5 ({currentCategory?.name})
                  </span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Ready to Print View */
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">
                Planches A5 Prêtes
              </h3>
              <p className="text-[#888] text-xs max-w-md mx-auto leading-relaxed">
                <strong className="text-white font-agrandir-bold">{ticketsRef.current.length} billets</strong> de catégorie <strong className="text-[#d4af37] font-agrandir-bold">{currentCategory?.name}</strong> prêts pour l'impression A5 paysage avec découpes massicot.
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
                <span>Lancer l'impression A5</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          NATIVE PRINT LAYOUT (VISIBLE UNIQUEMENT LORS DU PRINT NAVIGATEUR)
          Format calibré : Page A5 Paysage (210mm × 148mm)
          Chaque face de billet prend exactement 1 page A5, zéro débordement.
         ========================================================================= */}
      {isReadyToPrint && (
        <div className="hidden print:block print:w-full print:bg-white print:text-black">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @media print {
                  @page {
                    size: A5 landscape;
                    margin: 0;
                  }
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-page-ticket {
                    width: 210mm !important;
                    height: 148mm !important;
                    max-height: 148mm !important;
                    overflow: hidden !important;
                    page-break-after: always !important;
                    break-after: page !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    box-sizing: border-box !important;
                    position: relative !important;
                    padding: 6mm !important;
                  }
                }
              `,
            }}
          />

          {/* RENDERING PAGES BASED ON SELECTED MODE */}
          {printOrderMode === 'paired' ? (
            /* Mode Alterné : Recto 1, Verso 1, Recto 2, Verso 2 ... */
            ticketsRef.current.map((t, idx) => (
              <React.Fragment key={`ticket-pair-${t.id}`}>
                {/* 1. FACE RECTO SUR PAGE A5 */}
                <div className="print-page-ticket bg-white">
                  <div className="w-[198mm] h-[136mm] border border-black/30 relative flex flex-col items-center justify-center p-3 box-sizing-border">
                    {/* Repères de découpe massicot aux 4 coins */}
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-black font-bold">┌ ✂</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┐</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-black font-bold">└ ✂</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┘</div>

                    {/* En-tête de régie officielle */}
                    <div className="w-full flex items-center justify-between text-[7px] font-mono uppercase text-black/70 mb-1 px-4">
                      <span>LUMARÉEL CO. · BILLETTERIE OFFICIELLE CERTIFIÉE</span>
                      <span>PAGE A5 · FACE RECTO (BILLET {idx + 1}/{ticketsRef.current.length})</span>
                    </div>

                    {/* Ligne de découpe supérieure avec ciseaux */}
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-b border-dashed border-black/60 pb-1 mb-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>

                    {/* Billet Recto 153.6mm × 54.8mm */}
                    <div className="w-[153.6mm] h-[54.8mm] border-2 border-black bg-black relative overflow-hidden shrink-0 shadow-none">
                      <img
                        src={t.ticketDesignUrl}
                        alt={t.categoryName}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Ligne de découpe inférieure */}
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-t border-dashed border-black/60 pt-1 mt-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>

                    {/* Pied de page et talon */}
                    <div className="w-full flex items-center justify-between text-[7px] font-mono text-black/70 mt-1 px-4">
                      <span>N° SÉRIE : <strong>{t.serialNumber}</strong></span>
                      <span>CATÉGORIE : <strong>{t.categoryName}</strong></span>
                      <span>TARIF : <strong>{t.price.toLocaleString()} FCFA</strong></span>
                    </div>
                  </div>
                </div>

                {/* 2. FACE VERSO SUR PAGE A5 SUIVANTE */}
                <div className="print-page-ticket bg-white">
                  <div className="w-[198mm] h-[136mm] border border-black/30 relative flex flex-col items-center justify-center p-3 box-sizing-border">
                    {/* Repères de découpe massicot */}
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-black font-bold">┌ ✂</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┐</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-black font-bold">└ ✂</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┘</div>

                    {/* En-tête de régie */}
                    <div className="w-full flex items-center justify-between text-[7px] font-mono uppercase text-black/70 mb-1 px-4">
                      <span>LUMARÉEL CO. · PROTOCOLE DE SÉCURITÉ CONTRÔLE VIGILE</span>
                      <span>PAGE A5 · FACE VERSO (BILLET {idx + 1}/{ticketsRef.current.length})</span>
                    </div>

                    {/* Ligne de découpe supérieure */}
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-b border-dashed border-black/60 pb-1 mb-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>

                    {/* Billet Verso 153.6mm × 54.8mm */}
                    <div className="w-[153.6mm] h-[54.8mm] border-2 border-black p-3.5 flex items-center justify-between text-left bg-white text-black relative shrink-0">
                      {/* Informations du concert avec date et lieu obligatoirement en gras */}
                      <div className="flex-1 pr-3 flex flex-col justify-between h-full">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-black">
                            {t.event.artist} EN CONCERT
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black mt-0.5">
                            CATÉGORIE : {t.categoryName} · {t.price.toLocaleString()} FCFA
                          </div>
                          <div className="text-[8.5px] text-black mt-1">
                            <strong className="font-black text-black">{t.event.venue}</strong> · <strong className="font-black text-black">{formatDateLongFrench(t.event.date)}</strong>
                          </div>
                        </div>

                        <div className="border-t border-black/40 pt-1.5 mt-1">
                          <div className="text-[7px] leading-tight text-neutral-800 font-sans">
                            • Billet individuel strict. L'entrée aux portes invalide le jeton.<br />
                            • Toute tentative de reproduction est passible de poursuites pénales.<br />
                            • Contrôle d'accès et régie : LUMARÉEL CO.
                          </div>
                          <div className="text-[7.5px] font-mono font-bold mt-1 text-black">
                            N° {t.serialNumber} · {t.token.slice(0, 20)}...
                          </div>
                        </div>
                      </div>

                      {/* Bloc QR Code unitaire */}
                      <div className="p-1 border border-black shrink-0 flex flex-col items-center justify-center bg-white">
                        <img src={t.qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                        <span className="text-[7px] font-mono font-bold mt-0.5">SCAN PORTILLON</span>
                      </div>
                    </div>

                    {/* Ligne de découpe inférieure */}
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-t border-dashed border-black/60 pt-1 mt-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>

                    {/* Talon bas */}
                    <div className="w-full flex items-center justify-between text-[7px] font-mono text-black/70 mt-1 px-4">
                      <span>JETON CRYPTÉ : <strong>{t.token.slice(0, 16)}</strong></span>
                      <span>SCELLÉ OFFICIEL LUMARÉEL CO.</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))
          ) : (
            /* Mode groupé : Tous les Rectos, puis tous les Versos */
            <>
              {ticketsRef.current.map((t, idx) => (
                <div key={`recto-only-${t.id}`} className="print-page-ticket bg-white">
                  <div className="w-[198mm] h-[136mm] border border-black/30 relative flex flex-col items-center justify-center p-3 box-sizing-border">
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-black font-bold">┌ ✂</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┐</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-black font-bold">└ ✂</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┘</div>
                    <div className="w-full flex items-center justify-between text-[7px] font-mono uppercase text-black/70 mb-1 px-4">
                      <span>LUMARÉEL CO. · BILLETTERIE OFFICIELLE</span>
                      <span>PAGE A5 · FACE RECTO ({idx + 1}/{ticketsRef.current.length})</span>
                    </div>
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-b border-dashed border-black/60 pb-1 mb-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>
                    <div className="w-[153.6mm] h-[54.8mm] border-2 border-black bg-black relative overflow-hidden shrink-0 shadow-none">
                      <img src={t.ticketDesignUrl} alt={t.categoryName} className="w-full h-full object-cover" />
                    </div>
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-t border-dashed border-black/60 pt-1 mt-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>
                    <div className="w-full flex items-center justify-between text-[7px] font-mono text-black/70 mt-1 px-4">
                      <span>N° {t.serialNumber}</span>
                      <span>CATÉGORIE : {t.categoryName}</span>
                      <span>{t.price.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                </div>
              ))}

              {ticketsRef.current.map((t, idx) => (
                <div key={`verso-only-${t.id}`} className="print-page-ticket bg-white">
                  <div className="w-[198mm] h-[136mm] border border-black/30 relative flex flex-col items-center justify-center p-3 box-sizing-border">
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-black font-bold">┌ ✂</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┐</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-black font-bold">└ ✂</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono text-black font-bold">✂ ┘</div>
                    <div className="w-full flex items-center justify-between text-[7px] font-mono uppercase text-black/70 mb-1 px-4">
                      <span>LUMARÉEL CO. · PROTOCOLE DE CONTRÔLE VIGILE</span>
                      <span>PAGE A5 · FACE VERSO ({idx + 1}/{ticketsRef.current.length})</span>
                    </div>
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-b border-dashed border-black/60 pb-1 mb-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>
                    <div className="w-[153.6mm] h-[54.8mm] border-2 border-black p-3.5 flex items-center justify-between text-left bg-white text-black relative shrink-0">
                      <div className="flex-1 pr-3 flex flex-col justify-between h-full">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wider text-black">
                            {t.event.artist} EN CONCERT
                          </div>
                          <div className="text-[9px] font-bold uppercase tracking-wider text-black mt-0.5">
                            CATÉGORIE : {t.categoryName} · {t.price.toLocaleString()} FCFA
                          </div>
                          <div className="text-[8.5px] text-black mt-1">
                            <strong className="font-black text-black">{t.event.venue}</strong> · <strong className="font-black text-black">{formatDateLongFrench(t.event.date)}</strong>
                          </div>
                        </div>
                        <div className="border-t border-black/40 pt-1.5 mt-1">
                          <div className="text-[7px] leading-tight text-neutral-800 font-sans">
                            • Billet individuel strict. L'entrée aux portes invalide le jeton.<br />
                            • Toute tentative de reproduction est passible de poursuites pénales.<br />
                            • Contrôle d'accès et régie : LUMARÉEL CO.
                          </div>
                          <div className="text-[7.5px] font-mono font-bold mt-1 text-black">
                            N° {t.serialNumber} · {t.token.slice(0, 20)}...
                          </div>
                        </div>
                      </div>
                      <div className="p-1 border border-black shrink-0 flex flex-col items-center justify-center bg-white">
                        <img src={t.qrDataUrl} alt="QR Code" className="w-24 h-24 object-contain" />
                        <span className="text-[7px] font-mono font-bold mt-0.5">SCAN PORTILLON</span>
                      </div>
                    </div>
                    <div className="w-full text-center text-[7.5px] font-mono text-black/60 border-t border-dashed border-black/60 pt-1 mt-2 tracking-widest">
                      - - - - - - - - - - ✂ LIGNE DE DÉCOUPE OFFICIELLE (153.6 × 54.8 MM) ✂ - - - - - - - - - -
                    </div>
                    <div className="w-full flex items-center justify-between text-[7px] font-mono text-black/70 mt-1 px-4">
                      <span>JETON CRYPTÉ : {t.token.slice(0, 16)}</span>
                      <span>SCELLÉ OFFICIEL LUMARÉEL CO.</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};