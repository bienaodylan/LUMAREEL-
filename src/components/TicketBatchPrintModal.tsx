import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatDateLongFrench } from '../utils/dateUtils';
import {
  SYSTEM_PAPER_FORMATS,
  createProductionLayout,
  generateProductionPDF,
  PrintTicketItem,
  DuplexFlip,
  TicketOrientationMode,
} from '../utils/pdfEngine';
import { uploadDesign, urlToDataUrl } from '../utils/designStorage';
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
  const [duplexFlip, setDuplexFlip] = useState<DuplexFlip>('long');
  const [orientationMode, setOrientationMode] = useState<TicketOrientationMode>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isReadyToPrint, setIsReadyToPrint] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<{ recto: string; verso: string } | null>(null);
  const [previewTab, setPreviewTab] = useState<'recto' | 'verso'>('recto');
  const [isPreviewing, setIsPreviewing] = useState(false);
  const ticketsRef = useRef<PrintTicketItem[]>([]);
  // Lot déjà enregistré sur le serveur : évite de créer un 2e lot si on change seulement le papier ou le sens.
  const batchCacheRef = useRef<{ key: string; tickets: Array<{ id: string; serialNumber: string; token: string }> } | null>(null);

  const selectedEvent = events.find((event) => event.id === selectedEventId) || events[0];
  const currentCategory = selectedEvent?.categories.find((category) => category.id === selectedCategoryId)
    || selectedEvent?.categories[0];
  const categoryDesignUrl = currentCategory?.ticketImageUrl
    || selectedEvent?.officialPoster
    || selectedEvent?.bannerImage
    || selectedEvent?.artistPortrait
    || '';
  const selectedPaper = SYSTEM_PAPER_FORMATS[selectedPaperKey];

  const { layout, layoutError } = useMemo(() => {
    if (!selectedPaper || quantity < 1) return { layout: null, layoutError: '' };
    try {
      return {
        layout: createProductionLayout(selectedPaper, quantity, undefined, undefined, duplexFlip, orientationMode),
        layoutError: '',
      };
    } catch (error) {
      return {
        layout: null,
        layoutError: error instanceof Error ? error.message : 'Disposition impossible pour ce format.',
      };
    }
  }, [selectedPaper, quantity, duplexFlip, orientationMode]);

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
    if (!isOpen) batchCacheRef.current = null;
  }, [selectedEventId, selectedCategoryId, selectedPaperKey, isOpen]);

  // Aperçu de la première feuille : recto puis verso (QR codes), tels qu'ils seront imprimés.
  useEffect(() => {
    if (!isReadyToPrint || !selectedPaper || !ticketsRef.current.length) {
      setPreviewUrls(null);
      return;
    }
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      setIsPreviewing(true);
      try {
        const full = createProductionLayout(
          selectedPaper,
          ticketsRef.current.length,
          undefined,
          undefined,
          duplexFlip,
          orientationMode
        );
        const firstSheet = ticketsRef.current.slice(0, full.ticketsPerPage);
        const onePage = { ...full, totalPages: 1 };
        const recto = await generateProductionPDF(firstSheet, selectedPaper, 'recto', onePage);
        const verso = await generateProductionPDF(firstSheet, selectedPaper, 'verso', onePage);
        if (cancelled) return;
        const rectoUrl = URL.createObjectURL(recto.output('blob'));
        const versoUrl = URL.createObjectURL(verso.output('blob'));
        created.push(rectoUrl, versoUrl);
        setPreviewUrls({ recto: rectoUrl, verso: versoUrl });
      } catch (error) {
        console.error('Aperçu impossible :', error);
        if (!cancelled) setPreviewUrls(null);
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    })();
    return () => {
      cancelled = true;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [isReadyToPrint, selectedPaper, duplexFlip, orientationMode]);

  if (!isOpen) return null;

  const handleUploadCategoryDesign = async (file: File) => {
    if (!selectedEvent || !currentCategory) return;
    if (!file.type.startsWith('image/')) {
      showToast('Veuillez sélectionner un fichier image.', 'error');
      return;
    }

    try {
      setIsUploadingDesign(true);
      // Envoi dans Supabase Storage : l'URL reste valable après actualisation et redéploiement.
      const fileUrl = await uploadDesign(file, `tickets/${selectedEvent.id}`);

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
      showToast(
        error instanceof Error ? error.message : "Erreur lors de l'import du visuel de ticket.",
        'error'
      );
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
      // Le PDF a besoin du visuel en Data URL : on le télécharge une seule fois pour tout le lot.
      const designData = await urlToDataUrl(categoryDesignUrl);
      setGenerationProgress(15);

      // Les billets sont créés et enregistrés sur le serveur AVANT l'impression :
      // chaque QR code contient un jeton réel, reconnu au contrôle d'entrée.
      const batchKey = `${selectedEvent.id}|${currentCategory.id}|${quantity}`;
      let registered = batchCacheRef.current?.key === batchKey ? batchCacheRef.current.tickets : null;
      if (!registered) {
        const response = await fetch('/api/tickets/print-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: selectedEvent.id,
            categoryId: currentCategory.id,
            quantity,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !Array.isArray(data.tickets)) {
          throw new Error(data?.error || 'Enregistrement des billets impossible : aucun billet n’a été créé.');
        }
        registered = data.tickets as Array<{ id: string; serialNumber: string; token: string }>;
        batchCacheRef.current = { key: batchKey, tickets: registered };
      }
      setGenerationProgress(80);

      const dateStr = formatDateLongFrench(selectedEvent.date);
      const generated: PrintTicketItem[] = registered.map((ticket) => ({
        id: ticket.id,
        serialNumber: ticket.serialNumber,
        token: ticket.token,
        categoryName: currentCategory.name,
        price: currentCategory.price,
        artist: selectedEvent.artist,
        venue: selectedEvent.venue,
        dateStr,
        ticketDesignUrl: designData,
      }));
      setGenerationProgress(100);

      ticketsRef.current = generated;
      setIsReadyToPrint(true);
      showToast(`Lot de ${quantity.toLocaleString()} billets préparé.`, 'success');
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : 'Une erreur est survenue pendant la préparation du lot.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Un seul PDF : recto, verso, recto, verso... pour imprimer les deux faces en une fois.
  const handleDownloadDuplexPDF = async () => {
    if (!selectedPaper || !selectedEvent || !ticketsRef.current.length) return;

    setIsDownloading(true);
    try {
      const sharedLayout = createProductionLayout(
        selectedPaper,
        ticketsRef.current.length,
        undefined,
        undefined,
        duplexFlip,
        orientationMode
      );
      showToast('Génération du PDF recto-verso...', 'success');
      const duplexPdf = await generateProductionPDF(ticketsRef.current, selectedPaper, 'duplex', sharedLayout);
      duplexPdf.save(`LUMAREEL_RECTO-VERSO_${selectedEvent.artist}_${selectedPaperKey}.pdf`);
      showToast(
        `PDF recto-verso prêt : ${sharedLayout.totalPages} feuille(s), ${sharedLayout.totalPages * 2} pages. Imprimez en recto-verso, retournement sur le bord ${duplexFlip === 'long' ? 'long' : 'court'}.`,
        'success'
      );
    } catch (error) {
      console.error('Erreur de production PDF recto-verso :', error);
      showToast(error instanceof Error ? error.message : 'Erreur pendant la génération du PDF.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPDFs = async () => {
    if (!selectedPaper || !selectedEvent || !ticketsRef.current.length) return;

    setIsDownloading(true);
    try {
      // Un seul plan partagé : mêmes coordonnées et même orientation sur les deux faces.
      const sharedLayout = createProductionLayout(
        selectedPaper,
        ticketsRef.current.length,
        undefined,
        undefined,
        duplexFlip,
        orientationMode
      );
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

            <div>
              <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">5. Retournement de la feuille (recto-verso)</label>
              <select value={duplexFlip} onChange={(event) => setDuplexFlip(event.target.value as DuplexFlip)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]">
                <option value="long">Retournement sur le bord long (réglage standard)</option>
                <option value="short">Retournement sur le bord court</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1.5">Le verso est généré en miroir selon ce choix, pour tomber exactement derrière chaque recto. Il doit correspondre au mode recto-verso de l'imprimante.</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-agrandir-bold text-[#888] mb-1.5">6. Sens des billets sur la feuille</label>
              <select value={orientationMode} onChange={(event) => setOrientationMode(event.target.value as TicketOrientationMode)} className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4af37]">
                <option value="auto">Automatique (le plus de billets par feuille)</option>
                <option value="horizontal">Horizontal (billets à plat)</option>
                <option value="vertical">Vertical (tous les billets tournés à 90°)</option>
              </select>
              <p className="text-[10px] text-neutral-500 mt-1.5">Tous les billets d'une feuille ont le même sens, alignés en colonnes et en rangées régulières.</p>
            </div>

            {layoutError && (
              <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-[11px] text-red-300">
                {layoutError} Choisissez un format plus grand.
              </div>
            )}

            {layout && (
              <div className="p-4 rounded-2xl border border-[#d4af37]/25 bg-[#d4af37]/[0.06] space-y-2">
                <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-agrandir-bold uppercase tracking-wider"><FileText className="w-4 h-4" /> Estimation de production</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.ticketsPerPage}</div><div className="text-[9px] text-neutral-400 uppercase">Billets / feuille</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.totalPages}</div><div className="text-[9px] text-neutral-400 uppercase">Feuilles nécessaires</div></div>
                  <div><div className="text-xl font-agrandir-extrabold text-white">{layout.fillPercent} %</div><div className="text-[9px] text-neutral-400 uppercase">Surface utilisée</div></div>
                  <div><div className="flex items-center gap-1 text-xl font-agrandir-extrabold text-white">{layout.rotatedPerPage > 0 ? <><RotateCw className="w-4 h-4" /> {layout.rotatedPerPage}</> : '0'}</div><div className="text-[9px] text-neutral-400 uppercase">Billets pivotés à 90°</div></div>
                </div>
                <p className="text-[10px] text-neutral-300">
                  Feuille {layout.pageOrientation === 'landscape' ? 'paysage' : 'portrait'} · {layout.summary}.
                </p>
                <p className="text-[10px] text-neutral-400">Calcul avec marge de sécurité de {layout.marginMm} mm et espacement de {layout.gapMm} mm. Le résultat réel dépend des marges non imprimables de l'imprimante.</p>
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
              <p className="text-[10px] text-neutral-500 mt-2">Le PDF recto-verso alterne les pages (recto, verso, recto, verso…) : imprimez-le en recto-verso, avec le retournement choisi, pour que chaque QR code tombe derrière son billet.</p>
            </div>

            <div className="w-full space-y-3">
              <div className="flex items-center justify-center gap-2">
                {(['recto', 'verso'] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setPreviewTab(tab)} className={`px-5 py-2 rounded-xl text-xs font-agrandir-bold uppercase border transition-colors ${previewTab === tab ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-white/5 text-neutral-300 border-white/15 hover:bg-white/10'}`}>
                    {tab === 'recto' ? 'Recto' : 'Verso (QR codes)'}
                  </button>
                ))}
              </div>
              <div className="relative w-full h-[460px] rounded-2xl overflow-hidden border border-white/15 bg-neutral-900">
                {isPreviewing || !previewUrls ? (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-neutral-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Préparation de l'aperçu...
                  </div>
                ) : (
                  <iframe key={previewTab} title={`Aperçu ${previewTab}`} src={`${previewUrls[previewTab]}#view=Fit&toolbar=0`} className="w-full h-full bg-white" />
                )}
              </div>
              <p className="text-[10px] text-neutral-500">
                Feuille 1 sur {layout?.totalPages}. Le verso est montré tel qu'il sera imprimé : en miroir du recto, selon le retournement choisi, pour que chaque QR code tombe derrière le bon billet.
                {previewUrls && <> <a href={previewUrls[previewTab]} target="_blank" rel="noreferrer" className="text-[#d4af37] underline">Ouvrir dans un nouvel onglet</a></>}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
              <button type="button" onClick={() => setIsReadyToPrint(false)} disabled={isDownloading} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-agrandir-bold uppercase">Modifier</button>
              <button type="button" onClick={() => void handleDownloadPDFs()} disabled={isDownloading} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-agrandir-bold uppercase disabled:opacity-60">Recto et verso séparés</button>
              <button type="button" onClick={() => void handleDownloadDuplexPDF()} disabled={isDownloading} className="px-8 py-3.5 rounded-2xl bg-[#d4af37] hover:bg-[#e6c158] text-black font-agrandir-extrabold text-sm uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.25)] disabled:opacity-60">
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>{isDownloading ? 'Génération...' : 'Télécharger le PDF recto-verso'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
