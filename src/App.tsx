import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { FloatingAppNavbar } from './components/FloatingAppNavbar';
import { DesktopSidebar } from './components/DesktopSidebar';
import { HomeFeed } from './components/HomeFeed';
import { ConcertDetailView } from './components/ConcertDetailView';
import { ArchiveView } from './components/ArchiveView';
import { NewsView } from './components/NewsView';
import { OrganizersView } from './components/OrganizersView';
import { CustomerSpace } from './components/CustomerSpace';
import { ProfileView } from './components/ProfileView';
import { ScannerView } from './components/ScannerView';
import { AdminDashboard } from './components/AdminDashboard';
import { TicketBatchPrintModal } from './components/TicketBatchPrintModal';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { LumareelMemberCardPage } from './components/LumareelMemberCardPage';
import { CardVerificationView } from './components/CardVerificationView';
import { RewardsHubView } from './components/RewardsHubView';
import { BackstageView } from './components/BackstageView';
import { FlashDropsView } from './components/FlashDropsView';
import { ConcertMemoriesView } from './components/ConcertMemoriesView';
import { SuggestionsView } from './components/SuggestionsView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';
import { saveStoredMemberCard } from './utils/memberCardStorage';
import { AnimatePresence, motion } from 'framer-motion';

const MainApp: React.FC = () => {
  const { currentPage, setCurrentPage, toast, showToast, refreshCustomerOrders, refreshEvents, language } = useApp();
  const { isStandalone } = usePWAInstall();

  // Vérification automatique au retour de la page de paiement PayMeTrust (?payment_status=...&ref=PMT-...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment_status');
    const ref = params.get('ref');
    if (!paymentStatus || !ref || !ref.startsWith('PMT-')) return;

    const cleanUrl = () => {
      try {
        window.history.replaceState({}, '', window.location.pathname);
      } catch {
        // ignore
      }
    };

    if (paymentStatus === 'cancelled') {
      showToast(
        language === 'en'
          ? 'PayMeTrust payment was cancelled.'
          : 'Le paiement PayMeTrust a été annulé.',
        'info'
      );
      cleanUrl();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payments/paymetrust/verify/${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (cancelled) return;

        if (res.ok && data?.success && data?.transaction?.status === 'SUCCESS') {
          await Promise.all([refreshCustomerOrders(), refreshEvents()]);
          const isCard = ref.startsWith('PMT-CARD-');
          if (isCard && data?.fulfillment?.card) {
            saveStoredMemberCard(data.fulfillment.card);
          }
          showToast(
            isCard
              ? (language === 'en' ? 'LUMARÉEL Black Card payment confirmed! Your card is ready.' : 'Paiement LUMARÉEL Black Card confirmé ! Votre carte est prête.')
              : (language === 'en' ? 'Payment confirmed! Your tickets are available.' : 'Paiement confirmé ! Vos billets sont disponibles.'),
            'success'
          );
          setCurrentPage(isCard ? 'member_card' : 'client_space');
        } else {
          showToast(
            language === 'en'
              ? 'Payment is being confirmed by PayMeTrust…'
              : 'Paiement en cours de confirmation par PayMeTrust…',
            'info'
          );
        }
      } catch {
        // silently ignore network error on return check
      } finally {
        cleanUrl();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Remet le scroll en haut proprement lors d'un changement de page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }
  }, [currentPage]);

  const isAdminOrScanner = currentPage === 'admin' || currentPage === 'gate_scanner';
  const isHomePage = currentPage === 'home' || currentPage === 'discover';
  const isStandaloneRootTab =
    isHomePage ||
    currentPage === 'client_space' ||
    currentPage === 'member_card' ||
    currentPage === 'card' ||
    currentPage === 'profile';
  const hasVisibleMobileHeader = !isAdminOrScanner && (!isStandalone || isHomePage || !isStandaloneRootTab);

  return (
    <div className="min-h-screen w-full max-w-full bg-black text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular relative">
      {/* Indicateur hors-ligne discret pour la PWA */}
      <OfflineIndicator />

      {/* Top Navbar (Masquée sur le scanner et la console admin) */}
      {!isAdminOrScanner && (
        <>
          <Navbar />
          <DesktopSidebar />
        </>
      )}

      {/* Dynamic View Router avec transition de page fluide et espacement adapté au mobile web & app */}
      <main
        className={`flex-1 w-full max-w-full min-w-0 relative z-10 ${
          !isAdminOrScanner
            ? `${
                'pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))]'
              } ${
                hasVisibleMobileHeader && !isHomePage
                  ? 'pt-[calc(4.1rem+env(safe-area-inset-top,0px))] md:pt-0'
                  : ''
              } md:pb-12 md:pl-[232px]`
            : ''
        }`}
        style={
          !isAdminOrScanner && !hasVisibleMobileHeader
            ? { paddingTop: 'env(safe-area-inset-top, 0px)' }
            : undefined
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-full min-w-0"
          >
            {currentPage === 'splash' && <HomeFeed />}
            {currentPage === 'home' && <HomeFeed />}
            {currentPage === 'discover' && <HomeFeed />}
            {currentPage === 'concert_detail' && <ConcertDetailView />}
            {currentPage === 'archive' && <ArchiveView />}
            {currentPage === 'news' && <NewsView />}
            {currentPage === 'organizers' && <OrganizersView />}
            {currentPage === 'client_space' && <CustomerSpace />}
            {currentPage === 'profile' && <ProfileView />}
            {currentPage === 'card' && <LumareelMemberCardPage />}
            {currentPage === 'member_card' && <LumareelMemberCardPage />}
            {currentPage === 'card_verify' && <CardVerificationView />}
            {currentPage === 'rewards' && <RewardsHubView />}
            {currentPage === 'backstage' && <BackstageView />}
            {currentPage === 'flash_drops' && <FlashDropsView />}
            {currentPage === 'memories' && <ConcertMemoriesView />}
            {currentPage === 'suggestions' && <SuggestionsView />}
            {currentPage === 'gate_scanner' && <ScannerView />}
            {currentPage === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre de Navigation Flottante Mobile (uniquement en mode application installée / standalone) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Active Modals */}
      <CheckoutModal />
      <AuthModal />

      {/* Minimal Toast Notification */}
      {toast && (
        <div
          className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[95] bg-[#141414]/95 backdrop-blur-md border border-white/20 px-4 py-3 shadow-2xl font-agrandir-regular text-xs flex items-center gap-3 text-white animate-slideUp rounded-2xl ${
            isStandalone ? 'bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-8' : 'bottom-6 sm:bottom-8'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : 'bg-white'
            }`}
          />
          <span className="min-w-0 break-words">{toast.message}</span>
        </div>
      )}

    </div>
  );
};

/**
 * Dernier filet de sécurité au niveau de toute l'application.
 * Il capture aussi les erreurs qui surviennent avant le montage du tableau admin.
 */
const AdminEmergencyAccess: React.FC<{ error: Error }> = ({ error }) => {
  const { events, setCurrentPage } = useApp();
  const [printOpen, setPrintOpen] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white p-5 sm:p-10 font-agrandir-regular">
      <div className="max-w-3xl mx-auto mt-8 rounded-3xl border border-[#d4af37]/30 bg-[#101010] p-6 sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#d4af37]">LUMARÉEL · Accès de secours</p>
        <h1 className="mb-3 text-2xl font-bold">Console d’administration</h1>
        <p className="mb-5 text-sm text-neutral-300">
          Une erreur empêche le tableau de bord complet de s’afficher. Tu peux néanmoins accéder directement à l’impression des billets.
        </p>
        <div className="mb-5 break-words rounded-xl bg-black p-4 text-xs text-red-300">
          {error.message || 'Erreur JavaScript sans message'}
          {error.stack && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-neutral-500">{error.stack}</pre>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPrintOpen(true)} className="rounded-xl bg-[#d4af37] px-5 py-3 text-sm font-bold text-black">
            Ouvrir l’impression des billets
          </button>
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl border border-white/20 px-5 py-3 text-sm">
            Recharger
          </button>
          <button type="button" onClick={() => setCurrentPage('home')} className="rounded-xl border border-white/20 px-5 py-3 text-sm cursor-pointer">
            Retour à la page précédente
          </button>
        </div>
        <p className="mt-5 text-xs text-neutral-500">{events.length} événement(s) chargés dans cette session.</p>
      </div>
      <TicketBatchPrintModal isOpen={printOpen} onClose={() => setPrintOpen(false)} />
    </div>
  );
};

class AppRootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[LUMAREEL ROOT RENDER ERROR]', error, info.componentStack);
  }

  render() {
    if (this.state.error) return <AdminEmergencyAccess error={this.state.error} />;
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppRootErrorBoundary>
        <MainApp />
      </AppRootErrorBoundary>
    </AppProvider>
  );
}
