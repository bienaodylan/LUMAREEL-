import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { FloatingAppNavbar } from './components/FloatingAppNavbar';
import { HomeFeed } from './components/HomeFeed';
import { ConcertDetailView } from './components/ConcertDetailView';
import { ArchiveView } from './components/ArchiveView';
import { NewsView } from './components/NewsView';
import { OrganizersView } from './components/OrganizersView';
import { CustomerSpace } from './components/CustomerSpace';
import { ProfileView } from './components/ProfileView';
import { ScannerView } from './components/ScannerView';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';
import { AnimatePresence, motion } from 'framer-motion';

const MainApp: React.FC = () => {
  const { currentPage, toast, setCurrentPage, platformSettings } = useApp();

  const isAdminOrScanner = currentPage === 'admin' || currentPage === 'gate_scanner';

  return (
    <div className="min-h-screen bg-[#000000] text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular relative">
      
      {/* Top Navbar (Masquée sur le scanner et la console admin) */}
      {!isAdminOrScanner && <Navbar />}

      {/* Dynamic View Router avec transition de page fluide et espacement optimisé */}
      <main className={`flex-1 ${!isAdminOrScanner ? 'pb-8 sm:pb-12' : ''}`}>
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
            {currentPage === 'gate_scanner' && <ScannerView />}
            {currentPage === 'admin' && <AdminDashboard />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Barre de Navigation Flottante Style Instagram (Translucide en pilule) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Pied de page public épuré avec réseaux sociaux officiels ordonnés */}
      {!isAdminOrScanner && (
        <footer className="border-t border-[#181818] bg-[#050505] py-8 px-6 sm:px-10 text-xs font-agrandir-regular text-[#777] mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span className="font-agrandir-extrabold text-white text-base tracking-widest uppercase">{platformSettings?.platformName || 'LUMARÉEL CO.'}</span>
                <span aria-hidden="true" className="text-[#444]">·</span>
                <span>{platformSettings?.tagline || 'PARIS / ABIDJAN'}</span>
                <span aria-hidden="true" className="text-[#444]">·</span>
                <span>© {new Date().getFullYear()}</span>
              </div>
              <p className="text-[11px] text-[#555] max-w-md font-light">
                Plateforme de production et billetterie certifiée pour concerts et créations scéniques d'exception.
              </p>
            </div>

            {/* Réseaux sociaux officiels ordonnés : 1. TikTok, 2. Instagram, 3. Snapchat, 4. YouTube, 5. Facebook */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <div className="flex items-center gap-3">
                {/* 1. TikTok */}
                <a
                  href={platformSettings?.socialLinks?.tiktok || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="TikTok LUMARÉEL"
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 transition-all flex items-center justify-center overflow-hidden p-0.5 hover:scale-105 shadow-sm"
                >
                  <img
                    src="/assets/aistudio/tt_icon_76a5ff4c.png"
                    alt="TikTok"
                    className="w-full h-full object-contain"
                  />
                </a>

                {/* 2. Instagram */}
                <a
                  href={platformSettings?.socialLinks?.instagram || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram LUMARÉEL"
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 transition-all flex items-center justify-center overflow-hidden p-0.5 hover:scale-105 shadow-sm"
                >
                  <img
                    src="/assets/aistudio/ig_icon_-_Copie_d6d567d1.png"
                    alt="Instagram"
                    className="w-full h-full object-contain"
                  />
                </a>

                {/* 3. Snapchat */}
                <a
                  href={platformSettings?.socialLinks?.snapchat || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Snapchat LUMARÉEL"
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 transition-all flex items-center justify-center overflow-hidden p-0.5 hover:scale-105 shadow-sm"
                >
                  <img
                    src="/assets/aistudio/sc_icon_709e5263.png"
                    alt="Snapchat"
                    className="w-full h-full object-contain"
                  />
                </a>

                {/* 4. YouTube */}
                <a
                  href={platformSettings?.socialLinks?.youtube || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube LUMARÉEL"
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 transition-all flex items-center justify-center overflow-hidden p-0.5 hover:scale-105 shadow-sm"
                >
                  <img
                    src="/assets/aistudio/yt_icon_539fd1be.png"
                    alt="YouTube"
                    className="w-full h-full object-contain"
                  />
                </a>

                {/* 5. Facebook */}
                <a
                  href={platformSettings?.socialLinks?.facebook || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook LUMARÉEL"
                  className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 transition-all flex items-center justify-center overflow-hidden p-0.5 hover:scale-105 shadow-sm"
                >
                  <img
                    src="/assets/aistudio/fb_icon_343fb35c.png"
                    alt="Facebook"
                    className="w-full h-full object-contain"
                  />
                </a>
              </div>

              <div className="text-[10px] text-[#555] font-mono tracking-widest uppercase">
                BILLETTERIE SÉCURISÉE · PROTOCOLE CRYPTOGRAPHIQUE
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

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
