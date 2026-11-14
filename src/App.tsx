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
import { AnimatePresence, motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentPage, toast, setCurrentPage, platformSettings, currentUser, setIsAuthModalOpen, showToast } = useApp();

  const isAdminOrScanner = currentPage === 'admin' || currentPage === 'gate_scanner';
  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  return (
    <div className="min-h-screen w-full bg-black text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular relative overflow-x-hidden">
      
      {/* Top Navbar (Masquée sur le scanner et la console admin) */}
      {!isAdminOrScanner && <><Navbar /><DesktopSidebar /></>}

      {/* Dynamic View Router avec transition de page fluide et espacement optimisé */}
      <main className={`flex-1 w-full relative z-10 ${!isAdminOrScanner ? `${currentPage === 'member_card' || currentPage === 'card' ? 'pb-0' : 'pb-8 sm:pb-12'} md:pl-[244px]` : ''}`}>
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

      {/* Barre de Navigation Flottante Style Instagram (Translucide en pilule) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Pied de page public en gris (masqué sur la landing page Black Card qui possède son propre footer) */}
      {!isAdminOrScanner && currentPage !== 'member_card' && currentPage !== 'card' && (
        <footer className="relative z-10 w-full border-t border-white/10 bg-[#161616] py-8 px-4 sm:px-10 text-xs font-agrandir-regular text-[#888] mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 mb-2.5">
                <img
                  src="/assets/logo-lumareel.png"
                  alt="LUMARÉEL CO."
                  className="h-6 sm:h-7 object-contain"
                />
              </div>
              <p className="text-[11px] text-[#aaa] max-w-lg font-light leading-relaxed">
                Agence de AREEL GROUPE, spécialisée dans l’Organisation et la Promotion d’Événements Festifs.
              </p>
            </div>

            {/* Réseaux sociaux officiels ordonnés (icônes blanches sans fond) : 1. TikTok, 2. Instagram, 3. Snapchat, 4. YouTube, 5. Facebook */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="flex items-center gap-4">
                {/* 1. TikTok */}
                <a
                  href={platformSettings?.socialLinks?.tiktok || 'https://www.tiktok.com/@lumareelco'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="TikTok LUMARÉEL"
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.33a6.33 6.33 0 0 0-6.61 6.33 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.34a8.28 8.28 0 0 0 4.18 1.15V6.04c-.34 0-.68-.22-1-.44z"/>
                  </svg>
                </a>

                {/* 2. Instagram */}
                <a
                  href={platformSettings?.socialLinks?.instagram || 'https://www.instagram.com/lumareelco/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram LUMARÉEL"
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* 3. Snapchat (Logo fantôme officiel) */}
                <a
                  href={platformSettings?.socialLinks?.snapchat || 'https://www.snapchat.com/add/lumareelco'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Snapchat LUMARÉEL"
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.203 1.992c-3.468 0-5.742 2.38-5.742 5.568 0 .584.116 1.344.208 1.84.048.24-.128.448-.36.568-.584.296-1.504.864-1.88 1.56-.376.696-.136 1.544.52 1.872.488.24.992.368 1.344.384.2.008.352.168.328.368-.072.584-.36 2.056-.568 2.56-.272.672-.888 1.184-1.872 1.488-.304.096-.44.416-.304.696.48.984 1.84 1.448 3.328 1.256.408-.056.76.168.96.52.48.848 1.528 1.336 2.8 1.336.704 0 1.288-.168 1.776-.448.24-.144.536-.144.776 0 .488.28 1.072.448 1.776.448 1.272 0 2.32-.488 2.8-1.336.2-.352.552-.576.96-.52 1.488.192 2.848-.272 3.328-1.256.136-.28 0-.6-.304-.696-.984-.304-1.6-.816-1.872-1.488-.208-.504-.496-1.976-.568-2.56-.024-.2.128-.36.328-.368.352-.016.856-.144 1.344-.384.656-.328.896-1.176.52-1.872-.376-.696-1.296-1.264-1.88-1.56-.232-.12-.408-.328-.36-.568.092-.496.208-1.256.208-1.84 0-3.188-2.274-5.568-5.742-5.568z"/>
                  </svg>
                </a>

                {/* 4. YouTube */}
                <a
                  href={platformSettings?.socialLinks?.youtube || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube LUMARÉEL"
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>

                {/* 5. Facebook */}
                <a
                  href={platformSettings?.socialLinks?.facebook || 'https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook LUMARÉEL"
                  className="w-8 h-8 flex items-center justify-center text-white hover:text-[#d4af37] transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>

              <div className="text-[10px] text-[#777] font-mono tracking-widest uppercase">
                BILLETTERIE OFFICIELLE CERTIFIÉE · PLACEMENT GARANTI
              </div>
            </div>
          </div>
        </footer>
      )}

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
