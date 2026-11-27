const MOBILE_FULLSCREEN_KEY = 'lumareel_mobile_fullscreen_v1';
const MOBILE_FULLSCREEN_EVENT = 'lumareel-mobile-fullscreen-changed';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait' | 'portrait-primary' | 'any' | 'natural') => Promise<void>;
  unlock?: () => void;
};

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const coarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    window.innerWidth <= 1024;
  return mobileUa || coarsePointer;
}

export function isFullscreenActive(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export function isMobileFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FullscreenElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

export function isMobileFullscreenEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(MOBILE_FULLSCREEN_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setMobileFullscreenEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MOBILE_FULLSCREEN_KEY, String(enabled));
    window.dispatchEvent(
      new CustomEvent(MOBILE_FULLSCREEN_EVENT, { detail: { enabled } })
    );
  } catch {
    // ignore storage errors
  }
}

export async function lockPortraitOrientation(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const orientation = window.screen?.orientation as LockableScreenOrientation | undefined;
    if (orientation && typeof orientation.lock === 'function') {
      await orientation.lock('portrait');
    }
  } catch {
    // Screen Orientation lock is optional and restricted on some browsers/iOS
  }
}

export function unlockScreenOrientation(): void {
  if (typeof window === 'undefined') return;
  try {
    const orientation = window.screen?.orientation as LockableScreenOrientation | undefined;
    if (orientation && typeof orientation.unlock === 'function') {
      orientation.unlock();
    }
  } catch {
    // ignore
  }
}

export async function enterMobileFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement as FullscreenElement;
  try {
    if (!isFullscreenActive()) {
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
      } else if (typeof el.webkitRequestFullscreen === 'function') {
        await el.webkitRequestFullscreen();
      } else {
        await lockPortraitOrientation();
        return false;
      }
    }
    await lockPortraitOrientation();
    return true;
  } catch {
    return false;
  }
}

export async function exitMobileFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  const doc = document as FullscreenDocument;
  try {
    if (doc.fullscreenElement && typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
    } else if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // ignore
  } finally {
    unlockScreenOrientation();
  }
}

/**
 * Initialise le plein écran automatique sur mobile au lancement :
 * 1. Tente immédiatement requestFullscreen + Screen Orientation lock('portrait') (PWA / WebView).
 * 2. Si le navigateur mobile exige un geste utilisateur, déclenche automatiquement au premier tap.
 */
export function initAutoMobileFullscreen(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let armedGesture = false;

  const disarmGesture = () => {
    if (!armedGesture) return;
    armedGesture = false;
    window.removeEventListener('pointerdown', onFirstGesture, true);
    window.removeEventListener('touchstart', onFirstGesture, true);
  };

  const onFirstGesture = () => {
    disarmGesture();
    if (!isMobileDevice() || !isMobileFullscreenEnabled()) return;
    void enterMobileFullscreen();
  };

  const armGestureFallback = () => {
    if (armedGesture) return;
    armedGesture = true;
    window.addEventListener('pointerdown', onFirstGesture, { capture: true, passive: true });
    window.addEventListener('touchstart', onFirstGesture, { capture: true, passive: true });
  };

  const attemptLaunchFullscreen = async () => {
    if (!isMobileDevice() || !isMobileFullscreenEnabled()) {
      disarmGesture();
      return;
    }

    // Si déjà en mode standalone PWA, verrouille simplement l'orientation portrait
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      await lockPortraitOrientation();
    }

    if (!isFullscreenActive()) {
      const ok = await enterMobileFullscreen();
      if (!ok) {
        armGestureFallback();
      }
    }
  };

  const onPreferenceChange = () => {
    if (isMobileFullscreenEnabled()) {
      void attemptLaunchFullscreen();
    } else {
      disarmGesture();
      void exitMobileFullscreen();
    }
  };

  const onFullscreenChange = () => {
    if (isFullscreenActive() && isMobileDevice()) {
      void lockPortraitOrientation();
    }
  };

  void attemptLaunchFullscreen();
  window.addEventListener(MOBILE_FULLSCREEN_EVENT, onPreferenceChange);
  document.addEventListener('fullscreenchange', onFullscreenChange);

  return () => {
    disarmGesture();
    window.removeEventListener(MOBILE_FULLSCREEN_EVENT, onPreferenceChange);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
  };
}
