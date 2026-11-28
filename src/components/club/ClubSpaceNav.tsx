import React from 'react';
import { PageView, useApp } from '../../context/AppContext';

interface ClubSpaceNavProps {
  active: 'rewards' | 'backstage' | 'memories' | 'suggestions';
  className?: string;
}

const SPACES: Array<{
  id: 'rewards' | 'backstage' | 'memories' | 'suggestions';
  labelFr: string;
  labelEn: string;
}> = [
  { id: 'rewards', labelFr: 'Gift Points & Parrainage', labelEn: 'Gift Points & Referrals' },
  { id: 'backstage', labelFr: 'Backstage', labelEn: 'Backstage' },
  { id: 'memories', labelFr: 'Mes Moments', labelEn: 'My Moments' },
  { id: 'suggestions', labelFr: 'Ta Voix', labelEn: 'Your Voice' },
];

export const ClubSpaceNav: React.FC<ClubSpaceNavProps> = ({ active, className = '' }) => {
  const { setCurrentPage, language } = useApp();
  const isEn = language === 'en';

  return (
    <nav
      aria-label={isEn ? 'LUMARÉEL Club spaces' : 'Espaces du Club LUMARÉEL'}
      className={`w-full border-b border-white/10 ${className}`}
    >
      <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-hide">
        {SPACES.map((space) => {
          const isActive = active === space.id;
          return (
            <button
              key={space.id}
              type="button"
              onClick={() => setCurrentPage(space.id as PageView)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative shrink-0 py-3 text-[11px] sm:text-xs tracking-[0.06em] transition-colors cursor-pointer ${
                isActive
                  ? 'text-white font-agrandir-extrabold'
                  : 'text-neutral-500 hover:text-neutral-200 font-agrandir-semibold'
              }`}
            >
              <span>{isEn ? space.labelEn : space.labelFr}</span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-[1.5px] bg-white"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
