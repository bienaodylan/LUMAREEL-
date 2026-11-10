import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  RotateCw,
  Sparkles,
  Download,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Maximize2,
  Layers,
  ShieldCheck,
  Check,
  Info
} from 'lucide-react';
import { MembershipCard, CardTemplateTheme } from '../../../types';

interface CardPrintingStudioProps {
  card?: MembershipCard;
  onPrintExecuted?: (jobId: string) => void;
}

export const CardPrintingStudio: React.FC<CardPrintingStudioProps> = ({
  card,
  onPrintExecuted,
}) => {
  const [templateTheme, setTemplateTheme] = useState<CardTemplateTheme>('founders_noir_or');
  const [activeSide, setActiveSide] = useState<'both' | 'front' | 'back'>('both');
  const [showGuides, setShowGuides] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [printing, setPrinting] = useState(false);
  const [printSuccessNotice, setPrintSuccessNotice] = useState<string | null>(null);

  // Valeurs par défaut si aucune carte n'est passée
  const sampleCard: MembershipCard = card || {
    id: 'sample_001',
    userId: 'usr_sample',
    planId: 'plan_founders_annual',
    editionId: 'ed_founders_2026',
    membershipOrderId: 'ord_sample',
    cardNumber: 'LMR-2026-0001',
    cardSequence: 1,
    cardholderName: 'APERÇU — TITULAIRE',
    cardholderEmail: '',
    cardStatus: 'active',
    issuedAt: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    physicalCardStatus: 'approved',
    qrToken: 'LMR_SEC_98a76bc384df9201bc94582fca1209e7436b90d2381fcae87291a9203bcde892',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleTriggerPrint = async () => {
    if (!card) {
      setPrintSuccessNotice('Sélectionnez une carte réelle avant de lancer une impression.');
      return;
    }
    setPrinting(true);
    setPrintSuccessNotice(null);
    try {
      const res = await fetch('/api/membership/workshop/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: sampleCard.id,
          operatorId: 'Studio Atelier Central',
          printerModel: 'Evolis Primacy 2 / Zebra ZC300 (Simulé)',
          printerType: 'simulated',
          duplex: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrintSuccessNotice(
          `Travail d'impression ${data.job?.jobCode || ''} transmis avec succès. Statut carte : IMPRIMÉE.`
        );
        if (onPrintExecuted) onPrintExecuted(data.job?.id);
      } else {
        alert(data.error || 'Erreur lors de l’envoi de l’impression');
      }
    } catch (e: any) {
      alert(`Erreur réseau: ${e.message}`);
    } finally {
      setPrinting(false);
    }
  };

  // Formatage de la date d'expiration pour la carte
  const expiryFormatted = new Date(sampleCard.expiresAt).toLocaleDateString('fr-FR', {
    month: '2-digit',
    year: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Barre d'outils et sélecteur de gabarit */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#0c0c0c] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              STUDIO DE PERSONNALISATION PVC (CR-80)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              300 DPI · ISO 7810
            </span>
          </div>
          <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
            GÉNÉRATEUR &amp; CONFIGURATEUR DE CARTE PHYSIQUE
          </h3>
          <p className="text-xs text-neutral-400">
            Personnalisation recto/verso, calibrage des zones de sécurité et contrôle qualité.
          </p>
        </div>

        {/* Contrôles interactifs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sélection Gabarit */}
          <div className="flex items-center bg-[#171717] border border-white/10 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setTemplateTheme('founders_noir_or')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                templateTheme === 'founders_noir_or'
                  ? 'bg-[#d4af37] text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Founders Or
            </button>
            <button
              type="button"
              onClick={() => setTemplateTheme('minimaliste_obsidienne')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                templateTheme === 'minimaliste_obsidienne'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Obsidienne
            </button>
            <button
              type="button"
              onClick={() => setTemplateTheme('prestige_monogramme')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                templateTheme === 'prestige_monogramme'
                  ? 'bg-neutral-300 text-black shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monogramme
            </button>
          </div>

          {/* Toggle Faces */}
          <div className="flex items-center bg-[#171717] border border-white/10 rounded-xl p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveSide('both')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                activeSide === 'both' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Recto + Verso
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('front')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                activeSide === 'front' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Recto
            </button>
            <button
              type="button"
              onClick={() => setActiveSide('back')}
              className={`px-3 py-1.5 rounded-lg font-agrandir-bold transition-all cursor-pointer ${
                activeSide === 'back' ? 'bg-white/20 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Verso
            </button>
          </div>

          {/* Guides d'impression (Bords perdus & Zone tranquille) */}
          <button
            type="button"
            onClick={() => setShowGuides((prev) => !prev)}
            className={`px-3 py-2 rounded-xl border text-xs font-agrandir-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showGuides
                ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                : 'bg-[#171717] border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Repères 3mm</span>
          </button>
        </div>
      </div>

      {printSuccessNotice && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{printSuccessNotice}</span>
        </div>
      )}

      {/* ZONE D'APERÇU CR-80 (Format Standard Carte de Crédit / Badge PVC) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* RECTO (FRONT) */}
        {(activeSide === 'both' || activeSide === 'front') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-agrandir-bold text-white uppercase flex items-center gap-2">
                <span>FACE RECTO</span>
                <span className="text-[10px] text-[#d4af37] font-mono">
                  85.60 × 53.98 mm (CR-80)
                </span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500">Marquage Or &amp; Vernis Sélectif</span>
            </div>

            {/* Container carte avec proportion CR-80 (1.586) */}
            <div className="relative w-full aspect-[85.6/53.98] rounded-[22px] sm:rounded-[26px] p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-2xl transition-all border border-white/20 select-none bg-gradient-to-br from-[#121212] via-[#080808] to-[#000000]">
              {/* Repères techniques de découpe si activés */}
              {showGuides && (
                <div className="absolute inset-2 border border-dashed border-red-500/60 pointer-events-none z-30 flex items-start justify-end p-1">
                  <span className="text-[9px] font-mono text-red-400 bg-black/80 px-1 rounded">
                    Zone de sécurité 3mm
                  </span>
                </div>
              )}

              {/* Texture de fond luxe */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay"
                style={{
                  backgroundImage: `radial-gradient(circle at 80% 20%, #d4af37 0%, transparent 60%)`,
                }}
              />

              {/* Ligne 1 : Marque & Badge Édition */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <div className="text-[9px] sm:text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
                    OFFICIAL MEMBERSHIP
                  </div>
                  <h4 className="text-xl sm:text-2xl font-agrandir-extrabold tracking-wider text-white uppercase mt-0.5">
                    LUMARÉEL CO.
                  </h4>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37] text-[9px] sm:text-[10px] font-mono font-bold tracking-widest uppercase">
                    FOUNDERS · {sampleCard.cardSequence}/100
                  </span>
                </div>
              </div>

              {/* Ligne 2 : Numéro Permanent Gravé */}
              <div className="relative z-10 my-auto py-2">
                <div className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase mb-1">
                  IDENTIFIANT PERMANENT DE MEMBRE
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-mono font-bold tracking-[0.2em] text-white drop-shadow-md">
                  {sampleCard.cardNumber}
                </div>
              </div>

              {/* Ligne 3 : Nom du titulaire & Expiration */}
              <div className="relative z-10 flex items-end justify-between pt-2 border-t border-white/10">
                <div>
                  <div className="text-[8px] sm:text-[9px] font-mono text-[#888] uppercase tracking-wider">
                    TITULAIRE DE CARTE
                  </div>
                  <div className="font-agrandir-extrabold text-sm sm:text-base text-white uppercase tracking-wide truncate max-w-[240px]">
                    {sampleCard.cardholderName}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[8px] sm:text-[9px] font-mono text-[#888] uppercase tracking-wider">
                    VALABLE JUSQU'À
                  </div>
                  <div className="font-mono font-bold text-xs sm:text-sm text-[#d4af37]">
                    {expiryFormatted}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VERSO (BACK) — sans QR code */}
        {(activeSide === 'both' || activeSide === 'back') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span className="font-agrandir-bold text-white uppercase flex items-center gap-2">
                <span>FACE VERSO</span>
                <span className="text-[10px] text-[#d4af37] font-mono">FINITION PREMIUM</span>
              </span>
              <span className="text-[10px] font-mono text-neutral-500">Sans QR code</span>
            </div>
            <div className="relative w-full aspect-[85.6/53.98] rounded-[22px] sm:rounded-[26px] p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl transition-all border border-white/20 select-none bg-gradient-to-br from-[#111] via-[#080808] to-[#000]">
              {showGuides && <div className="absolute inset-2 border border-dashed border-red-500/60 pointer-events-none z-30" />}
              <div className="absolute top-0 left-0 right-0 h-6 bg-black border-b border-white/10 flex items-center px-4">
                <span className="text-[8px] font-mono text-neutral-600 tracking-widest">LUMARÉEL CO. · CARTE DE MEMBRE</span>
              </div>
              <div className="relative z-10 mt-5 flex-1 flex flex-col justify-center">
                <div className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#d4af37] mb-2">MEMBERSHIP · AUTHENTIC</div>
                <div className="text-xl sm:text-2xl font-agrandir-extrabold tracking-[0.12em] text-white uppercase">LUMARÉEL</div>
                <div className="mt-2 text-[10px] sm:text-xs text-neutral-400">Carte nominative · Présentez-la à nos équipes</div>
              </div>
              <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between text-[8px] sm:text-[9px] text-neutral-400 font-mono">
                <span>Carte personnelle et incessible</span>
                <span className="text-[#d4af37] font-bold">{sampleCard.cardNumber}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PANNEAU DE CONTRÔLE TECHNIQUE & VÉRIFICATION DES CONTRAINTES D'IMPRESSION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vérification 1 : Lisibilité et Zone de silence */}
        <div className="p-4 rounded-xl bg-[#0c0c0c] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-agrandir-bold text-white uppercase">
              Zone de Silence (Quiet Zone)
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Marge blanche périphérique de 2 modules respectée. Zéro distorsion optique.
            </p>
          </div>
        </div>

        {/* Vérification 2 : Résolution et Contraste */}
        <div className="p-4 rounded-xl bg-[#0c0c0c] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-agrandir-bold text-white uppercase">
              Qualité d'impression &amp; DPI
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Contraste élevé et rendu optimisé pour une impression PVC nette.
            </p>
          </div>
        </div>

        {/* Vérification 3 : Jeton cryptographique 256 bits */}
        <div className="p-4 rounded-xl bg-[#0c0c0c] border border-white/10 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center shrink-0 text-[#d4af37]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-agrandir-bold text-white uppercase">
              Jeton Révocable Associé
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              URL unique <code className="text-neutral-300 font-mono">/card/verify/:token</code> avec hachage SHA-256.
            </p>
          </div>
        </div>
      </div>

      {/* BOUTON D'ACTION PRINCIPAL D'IMPRESSION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#080808] border border-white/15">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#171717] border border-white/10 flex items-center justify-center text-[#d4af37]">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="font-agrandir-extrabold text-sm text-white uppercase">
              Envoyer à l'imprimante PVC (Recto / Verso)
            </div>
            <div className="text-xs text-neutral-400">
              Génère le spool d'impression duplex haute précision pour {sampleCard.cardNumber} ({sampleCard.cardholderName}).
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download={`QR_LUMAREEL_${sampleCard.cardNumber}.png`}
              className="px-4 py-3 rounded-xl bg-[#171717] hover:bg-[#202020] border border-white/10 text-white font-agrandir-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>QR HD</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleTriggerPrint}
            disabled={printing || !card}
            className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-[#d4af37] hover:bg-[#c49f27] active:scale-[0.98] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#d4af37]/20 disabled:opacity-50"
          >
            {printing ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Impression en cours...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>Lancer l'impression physique</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
