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

const MainApp: React.FC = () => {
  const { currentPage, toast, setCurrentPage } = useApp();

  const isAdminOrScanner = currentPage === 'admin' || currentPage === 'gate_scanner';

  return (
    <div className="min-h-screen bg-[#000000] text-[#EFEFEF] flex flex-col justify-between selection:bg-white selection:text-black font-agrandir-regular relative">
      
      {/* Top Navbar (Masquée sur le scanner et la console admin) */}
      {!isAdminOrScanner && <Navbar />}

      {/* Dynamic View Router avec marge inférieure pour la barre flottante */}
      <main className={`flex-1 ${!isAdminOrScanner ? 'pb-28 sm:pb-36' : ''}`}>
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
      </main>

      {/* Barre de Navigation Flottante Style Instagram (Translucide en pilule) */}
      {!isAdminOrScanner && <FloatingAppNavbar />}

      {/* Pied de page public épuré (AUCUN LIEN D'ADMINISTRATION OU DE SCANNER VISIBLE AU PUBLIC) */}
      {!isAdminOrScanner && (
        <footer className="border-t border-[#181818] bg-[#050505] py-10 px-6 sm:px-10 text-xs font-agrandir-regular text-[#777] mb-20">
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

            {/* Liens publics légitimes uniquement */}
            <div className="flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Accueil
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('client_space')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Mes billets
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('archive')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Archives
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('news')}
                className="hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Actualités
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('organizers')}
                className="text-[#d4af37] hover:text-white transition-colors uppercase tracking-wider cursor-pointer font-agrandir-semibold"
              >
                Espace Organisateurs
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
