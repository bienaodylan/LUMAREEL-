import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { FloatingAppNavbar } from './components/FloatingAppNavbar';
import { DesktopTopNav } from './components/DesktopTopNav';
import { HomeFeed } from './components/HomeFeed';
import { ExplorerView } from './components/ExplorerView';
import { ConcertDetailView } from './components/ConcertDetailView';
import { ArchiveView } from './components/ArchiveView';
import { MediaDetailView } from './components/MediaDetailView';
import { ContributorPortalView } from './components/ContributorPortalView';
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
import { PrivilegedAccessView } from './components/PrivilegedAccessView';
import { FlashDropsView } from './components/FlashDropsView';
import { ConcertMemoriesView } from './components/ConcertMemoriesView';
import { SuggestionsView } from './components/SuggestionsView';
import { ContactView } from './components/ContactView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { saveStoredMemberCard } from './utils/memberCardStorage';
import { AnimatePresence, motion } from 'framer-motion';

const MainApp: React.FC = () => {
  const { currentPage, setCurrentPage, toast, showToast, refreshCustomerOrders, refreshEvents, language, hideBottomNav } = useApp();

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
  const hasMobileTopBar =
    !isAdminOrScanner &&
    ![
      'splash',
      'home',
      'discover',
      'explore',
      'client_space',
      'member_card',
      'card',
      'memories',
      'backstage',
      'rewards',
      'privileged_access',
      'flash_drops',
      'suggestions',
      'profile',
    ].includes(currentPage);
  const hasBottomNav =
    !isAdminOrScanner &&
    !hideBottomNav &&
    currentPage !== 'concert_detail';

  return (
    <div className="min-h-screen w-full max-w-full bg-black text-white flex flex-col justify-between selection:bg-[#D4AF6A] selection:text-black font-agrandir-regular relative">
      {/* Indicateur hors-ligne discret pour la PWA */}
      <OfflineIndicator />

      {/* En-tête mobile contextuel + barre horizontale desktop (masqués sur scanner/admin) */}
      {!isAdminOrScanner && (
        <>
          <Navbar />
          <DesktopTopNav />
        </>
      )}

      {/* Dynamic View Router */}
      <main
        className={`flex-1 w-full max-w-full min-w-0 relative z-10 ${
          !isAdminOrScanner
            ? `${
                hasBottomNav
                  ? 'pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]'
                  : 'pb-12'
              } ${
                hasMobileTopBar
                  ? 'pt-[calc(3.6rem+env(safe-area-inset-top,0px))] md:pt-[72px]'
                  : 'md:pt-[72px]'
              } md:pb-16`
            : ''
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-full min-w-0"
          >
            {currentPage === 'splash' && <HomeFeed />}
            {currentPage === 'home' && <HomeFeed />}
            {currentPage === 'discover' && <HomeFeed />}
            {currentPage === 'explore' && <ExplorerView />}
            {currentPage === 'concert_detail' && <ConcertDetailView />}
            {currentPage === 'media_detail' && <MediaDetailView />}
            {currentPage === 'contributor_studio' && <ContributorPortalView />}
            {currentPage === 'archive' && <ArchiveView />}
            {currentPage === 'organizers' && <OrganizersView />}
            {currentPage === 'client_space' && <CustomerSpace />}
            {currentPage === 'profile' && <ProfileView />}
            {currentPage === 'card' && <LumareelMemberCardPage />}
            {currentPage === 'member_card' && <LumareelMemberCardPage />}
            {currentPage === 'card_verify' && <CardVerificationView />}
            {currentPage === 'rewards' && <RewardsHubView />}
            {currentPage === 'privileged_access' && <PrivilegedAccessView />}
            {currentPage === 'backstage' && <ConcertMemoriesView />}
            {currentPage === 'flash_drops' && <FlashDropsView />}
            {currentPage === 'memories' && <ConcertMemoriesView />}
            {currentPage === 'suggestions' && <SuggestionsView />}
            {currentPage === 'contact' && <ContactView />}
            {currentPage === 'gate_scanner' && <ScannerView />}
            {currentPage === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre de Navigation Mobile Flottante (5 destinations majeures) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Active Modals */}
      <CheckoutModal />
      <AuthModal />

      {/* Minimal Toast Notification */}
      {toast && (
        <div
          className={`fixed left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[95] bg-[#141414]/96 backdrop-blur-md border border-white/[0.16] px-4 py-3 shadow-2xl font-agrandir-regular text-xs flex items-center gap-3 text-white rounded-2xl ${
            hasBottomNav
              ? 'bottom-[calc(6.2rem+env(safe-area-inset-bottom,0px))] md:bottom-8'
              : 'bottom-6 sm:bottom-8'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              toast.type === 'success'
                ? 'bg-[#7FE0A6]'
                : toast.type === 'error'
                ? 'bg-[#B3122B]'
                : 'bg-[#D4AF6A]'
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
      <div className="max-w-3xl mx-auto mt-8 rounded-3xl border border-white/20 bg-[#101010] p-6 sm:p-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-neutral-400">LUMARÉEL · Accès de secours</p>
        <h1 className="mb-3 text-2xl font-bold">Console d’administration</h1>
        <p className="mb-5 text-sm text-neutral-300">
          Une erreur empêche le tableau de bord complet de s’afficher. Tu peux néanmoins accéder directement à l’impression des billets.
        </p>
        <div className="mb-5 break-words rounded-xl bg-black p-4 text-xs text-red-300">
          {error.message || 'Erreur JavaScript sans message'}
          {error.stack && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-neutral-500">{error.stack}</pre>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setPrintOpen(true)} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-neutral-200 transition-colors cursor-pointer">
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
