/**
 * Reference-counted body/document scroll lock utility.
 * Prevents nested modals or drawers (e.g. CheckoutModal + AuthModal, Navbar drawer, Club sheet)
 * from capturing `prev = 'hidden'` and leaving pages permanently unable to scroll after closing.
 */

let activeScrollLocks = 0;

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  let released = false;
  activeScrollLocks += 1;

  if (activeScrollLocks === 1) {
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
  }

  return () => {
    if (released) return;
    released = true;
    activeScrollLocks = Math.max(0, activeScrollLocks - 1);

    if (activeScrollLocks === 0) {
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';
    }
  };
}

export function scrollWindowToTop(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
