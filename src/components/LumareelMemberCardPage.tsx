import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { getAuthHeaders } from '../utils/authSession';
import { ArrowLeft, Sparkles, Wallet } from 'lucide-react';

/**
 * Page officielle "Black Card" :
 * - Affiche directement la landing page de présentation et le processus d'admission
 *   sans barre de navigation interne superflue.
 * - Pour les titulaires confirmés : permet d'accéder à leur Portefeuille & Carte active.
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser, setCurrentPage } = useApp();
  const [membershipStatus, setMembershipStatus] = useState<'loading' | 'none' | 'pending' | 'active'>('loading');
  const [activeCardNumber, setActiveCardNumber] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<'landing' | 'wallet'>('landing');

  useEffect(() => {
    let alive = true;
    const loadStatus = async () => {
      if (!currentUser?.email) {
        setMembershipStatus('none');
        setActiveView('landing');
        return;
      }

      try {
        const headers = await getAuthHeaders();

        const response = await fetch('/api/membership/my-card', {
          credentials: 'include',
          headers,
        });
        const result = await response.json();
        if (!alive) return;

        if (result.success && result.hasCard && result.card) {
          setActiveCardNumber(result.card.cardNumber);
          if (result.card.cardStatus === 'active') {
            setMembershipStatus('active');
            setActiveView('wallet');
          } else {
            setMembershipStatus('pending');
            setActiveView('landing');
          }
        } else {
          setMembershipStatus('none');
          setActiveView('landing');
        }
      } catch {
        if (alive) {
          setMembershipStatus('none');
          setActiveView('landing');
        }
      }
    };

    loadStatus();
    return () => {
      alive = false;
    };
  }, [currentUser]);

  if (membershipStatus === 'active' && activeView === 'wallet') {
    return (
      <div className="min-h-screen bg-black text-white pb-32 pt-6 sm:pt-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mb-6 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-white/15 bg-white/5 text-xs font-agrandir-bold tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-[#d4af37]" />
            <span>RETOUR À L'ACCUEIL</span>
          </button>

          <div className="inline-flex items-center p-1 bg-white/5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('wallet')}
              className="px-4 py-1.5 bg-[#d4af37] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Mon Portefeuille ({activeCardNumber})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('landing')}
              className="px-4 py-1.5 text-neutral-400 hover:text-white font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Présentation Black Card</span>
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <LumareelWalletView />
        </div>
      </div>
    );
  }

  return (
    <LumareelCardLandingPage
      hasActiveCard={membershipStatus === 'active'}
      activeCardNumber={activeCardNumber}
      onGoToWallet={() => setActiveView('wallet')}
    />
  );
};
