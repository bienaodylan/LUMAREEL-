import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { useApp } from '../context/AppContext';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { language } = useApp();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[65] flex items-center gap-2 rounded-full bg-amber-500/95 px-4 py-2 text-xs font-agrandir-bold text-black shadow-xl backdrop-blur-md"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {language === 'en'
          ? 'Offline mode — showing saved data'
          : 'Mode hors ligne — données enregistrées'}
      </span>
    </div>
  );
};
