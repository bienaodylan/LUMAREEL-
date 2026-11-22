import React, { useState } from 'react';
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
import { LumareelWalletView } from './components/LumareelWalletView';
import { ProfileView } from './components/ProfileView';
import { ScannerView } from './components/ScannerView';
import { AdminDashboard } from './components/AdminDashboard';
import { TicketBatchPrintModal } from './components/TicketBatchPrintModal';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { LumareelCardView } from './components/LumareelCardView';
import { LumareelMemberCardPage } from './components/LumareelMemberCardPage';
import { CardVerificationView } from './components/CardVerificationView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AnimatePresence, motion } from 'framer-motion';

const MainApp: React.FC = () => {
  const { currentPage, toast } = useApp();
  const { isStandalone } = usePWAInstall();

  const isAdminOrScanner = currentPage === 'admin' || currentPage === 'gate_scanner';

  return (
    <div className="min-h-screen w-full bg-black text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular relative overflow-x-hidden">
      {/* Indicateur hors-ligne discret pour la PWA */}
      <OfflineIndicator />

      {/* Top Navbar (Masquée sur le scanner et la console admin) */}
      {!isAdminOrScanner && (
        <>
          <Navbar />
          <DesktopSidebar />
        </>
      )}

      {/* Dynamic View Router avec transition de page fluide et espacement optimisé */}
      <main
        className={`flex-1 w-full relative z-10 ${
          !isAdminOrScanner
            ? `${isStandalone ? 'pb-24' : 'pb-8'} sm:pb-10 md:pl-[244px]`
            : ''
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="w-full"
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
            {currentPage === 'card' && <LumareelCardView />}
            {currentPage === 'member_card' && <LumareelMemberCardPage />}
            {currentPage === 'card_verify' && <CardVerificationView />}
            {currentPage === 'gate_scanner' && <ScannerView />}
            {currentPage === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre de Navigation Native Mobile (uniquement en mode application installée / standalone) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Active Modals */}
      <CheckoutModal />
      <AuthModal />

      {/* Minimal Toast Notification */}
      {toast && (
        <div className="fixed bottom-24 sm:bottom-28 right-6 z-50 bg-[#141414]/95 backdrop-blur-md border border-white/20 px-5 py-3 shadow-2xl font-agrandir-regular text-xs flex items-center gap-3 text-white animate-slideUp rounded-2xl">
          <span
            className={`w-2 h-2 rounded-full ${
              toast.type === 'success'
                ? 'bg-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-500'
                : 'bg-white'
            }`}
          />
          <span>{toast.message}</span>
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
          <button type="button" onClick={() => setCurrentPage('home')} className="rounded-xl border border-white/20 px-5 py-3 text-sm">
            Retour au site
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
