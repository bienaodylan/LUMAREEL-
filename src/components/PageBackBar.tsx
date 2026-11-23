import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface PageBackBarProps {
  onBack?: () => void;
  onClose?: () => void;
  className?: string;
}

/**
 * Barre de navigation supérieure homogène (mobile app, mobile web et ordinateur) :
 * - À gauche : bouton "Retour à la page précédente" (←)
 * - À droite : bouton croix de fermeture (×)
 * Reprend exactement l'ergonomie de la fenêtre "Acheter ticket".
 */
export const PageBackBar: React.FC<PageBackBarProps> = ({
  onBack,
  onClose,
  className = '',
}) => {
  const { goBack, language, t } = useApp();
  const handleBack = onBack || goBack;
  const handleClose = onClose || onBack || goBack;
  const backLabel =
    language === 'en' ? 'Back to previous page' : 'Retour à la page précédente';

  return (
    <div
      className={`flex items-center justify-between gap-3 mb-5 pb-3 border-b border-white/10 ${className}`}
    >
      <button
        type="button"
        onClick={handleBack}
        className="min-h-[40px] inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-[11px] sm:text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group max-w-[calc(100%-3.25rem)]"
        aria-label={backLabel}
      >
        <ArrowLeft className="w-4 h-4 text-[#d4af37] shrink-0 group-hover:-translate-x-0.5 transition-transform" />
        <span className="truncate">{backLabel}</span>
      </button>

      <button
        type="button"
        onClick={handleClose}
        className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-neutral-300 hover:text-white hover:border-white transition-all cursor-pointer active:scale-95 shadow-md group"
        aria-label={t('nav.close')}
        title={t('nav.close')}
      >
        <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </div>
  );
};
