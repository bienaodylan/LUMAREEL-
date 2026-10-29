import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Send, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  ExternalLink,
  QrCode,
  Sparkles
} from 'lucide-react';
import { ScannerToken } from '../../types';

interface ScannerLinkGeneratorProps {
  eventId: string;
  eventTitle: string;
  artistName?: string;
  showToast?: (msg: string, type?: 'info' | 'success' | 'error') => void;
}

export const ScannerLinkGenerator: React.FC<ScannerLinkGeneratorProps> = ({
  eventId,
  eventTitle,
  artistName,
  showToast,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeToken, setActiveToken] = useState<ScannerToken | null>(null);
  const [existingTokens, setExistingTokens] = useState<ScannerToken[]>([]);

  // Fetch existing tokens on mount or event change
  useEffect(() => {
    let isMounted = true;
    const fetchTokens = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/scanner-tokens`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.tokens && data.tokens.length > 0) {
            setExistingTokens(data.tokens);
            // Default to newest token if active
            const newest = data.tokens[0];
            const isExpired = new Date(newest.expiresAt).getTime() < Date.now();
            if (!isExpired && !newest.revoked) {
              setActiveToken(newest);
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              setGeneratedUrl(`${origin}/?page=gate_scanner&eventId=${eventId}&token=${newest.token}`);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to load existing scanner tokens', e);
      }
    };

    fetchTokens();
    return () => {
      isMounted = false;
    };
  }, [eventId]);

  const handleGenerateToken = async () => {
    try {
      setIsGenerating(true);
      setCopied(false);

      const res = await fetch(`/api/events/${eventId}/scanner-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createdBy: 'Direction LUMARÉEL CO.',
          durationHours: 24,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la génération du token.');
      }

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}/?page=gate_scanner&eventId=${eventId}&token=${data.token}`;
      setGeneratedUrl(fullUrl);
      setActiveToken(data.scannerToken);
      setExistingTokens((prev) => [data.scannerToken, ...prev.filter((t) => t.id !== data.scannerToken.id)]);

      if (showToast) {
        showToast('Lien magique vigile généré avec succès !', 'success');
      }
    } catch (err: any) {
      if (showToast) {
        showToast(err.message || 'Échec de génération du lien magique.', 'error');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      if (showToast) {
        showToast('Lien copié dans le presse-papier !', 'success');
      }
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const input = document.getElementById('magic-link-input') as HTMLInputElement | null;
      if (input) {
        input.select();
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    }
  };

  const handleShareWhatsApp = () => {
    if (!generatedUrl) return;
    const message = `Bonjour, voici votre lien d’accès sécurisé au scanner de billets pour le concert "${artistName ? `${artistName} — ` : ''}${eventTitle}". Cliquez pour ouvrir la caméra et valider les entrées : ${generatedUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="p-6 sm:p-7 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl space-y-6">
      
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#d4af37]" />
              <span>LIEN MAGIQUE VIGILE</span>
            </span>
            <span className="text-xs text-[#888]">·</span>
            <span className="text-xs text-[#aaa] font-agrandir-semibold">SANS MOT DE PASSE</span>
          </div>
          <h3 className="font-agrandir-extrabold text-lg sm:text-xl text-white uppercase tracking-tight">
            Accès Scanner pour Contrôleurs
          </h3>
          <p className="text-xs text-[#888] font-agrandir-regular max-w-xl">
            Générez un lien d’accès instantané cryptographique à envoyer directement sur WhatsApp à votre équipe de sécurité. Le lien autorise l'ouverture de la caméra et le contrôle des billets pendant 24h.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateToken}
          disabled={isGenerating}
          className="self-start sm:self-auto px-5 py-3 rounded-2xl bg-[#d4af37] hover:bg-[#b89528] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 cursor-pointer shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Génération en cours...</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4" />
              <span>Générer le lien d'accès Vigile</span>
            </>
          )}
        </button>
      </div>

      {/* Generated Link Display Area */}
      {generatedUrl ? (
        <div className="space-y-4 animate-fadeIn">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-agrandir-bold tracking-widest text-[#888] uppercase">
                URL SÉCURISÉE DU SCANNER (PRÊTE À ENVOYER)
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-agrandir-semibold">
                <Clock className="w-3.5 h-3.5" />
                <span>Valide 24 heures</span>
              </span>
            </div>

            {/* Read-Only URL Input Field & Actions */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  id="magic-link-input"
                  type="text"
                  readOnly
                  value={generatedUrl}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="w-full bg-[#141414] border border-white/15 focus:border-[#d4af37] rounded-2xl px-4 py-3 text-xs font-mono text-neutral-200 select-all outline-none transition-colors"
                />
              </div>

              {/* Button Copier le lien */}
              <button
                type="button"
                onClick={handleCopy}
                className={`px-5 py-3 rounded-2xl font-agrandir-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                  copied
                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white hover:bg-neutral-200 text-black'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-black stroke-[3]" />
                    <span>Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>

              {/* Button Partager sur WhatsApp */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-5 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(37,211,102,0.3)]"
                title="Envoyer le lien directement par WhatsApp aux vigiles"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Active Token Metadata Card */}
          {activeToken && (
            <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-agrandir-semibold text-white">
                    Jeton actif : <span className="font-mono text-neutral-300">{activeToken.token}</span>
                  </div>
                  <div className="text-[11px] text-[#777]">
                    Expire le {new Date(activeToken.expiresAt).toLocaleString('fr-FR')} · {eventTitle}
                  </div>
                </div>
              </div>

              <a
                href={generatedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white flex items-center gap-1.5 text-[11px] font-agrandir-semibold transition-colors"
              >
                <span>Tester le scanner</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="p-6 rounded-2xl bg-[#121212]/50 border border-dashed border-white/15 text-center space-y-2">
          <KeyRound className="w-8 h-8 text-[#555] mx-auto" />
          <div className="text-xs font-agrandir-semibold text-neutral-400">
            Aucun lien actif généré pour ce concert pour le moment.
          </div>
          <div className="text-[11px] text-[#666]">
            Cliquez sur le bouton ci-dessus pour générer une URL sécurisée avec un jeton cryptographique valable 24h.
          </div>
        </div>
      )}

      {/* History of generated tokens */}
      {existingTokens.length > 1 && (
        <div className="pt-4 border-t border-white/10 space-y-2">
          <div className="text-[10px] font-agrandir-bold tracking-widest text-[#666] uppercase">
            HISTORIQUE DES JETONS CRÉÉS POUR CET ÉVÉNEMENT ({existingTokens.length})
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {existingTokens.slice(1, 4).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#141414] border border-white/5 text-[11px]"
              >
                <div className="font-mono text-neutral-400 truncate max-w-xs">{t.token}</div>
                <div className="text-[#666] text-[10px]">
                  {new Date(t.expiresAt).getTime() < Date.now() ? (
                    <span className="text-rose-400">Expiré</span>
                  ) : (
                    <span className="text-emerald-400">Valide jusqu'au {new Date(t.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
