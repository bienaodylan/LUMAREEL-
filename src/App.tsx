import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { SplashHero } from './components/SplashHero';
import { HomeFeed } from './components/HomeFeed';
import { DiscoverView } from './components/DiscoverView';
import { ConcertDetailView } from './components/ConcertDetailView';
import { ArchiveView } from './components/ArchiveView';
import { NewsView } from './components/NewsView';
import { OrganizersView } from './components/OrganizersView';
import { CustomerSpace } from './components/CustomerSpace';
import { GateScanner } from './components/GateScanner';
import { AdminDashboard } from './components/AdminDashboard';
import { CheckoutModal } from './components/CheckoutModal';
import { AuthModal } from './components/AuthModal';

const MainApp: React.FC = () => {
  const { currentPage, toast, setCurrentPage } = useApp();

  return (
    <div className="min-h-screen bg-[#000000] text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular">
      
      {/* Top Navbar (Hidden on splash entry page) */}
      <Navbar />

      {/* Dynamic View Router */}
      <main className="flex-1">
        {currentPage === 'splash' && <SplashHero />}
        {currentPage === 'home' && <HomeFeed />}
        {currentPage === 'discover' && <DiscoverView />}
        {currentPage === 'concert_detail' && <ConcertDetailView />}
        {currentPage === 'archive' && <ArchiveView />}
        {currentPage === 'news' && <NewsView />}
        {currentPage === 'organizers' && <OrganizersView />}
        {currentPage === 'client_space' && <CustomerSpace />}
        {currentPage === 'gate_scanner' && <GateScanner />}
        {currentPage === 'admin' && <AdminDashboard />}
      </main>

      {/* Global Minimal Footer (Except on splash entrance page) */}
      {currentPage !== 'splash' && (
        <footer className="border-t border-[#181818] bg-[#050505] py-12 px-6 sm:px-10 text-xs font-agrandir-regular text-[#777] mt-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="font-agrandir-extrabold text-white text-base tracking-widest uppercase">LUMARÉEL CO.</span>
                <span aria-hidden="true" className="text-[#444]">·</span>
                <span>PARIS / ABIDJAN</span>
                <span aria-hidden="true" className="text-[#444]">·</span>
                <span>© 2026 ARÉEL GROUPE</span>
              </div>
              <p className="text-[11px] text-[#555] max-w-md font-light">
                Plateforme de production et billetterie certifiée pour concerts et créations scéniques d'exception.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <button
                onClick={() => setCurrentPage('home')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Accueil
              </button>
              <button
                onClick={() => setCurrentPage('discover')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Découvrir
              </button>
              <button
                onClick={() => setCurrentPage('archive')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Archives
              </button>
              <button
                onClick={() => setCurrentPage('news')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Actualités
              </button>
              <button
                onClick={() => setCurrentPage('organizers')}
                className="text-[#d4af37] hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Espace Organisateurs
              </button>
              <button
                onClick={() => setCurrentPage('gate_scanner')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-regular"
              >
                Contrôle Entrée
              </button>
              <button
                onClick={() => setCurrentPage('admin')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-regular"
              >
                Administration
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Active Modals */}
      <CheckoutModal />
      <AuthModal />

      {/* Minimal Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] border border-white/20 px-5 py-3 shadow-2xl font-agrandir-regular text-xs flex items-center gap-3 text-white animate-slideUp">
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
