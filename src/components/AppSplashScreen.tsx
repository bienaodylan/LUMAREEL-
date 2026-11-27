import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AppSplashScreenProps {
  logoUrl?: string;
  onFinish: () => void;
}

/**
 * Splash page d'ouverture LUMARÉEL :
 * - Ambiance noire cinématique & halo doré discret
 * - Barre d'évolution fluide (0% -> 100%)
 * - Logo actuel LUMARÉEL affiché en bas de l'écran
 */
export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  logoUrl = '/assets/logo-lumareel.png',
  onFinish,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durationMs = 1750;
    const startTime = performance.now();
    let frameId = 0;
    let finishTimeout: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      // Courbe fluide easeOutCubic pour une progression naturelle
      const eased = 1 - Math.pow(1 - ratio, 3);
      const nextValue = Math.round(eased * 100);
      setProgress(nextValue);

      if (ratio < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        finishTimeout = window.setTimeout(() => {
          onFinish();
        }, 260);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      if (finishTimeout !== null) {
        window.clearTimeout(finishTimeout);
      }
    };
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }}
      className="fixed inset-0 z-[200] bg-black text-white flex flex-col justify-between overflow-hidden select-none"
      aria-label="Chargement LUMARÉEL"
    >
      {/* Halo scénique doré très discret */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,106,0.13),transparent_58%)]"
      />

      {/* Centre : uniquement le logo officiel LUMARÉEL, bien centré */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-center"
        >
          <img
            src="/assets/logo-lumareel.png"
            alt="LUMARÉEL"
            className="h-12 sm:h-16 w-auto max-w-[240px] sm:max-w-[300px] object-contain"
          />
        </motion.div>
      </div>

      {/* Bas de page : barre d'évolution uniquement */}
      <div
        className="relative z-10 w-full max-w-[280px] mx-auto px-6 flex flex-col items-center"
        style={{ paddingBottom: 'max(2.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-[#9A9A9A]">
            <span>Chargement</span>
            <span className="text-[#D4AF6A] tabular-nums">{progress}%</span>
          </div>
          <div className="w-full h-[3px] rounded-full bg-white/[0.12] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#B8924C] via-[#D4AF6A] to-[#F3DCAC] transition-[width] duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
