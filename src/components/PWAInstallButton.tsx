import React, { useState } from 'react';
import { Download, Share, PlusSquare, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useApp } from '../context/AppContext';

interface PWAInstallButtonProps {
  variant?: 'drawer' | 'compact' | 'sidebar';
  onAfterAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'drawer',
  onAfterAction,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const { language } = useApp();
  const isEn = language === 'en';
  const [showGuide, setShowGuide] = useState(false);

  // Already running as an installed app on Home Screen -> hide install button
  if (isInstalled) {
    return null;
  }

  const handlePress = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onAfterAction) onAfterAction();
      return;
    }
    setShowGuide(true);
  };

  const label = isEn
    ? isIOS
      ? 'Install on iPhone'
      : 'Install App'
    : isIOS
    ? 'Installer sur iPhone'
    : "Installer l'application";

  const buttonClass =
    variant === 'compact'
      ? 'inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-full bg-[#d4af37] text-black text-[11px] font-agrandir-extrabold tracking-wide cursor-pointer hover:bg-[#e5c352] transition-colors shrink-0'
      : variant === 'sidebar'
      ? 'flex w-full h-11 items-center gap-3 rounded-xl border border-[#d4af37]/35 bg-[#d4af37]/10 px-3 text-sm font-agrandir-bold text-[#d4af37] hover:bg-[#d4af37]/20 transition-colors cursor-pointer'
      : 'flex w-full min-h-[48px] items-center justify-between gap-3 rounded-2xl border border-[#d4af37]/40 bg-[#d4af37]/12 px-4 py-3 text-left text-white hover:bg-[#d4af37]/20 transition-colors cursor-pointer';

  return (
    <>
      <button type="button" onClick={handlePress} className={buttonClass}>
        <span className="flex items-center gap-2.5 min-w-0">
          {variant === 'drawer' ? (
            <Smartphone className="w-4 h-4 text-[#d4af37] shrink-0" />
          ) : (
            <Download className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="truncate">
            <span className={variant === 'drawer' ? 'block text-xs font-agrandir-extrabold uppercase tracking-wider text-white' : ''}>
              {label}
            </span>
            {variant === 'drawer' && (
              <span className="block text-[11px] text-neutral-300 font-light mt-0.5">
                {isEn
                  ? 'Add to Home Screen for full app mode'
                  : "Ajoutez à l'écran d'accueil pour le mode app"}
              </span>
            )}
          </span>
        </span>
        {variant === 'drawer' && (
          <Download className="w-4 h-4 text-[#d4af37] shrink-0" />
        )}
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#0c0c0c] border-t sm:border border-white/15 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-left shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto sm:hidden" />

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#d4af37]">
                  LUMARÉEL APP
                </div>
                <h3 className="text-lg font-agrandir-extrabold text-white mt-0.5">
                  {isEn ? 'Install LUMARÉEL on your phone' : 'Installer LUMARÉEL sur votre téléphone'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-neutral-300 cursor-pointer shrink-0"
                aria-label={isEn ? 'Close' : 'Fermer'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {isEn
                ? 'Once added to your Home Screen, LUMARÉEL opens full-screen with its native bottom navigation bar — just like an App Store app.'
                : "Une fois ajoutée à votre écran d'accueil, LUMARÉEL s'ouvre en plein écran avec sa barre de navigation en bas, comme une application téléchargée sur l'App Store."}
            </p>

            {isIOS ? (
              <ol className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <Share className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <span>
                    {isEn ? (
                      <>
                        1. Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.
                      </>
                    ) : (
                      <>
                        1. Touchez le bouton <strong className="text-white">Partager</strong> en bas de Safari.
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <PlusSquare className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <span>
                    {isEn ? (
                      <>
                        2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>, then <strong className="text-white">Add</strong>.
                      </>
                    ) : (
                      <>
                        2. Descendez et appuyez sur <strong className="text-white">Sur l’écran d’accueil</strong>, puis <strong className="text-white">Ajouter</strong>.
                      </>
                    )}
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <Smartphone className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <span>
                    {isEn ? (
                      <>
                        1. Open your browser menu (<strong className="text-white">⋮</strong> or <strong className="text-white">Share</strong>).
                      </>
                    ) : (
                      <>
                        1. Ouvrez le menu de votre navigateur (<strong className="text-white">⋮</strong> ou <strong className="text-white">Partager</strong>).
                      </>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <PlusSquare className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                  <span>
                    {isEn ? (
                      <>
                        2. Tap <strong className="text-white">Install app</strong> or <strong className="text-white">Add to Home Screen</strong>.
                      </>
                    ) : (
                      <>
                        2. Appuyez sur <strong className="text-white">Installer l’application</strong> ou <strong className="text-white">Ajouter à l’écran d’accueil</strong>.
                      </>
                    )}
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full min-h-[46px] rounded-full bg-white text-black font-agrandir-extrabold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {isEn ? 'Got it' : 'Compris'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
