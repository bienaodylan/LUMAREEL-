import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CreditCard, Sparkles, Wallet } from 'lucide-react';

/**
 * Page officielle "Ma carte" :
 * - Landing page de présentation produit style Monzo pour découvrir la carte, ses spécifications
 *   physiques et radiofréquences, et suivre le processus de demande d'admission.
 * - Pour les titulaires confirmés : bascule transparente entre leur Portefeuille Cashless & Carte active
 *   et la vitrine de présentation du club.
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser, setCurrentPage, t } = useApp();
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
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/membership/my-card?email=${encodeURIComponent(currentUser.email)}`, { headers });
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#050505] text-white pb-24">
      {/* Barre de navigation supérieure et sélecteur si titulaire actif */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8 pb-3 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 text-xs font-agrandir-bold tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#d4af37]" />
          <span>{t('nav.backHome')}</span>
        </button>

        {/* Sélecteur de vue pour les membres actifs (Mon Portefeuille vs Découvrir le Produit) */}
        {membershipStatus === 'active' && (
          <div className="inline-flex max-w-full overflow-x-auto items-center p-1 rounded-full bg-white/5 border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('wallet')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-full font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'wallet'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>{t('memberCard.myWalletCard')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('landing')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-full font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeView === 'landing'
                  ? 'bg-[#d4af37] text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>{t('memberCard.productShowcase')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Rendu dynamique : Portefeuille actif ou Landing Page produit */}
      {membershipStatus === 'active' && activeView === 'wallet' ? (
        <div className="max-w-6xl mx-auto px-4 sm:px-8">
          <LumareelWalletView />
        </div>
      ) : (
        <LumareelCardLandingPage
          hasActiveCard={membershipStatus === 'active'}
          activeCardNumber={activeCardNumber}
          onGoToWallet={() => setActiveView('wallet')}
        />
      )}
    </div>
  );
};
