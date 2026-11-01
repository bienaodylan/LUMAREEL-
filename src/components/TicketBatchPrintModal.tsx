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
import { Printer, X, Loader2, Upload } from 'lucide-react';

// Clé d'administration transmise depuis les variables d'environnement
const BACKEND_ADMIN_KEY = import.meta.env.VITE_ADMIN_API_KEY || '';

/** Erreur définitive : inutile de réessayer automatiquement. */
class FatalError extends Error {}

const makeRequestId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const FATAL_CODES = ['TABLES_MISSING', 'KEY_REJECTED', 'SERVER_NOT_CONFIGURED', 'UNAUTHORIZED'];

/**
 * Enregistre le lot sur le serveur avec la clé d'administration backend.
 */
async function postPrintBatch(payload: Record<string, unknown>) {
  const attempts = 3;
  let lastMessage = 'Serveur injoignable.';

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 90000);
    try {
      const response = await fetch('/api/tickets/print-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': BACKEND_ADMIN_KEY,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json().catch(() => null) : null;

      if (response.ok && data?.success && Array.isArray(data.tickets)) return data;

      if (!data) {
        throw new FatalError(
          'Les fonctions serveur (/api) ne sont pas installées sur ce site. Ajoutez le dossier api/ au dépôt GitHub, puis redéployez sur Vercel.'
        );
      }
      if (response.status === 401) {
        throw new FatalError('Clé d’administration refusée.');
      }
      if ((response.status >= 400 && response.status < 500) || FATAL_CODES.includes(data.code)) {
        throw new FatalError(data.error || `Demande refusée par le serveur (code ${response.status}).`);
      }
      lastMessage = data.error || `Erreur du serveur (code ${response.status}).`;
    } catch (error) {
      if (error instanceof FatalError) throw error;
      lastMessage =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Le serveur met trop de temps à répondre.'
          : 'Le serveur est injoignable (vérifiez la connexion internet).';
    } finally {
      window.clearTimeout(timer);
    }
    if (attempt < attempts) await new Promise((resolve) => window.setTimeout(resolve, 1500 * attempt));
  }
  throw new Error(`Le lot n’a pas pu être confirmé : ${lastMessage}`);
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
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || events[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [selectedPaperKey, setSelectedPaperKey] = useState('A3');
  const [duplexFlip, setDuplexFlip] = useState<DuplexFlip>('long');
  const [orientationMode, setOrientationMode] = useState<TicketOrientationMode>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Identifiant de la demande en cours : réutilisé pour éviter les doublons
  const pendingRequestRef = useRef<{ key: string; id: string } | null>(null);
  const batchCacheRef = useRef<{ key: string; tickets: Array<{ id: string; serialNumber: string; token: string }> } | null>(null);

  // Fermeture rapide avec la touche Échap
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    setGenerationProgress(0);
    if (!isOpen) {
      batchCacheRef.current = null;
      pendingRequestRef.current = null;
    }
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
    setGenerationProgress(0);

    try {
      // 1. Préparation du visuel
      const designData = await urlToDataUrl(categoryDesignUrl);
      setGenerationProgress(25);

      // 2. Création et enregistrement du lot sur le serveur
      const batchKey = `${selectedEvent.id}|${currentCategory.id}|${quantity}`;
      let registered = batchCacheRef.current?.key === batchKey ? batchCacheRef.current.tickets : null;
      if (!registered) {
        if (pendingRequestRef.current?.key !== batchKey) {
          pendingRequestRef.current = { key: batchKey, id: makeRequestId() };
        }
        const data = await postPrintBatch({
          requestId: pendingRequestRef.current.id,
          eventId: selectedEvent.id,
          eventTitle: selectedEvent.title,
          artist: selectedEvent.artist,
          eventDate: selectedEvent.date,
          eventTime: selectedEvent.time,
          eventVenue: selectedEvent.venue,
          categoryId: currentCategory.id,
          categoryName: currentCategory.name,
          quantity,
        });
        registered = data.tickets as Array<{ id: string; serialNumber: string; token: string }>;
        batchCacheRef.current = { key: batchKey, tickets: registered };
        pendingRequestRef.current = null;
      }
      setGenerationProgress(70);

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
      setGenerationProgress(90);

      // 3. Génération du PDF et ouverture DIRECTE dans Google Chrome
      const fullLayout = createProductionLayout(
        selectedPaper,
        generated.length,
        undefined,
        undefined,
        duplexFlip,
        orientationMode
      );
      const duplexPdf = await generateProductionPDF(generated, selectedPaper, 'duplex', fullLayout);
      const pdfBlob = duplexPdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Ouvre immédiatement dans un onglet Google Chrome
      window.open(pdfUrl, '_blank');

      // Déclenche également le téléchargement du fichier PDF complet
      duplexPdf.save(`LUMAREEL_${selectedEvent.artist.replace(/\s+/g, '_')}_${quantity}BILLETS.pdf`);

      showToast(`Lot de ${quantity} billets préparé : ouvert directement dans Google Chrome !`, 'success');
      
      // Ferme automatiquement la modal pour revenir à l'espace de travail
      onClose();
    } catch (error) {
      console.error(error);
      showToast(
        error instanceof Error ? error.message : 'Une erreur est survenue pendant la préparation du lot.',
        'error'
      );
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto font-agrandir-regular">
      <div className="relative w-full max-w-2xl bg-[#0c0c0c] border border-white/15 rounded-3xl p-6 sm:p-8 text-white shadow-2xl my-6">
        
        {/* En-tête avec la petite croix de fermeture très accessible */}
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
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg group"
            title="Fermer la fenêtre (Échap)"
            aria-label="Fermer"
          >
            <X className="w-5 h-5 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

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
            <p className="text-[10px] text-neutral-500 mt-1.5">Le verso est généré en miroir selon ce choix, pour tomber exactement derrière chaque recto.</p>
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

          {/* Bouton blanc unique demandé : "Préparer 10 billets" */}
          <button
            type="submit"
            disabled={isGenerating || isUploadingDesign || !categoryDesignUrl || !layout}
            className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden cursor-pointer active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-[#d4af37]/25" style={{ width: `${generationProgress}%`, transition: 'width 0.2s' }} />
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10">Préparation en cours... {generationProgress}%</span>
              </>
            ) : (
              <span>Préparer {quantity} billets</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
