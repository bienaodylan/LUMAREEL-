import React, { useEffect, useRef, useState } from 'react';
import { PrintTicketItem } from '../utils/pdfEngine';
import { exportPhysicalTicketsToExcel } from '../utils/physicalTicketExport';
import { Printer, X, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { useApp } from '../context/AppContext';
import { formatDateLongFrench } from '../utils/dateUtils';

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
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!isSupabaseConfigured || !accessToken) throw new FatalError('Connectez-vous avec un compte administrateur autorisé avant de créer un lot.');
      const response = await fetch('/api/tickets/print-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json().catch(() => null) : null;

      if (response.ok && data?.success && Array.isArray(data.tickets)) return data;

      if (!data) {
        throw new FatalError(
          'Le serveur a renvoyé une réponse illisible. Vérifiez les journaux de la fonction API.'
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
  const { events, showToast } = useApp();
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || events[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [quantity, setQuantity] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
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
  }, [selectedEventId, selectedCategoryId, isOpen]);

  if (!isOpen) return null;

  const handleGenerateBatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedEvent || !currentCategory || quantity <= 0) {
      showToast('Configuration du lot incomplète.', 'error');
      return;
    }
    if (!Number.isInteger(quantity) || quantity > 10000) {
      showToast('La quantité doit être comprise entre 1 et 10 000 billets.', 'error');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
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
        ticketDesignUrl: '',
      }));
      setGenerationProgress(90);

      // 3. Export du registre QR + numéro de série uniquement.
      const safeArtist = selectedEvent.artist.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '');
      const fileBaseName = `LUMAREEL_${safeArtist}_${quantity}BILLETS`;
      await exportPhysicalTicketsToExcel(generated, fileBaseName);

      showToast(
        `Lot de ${quantity} billets enregistré. Registre Excel des QR codes et numéros de série téléchargé.`,
        'success'
      );

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

          <div className="rounded-2xl border border-[#d4af37]/30 bg-[#141414] p-4 space-y-2">
            <label htmlFor="physical-ticket-quantity" className="block text-[11px] uppercase font-agrandir-bold text-[#d4af37]">
              3. Nombre de QR codes à produire (1 à 1 000)
            </label>
            <input
              id="physical-ticket-quantity"
              type="number"
              min={1}
              max={1000}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isInteger(parsed)) setQuantity(Math.min(1000, Math.max(1, parsed)));
              }}
              disabled={isGenerating}
              required
              className="w-full bg-[#0b0b0b] border border-white/15 rounded-xl px-4 py-3 text-white text-lg font-agrandir-extrabold outline-none focus:border-[#d4af37]"
            />
            <p className="text-[10px] text-neutral-500">Choisissez librement le nombre exact de billets physiques à générer. La quantité et chaque QR code seront enregistrés dans le registre avant l’export Excel.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#141414] p-4 text-[11px] leading-relaxed text-neutral-300">
            Le fichier Excel contient une seule feuille « Registre » avec deux colonnes : l’image du QR code et le numéro de série correspondant. Aucun verso, aucune planche d’impression et aucune autre donnée ne sont exportés.
          </div>

          {/* Bouton blanc unique demandé : "Préparer 10 billets" */}
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-4 rounded-2xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm uppercase tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 relative overflow-hidden cursor-pointer active:scale-[0.99]"
          >
            {isGenerating ? (
              <>
                <div className="absolute inset-y-0 left-0 bg-[#d4af37]/25" style={{ width: `${generationProgress}%`, transition: 'width 0.2s' }} />
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10">Préparation en cours... {generationProgress}%</span>
              </>
            ) : (
              <span>Exporter {quantity} QR codes + numéros de série</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
