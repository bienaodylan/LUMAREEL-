import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { ArrowLeft } from 'lucide-react';

/**
 * En-tête mobile contextuel uniquement pour les pages secondaires qui n'ont pas
 * leur propre barre de retour intégrée.
 */
export const Navbar: React.FC = () => {
  const { currentPage, goBack, language, setLanguage } = useApp();

  if (
    [
      'splash',
      'home',
      'discover',
      'explore',
      'client_space',
      'member_card',
      'card',
      'memories',
      'rewards',
      'privileged_access',
      'flash_drops',
      'suggestions',
      'profile',
      'booking',
      'gate_scanner',
      'admin',
    ].includes(currentPage)
  ) {
    return null;
  }

  const isEn = language === 'en';

  const pageTitleMap: Partial<Record<PageView, string>> = {
    backstage: 'BACKSTAGE',
    media_detail: 'BACKSTAGE',
    archive: 'Archives',
    card_verify: isEn ? 'Verification' : 'Vérification',
    organizers: isEn ? 'Organizers' : 'Organisateurs',
    contact: isEn ? 'Support' : 'Contact',
    contributor_studio: isEn ? 'Contributor Studio' : 'Studio Photographe',
  };

  const currentTitle = pageTitleMap[currentPage];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 md:hidden bg-black/94 backdrop-blur-xl border-b border-white/[0.12] px-4 py-1.5"
      style={{ paddingTop: 'max(0.45rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 min-h-[42px]">
        <button
          type="button"
          onClick={goBack}
          aria-label={isEn ? 'Back' : 'Retour'}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 -ml-2 rounded-[4px] text-white hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0 lum-press"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.6} />
          <span className="text-xs font-agrandir-semibold whitespace-nowrap">
            {isEn ? 'Back' : 'Retour'}
          </span>
        </button>

        <div className="min-w-0 flex-1 flex justify-center">
          {currentTitle && (
            <span className="text-xs font-agrandir-extrabold text-white tracking-tight truncate">
              {currentTitle}
            </span>
          )}
        </div>

        <div className="flex items-center shrink-0">
          <div className="flex items-center bg-[#0E0E0E] border border-white/[0.12] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`min-h-[28px] px-2 rounded-[4px] transition-colors cursor-pointer ${
                language === 'fr'
                  ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`min-h-[28px] px-2 rounded-[4px] transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
