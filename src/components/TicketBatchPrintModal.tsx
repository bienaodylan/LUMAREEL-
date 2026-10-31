import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateLongFrench } from '../utils/dateUtils';
import {
  SYSTEM_PAPER_FORMATS,
  createProductionLayout,
  generateProductionPDF,
  PrintTicketItem,
} from '../utils/pdfEngine';
import {
  Printer,
  X,
  CheckCircle2,
  Loader2,
  Upload,
  Download,
  FileText,
  RotateCw,
} from 'lucide-react';

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
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || events[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [selectedPaperKey, setSelectedPaperKey] = useState('A3');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);
  const ticketsRef = useRef<PrintTicketItem[]>([]);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0];
  const currentCategory = selectedEvent?.categories.find((category) => category.id === selectedCategoryId)
    || selectedEvent?.categories[0];
  const categoryDesignUrl = currentCategory?.ticketImageUrl
    || selectedEvent?.officialPoster
    || selectedEvent?.bannerImage
    || selectedEvent?.artistPortrait
    || '';
  const selectedPaper = SYSTEM_PAPER_FORMATS[selectedPaperKey];

  const layout = useMemo(() => {
    if (!selectedPaper || quantity < 1) return null;
    try {
      return createProductionLayout(selectedPaper, quantity);
    } catch {
      return null;
    }
  }, [selectedPaper, quantity]);

  useEffect(() => {
    if (initialEventId && events.some((event) => event.id === initialEventId)) {
      setSelectedEventId(initialEventId);
    }
  }, [initialEventId, isOpen, events]);

  useEffect(() => {
    if (selectedEvent?.categories.length) {
      if (!selectedEvent.categories.some((category) => category.id === selectedCategoryId)) {
        setSelectedCategoryId(selectedEvent.categories[0].id);
      }
    } else {
      setSelectedCategoryId('');
    }
  }, [selectedEventId, selectedEvent, selectedCategoryId]);

  useEffect(() => {
    setIsReadyToPrint(false);
    ticketsRef.current = [];
    setGenerationProgress(0);
  }, [selectedEventId, selectedCategoryId, selectedPaperKey, isOpen]);

  if (!isOpen) return null;

  const handleUploadCategoryDesign = async (file: File) => {
    if (!selectedEvent || !currentCategory) return;
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image.', 'error');
      return;
    }

    try {
      setIsUploadingDesign(true);
      let fileUrl = '';
      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const response = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.url) fileUrl = data.url;
        }
      } catch (error) {
        console.warn('Upload distant indisponible, utilisation du Data URL.', error);
      }

      if (!fileUrl) {
        fileUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
          reader.readAsDataURL(file);
        });
      }

      const updatedEvent = {
        ...selectedEvent,
        categories: selectedEvent.categories.map((category) =>
          category.id === currentCategory.id
            ? { ...category, ticketImageUrl: fileUrl }
            : category
        ),
      };
      await saveEvent(updatedEvent);
      showToast(`Design de la catégorie ${currentCategory.name} mis à jour !`, 'success');
    } catch (error) {
      console.error(error);
      showToast("Erreur lors de l'import du visuel de ticket.", 'error');
    } finally {
      setIsUploadingDesign(false);
    }
  };

  const handleGenerateBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEvent || !currentCategory || quantity <= 0 || !categoryDesignUrl) {
      showToast('Configuration d’impression incomplète ou visuel manquant.', 'error');
      return;
    }
    if (!Number.isInteger(quantity) || quantity > 10000) {
      showToast('La quantité doit être comprise entre 1 et 10 000 billets.', 'error');
      return;
    }

    setIsGenerating(true);
    setIsReadyToPrint(false);
    ticketsRef.current = [];
    setGenerationProgress(0);

    try {
      const generated: PrintTicketItem[] = [];
      const artistCode = selectedEvent.artist.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'LMR';
      for (let index = 1; index <= quantity; index++) {
        const now = Date.now();
        const serialNumber = `LMR-${new Date().getFullYear()}-${artistCode}-${String(index).padStart(5, '0')}`;
        const token = `TKT_SEC_${Math.random().toString(36).slice(2, 12).toUpperCase()}_${now.toString(36).toUpperCase()}`;
        generated.push({
          id: `tkt_phys_${now}_${index}`,
          serialNumber,
          token,
          categoryName: currentCategory.name,
          price: currentCategory.price,
          artist: selectedEvent.artist,
          venue: selectedEvent.venue,
          dateStr: formatDateLongFrench(selectedEvent.date),
          ticketDesignUrl: categoryDesignUrl,
        });
        if (index % 50 === 0 || index === quantity) {
          setGenerationProgress(Math.round((index / quantity) * 100));
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }

      ticketsRef.current = generated;
      setIsReadyToPrint(true);
      showToast(`Lot de ${quantity.toLocaleString()} billets préparé.`, 'success');
    } catch (error) {
      console.error(error);
      showToast('Une erreur est survenue pendant la préparation du lot.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDFs = async () => {
    if (!selectedPaper || !selectedEvent || !ticketsRef.current.length) return;

    setIsDownloading(true);
    try {
      // Un seul plan partagé : mêmes coordonnées et même orientation sur les deux faces.
      const sharedLayout = createProductionLayout(selectedPaper, ticketsRef.current.length);
      showToast('Génération du PDF RECTO...', 'success');
      const rectoPdf = await generateProductionPDF(ticketsRef.current, selectedPaper, 'recto', sharedLayout);
      rectoPdf.save(`LUMAREEL_RECTO_${selectedEvent.artist}_${selectedPaperKey}.pdf`);

      // Laisse au navigateur le temps de déclencher le premier téléchargement.
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      showToast('Génération du PDF VERSO...', 'success');
      const versoPdf = await generateProductionPDF(ticketsRef.current, selectedPaper, 'verso', sharedLayout);
      versoPdf.save(`LUMAREEL_VERSO_${selectedEvent.artist}_${selectedPaperKey}.pdf`);
      showToast(`Les PDF recto et verso sont prêts : ${sharedLayout.totalPages} feuille(s), ${sharedLayout.ticketsPerPage} billet(s) maximum par feuille.`, 'success');
    } catch (error) {
      console.error('Erreur de production PDF :', error);
      showToast(error instanceof Error ? error.message : 'Erreur pendant la génération des PDF.', 'error');
    } finally {
      setIsDownloading(false);
    }
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
              <div className="text-[10px] text-[#d4af37] tracking-[0.25em] uppercase font-agrandir-bold">MOTEUR DE PRODUCTION LUMARÉEL</div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl uppercase tracking-tight">Générateur de billets physiques</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-neutral-400 hover:text-white transition-colors" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isReadyToPrint ? (
          <form onSubmit={handleGenerateBatch} className="space-y-6">
            {initialEventId && selectedEvent ? (
              <div className="p-4 bg-[#141414] border border-[#d4af37]/30 rounded-2xl flex items-center gap-3.5">
                <img src={selectedEvent.officialPoster || selectedEvent.artistPortrait} alt={selectedEvent.artist} className="w-14 h-14 rounded-xl object-cover border border-white/15 shrink-0" />
                <div>
                  <div className="text-[9px] text-[#d4af37] font-agrandir-bold tracking-[0.2em] uppercase">Événement sélectionné</div>
                  <div className="text-white font-agrandir-extrabold text-base uppercase">{selectedEvent.artist} EN CONCERT</div>
                  <div className="text-xs text-neutral-300 mt-0.5">{selectedEvent.venue} · {formatDateLongFrench(selectedEvent.date)}</div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">1. Événement</label>
                <select value={selectedEventId} onChange={(event) => setSelectedEventId(event.target.value)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-3 text-xs text-white outline-none focus:border-[#d4af37]" required disabled={isGenerating}>
                  {events.map((event) => <option key={event.id} value={event.id}>{event.artist} EN CONCERT — {event.venue} ({formatDateLongFrench(event.date)})</option>)}
                </select>
              </div>
            )}

            {selectedEvent && (
              <div className="space-y-2">
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888]">2. Catégorie et design du billet</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedEvent.categories.map((category) => {
                    const active = selectedCategoryId === category.id;
                    return (
                      <button type="button" key={category.id} onClick={() => setSelectedCategoryId(category.id)} className={`p-4 rounded-2xl border text-left transition-all ${active ? 'bg-[#181818] border-[#d4af37] ring-1 ring-[#d4af37]/40' : 'bg-[#111] border-white/10 hover:border-white/30'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-agrandir-extrabold text-sm text-white uppercase">{category.name}</span>
                          <span className="text-xs font-agrandir-bold text-[#d4af37]">{category.price.toLocaleString('fr-FR')} {category.currency || 'FCFA'}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{category.quota.toLocaleString('fr-FR')} places prévues</span>
                          <span className={category.ticketImageUrl ? 'text-emerald-400' : 'text-neutral-400'}>{category.ticketImageUrl ? 'Design spécifique' : 'Visuel par défaut'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentCategory && (
              <div className="p-4 bg-[#141414] border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider">Visuel recto : {currentCategory.name}</div>
                  <label className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[10px] font-agrandir-semibold uppercase flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3 h-3 text-[#d4af37]" />
                    <span>{isUploadingDesign ? 'Import...' : 'Changer le visuel'}</span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={isUploadingDesign || isGenerating} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUploadCategoryDesign(file); event.currentTarget.value = ''; }} className="hidden" />
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-60 aspect-[1536/548] overflow-hidden rounded-xl bg-black border border-white/20 shrink-0">
                    {categoryDesignUrl ? <img src={categoryDesignUrl} alt={currentCategory.name} className="w-full h-full object-contain" /> : <div className="h-full flex items-center justify-center text-xs text-neutral-500">Aucun visuel</div>}
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">Format physique fixe : 153,6 × 54,8 mm. Le visuel est ajusté sans déformation. Le verso comporte le QR code et les informations de contrôle.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">3. Format du papier</label>
                <select value={selectedPaperKey} onChange={(event) => setSelectedPaperKey(event.target.value)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]">
                  {Object.entries(SYSTEM_PAPER_FORMATS).map(([key, paper]) => <option key={key} value={key}>{paper.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">4. Quantité de billets</label>
                <input type="number" min="1" max="10000" step="1" value={quantity} onChange={(event) => setQuantity(Math.min(10000, Math.max(1, Number.parseInt(event.target.value, 10) || 1)))} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]" required disabled={isGenerating} />
              </div>
            </div>

            {layout && (
              <div className="p-4 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] space-y-2">
                <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-agrandir-bold uppercase tracking-wider"><FileText className="w-4 h-4" /> Estimation de production</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.ticketsPerPage}</div><div className="text-[9px] text-neutral-400 uppercase">Billets / feuille</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.totalPages}</div><div className="text-[9px] text-neutral-400 uppercase">Feuilles nécessaires</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.columns} × {layout.rows}</div><div className="text-[9px] text-neutral-400 uppercase">Colonnes × rangées</div></div>
                  <div><div className="flex items-center gap-1 text-xl font-agrandir-extrabold text-white">{layout.rotated ? <><RotateCw className="w-4 h-4" /> 90°</> : '0°'}</div><div className="text-[9px] text-neutral-400 uppercase">Orientation du billet</div></div>
                </div>
                <p className="text-[10px] text-neutral-400">Calcul avec marge de sécurité de 5 mm et espacement de 2 mm. Le résultat réel dépend des marges non imprimables de l'imprimante.</p>
              </div>
            )}

            <button type="submit" disabled={isGenerating || isUploadingDesign || !categoryDesignUrl || !layout} className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden">
              {isGenerating ? <><div className="absolute inset-y-0 left-0 bg-[#d4af37]/25" style={{ width: `${generationProgress}%`, transition: 'width 0.2s' }} /><Loader2 className="w-4 h-4 animate-spin relative z-10" /><span className="relative z-10">Préparation du lot... {generationProgress}%</span></> : <><Printer className="w-4 h-4" /><span>Préparer {quantity.toLocaleString('fr-FR')} billets</span></>}
            </button>
          </form>
        ) : (
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30"><CheckCircle2 className="w-8 h-8 text-emerald-400" /></div>
            <div>
              <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mb-2">Lot prêt pour la production</h3>
              <p className="text-[#888] text-xs max-w-md mx-auto leading-relaxed"><strong className="text-white">{ticketsRef.current.length.toLocaleString('fr-FR')} billets</strong> · papier <strong className="text-white">{selectedPaper?.name}</strong> · <strong className="text-white">{layout?.ticketsPerPage}</strong> billets par feuille · <strong className="text-white">{layout?.totalPages}</strong> feuille(s).</p>
              <p className="text-[10px] text-neutral-500 mt-2">Deux fichiers distincts seront générés : RECTO et VERSO. Ils partageront exactement le même plan de placement.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <button type="button" onClick={() => setIsReadyToPrint(false)} disabled={isDownloading} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-agrandir-bold uppercase">Modifier</button>
              <button type="button" onClick={() => void handleDownloadPDFs()} disabled={isDownloading} className="px-8 py-3.5 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-sm uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.25)] disabled:opacity-60">
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{isDownloading ? 'Génération...' : 'Télécharger les PDF recto / verso'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
