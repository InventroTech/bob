import { useCallback, useEffect, useRef } from 'react';

const ROOT_FLAG = 'pyroMobileBackRoot';
export type MobileBackOverlay = 'detail' | 'filters' | 'sort' | 'dispatchNav';

/**
 * Sync hardware/browser back with in-app overlays (detail, bottom sheet).
 * Push a history entry when opening an overlay; popstate closes the top overlay.
 */
export function useMobileBackStack() {
  const programmaticBackRef = useRef(false);
  const rootTrapDoneRef = useRef(false);
  const activeOverlayRef = useRef<MobileBackOverlay | null>(null);

  /** Extra list entry so the first back on the list does not exit the PWA immediately. */
  useEffect(() => {
    if (rootTrapDoneRef.current || typeof window === 'undefined') return;
    const state = window.history.state as Record<string, unknown> | null;
    if (!state?.[ROOT_FLAG]) {
      window.history.replaceState({ [ROOT_FLAG]: true, view: 'list' }, '');
      window.history.pushState({ view: 'list' }, '');
    }
    rootTrapDoneRef.current = true;
  }, []);

  const pushOverlay = useCallback((view: MobileBackOverlay) => {
    if (typeof window === 'undefined') return;
    activeOverlayRef.current = view;
    window.history.pushState({ view }, '');
  }, []);

  const popHistory = useCallback(() => {
    if (typeof window === 'undefined') return;
    programmaticBackRef.current = true;
    window.history.back();
    window.setTimeout(() => {
      programmaticBackRef.current = false;
    }, 0);
  }, []);

  /** Close overlay from in-app UI (sync browser history). */
  const closeOverlay = useCallback(
    (view: MobileBackOverlay) => {
      if (activeOverlayRef.current !== view) return;
      activeOverlayRef.current = null;
      popHistory();
    },
    [popHistory]
  );

  /** Hardware/browser back — returns which overlay was closed, if any. */
  const consumeBackNavigation = useCallback((): MobileBackOverlay | null => {
    const current = activeOverlayRef.current;
    activeOverlayRef.current = null;
    return current;
  }, []);

  const onPopState = useCallback((handler: () => MobileBackOverlay | null) => {
    if (typeof window === 'undefined') return () => undefined;
    const listener = () => {
      if (programmaticBackRef.current) return;
      handler();
    };
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }, []);

  return { pushOverlay, closeOverlay, consumeBackNavigation, onPopState };
}
