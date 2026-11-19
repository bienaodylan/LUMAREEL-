import React from 'react';
import { useApp } from '../context/AppContext';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { ArrowLeft } from 'lucide-react';

export const LumareelCardView: React.FC = () => {
  const { setCurrentPage, t } = useApp();

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 sm:pt-8">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-xs font-agrandir-bold tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#d4af37]" />
          <span>{t('nav.backHome')}</span>
        </button>
      </div>
      <LumareelCardLandingPage
        onGoToWallet={() => setCurrentPage('member_card')}
      />
    </div>
  );
};
