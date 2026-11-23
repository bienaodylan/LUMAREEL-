import React from 'react';
import { useApp } from '../context/AppContext';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';

export const LumareelCardView: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <LumareelCardLandingPage
        onGoToWallet={() => setCurrentPage('member_card')}
      />
    </div>
  );
};
