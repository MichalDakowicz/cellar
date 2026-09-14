import { useEffect } from 'react';

import { isWeb } from '@/hooks/useResponsive';

type WebShortcutsOptions = {
  /** Jump to the nth destination, 0-based — the nav island order. */
  onSelectTab: (index: number) => void;
  /** `n` — the capture field, from wherever you are. */
  onCapture: () => void;
  /** `/` — search across every shelf. */
  onSearch: () => void;
};

/**
 * Keyboard navigation for the browser build (PING.md §8.5): `1`-`9` switch
 * destination, `n` drops you in the capture field, `/` opens search.
 *
 * A no-op on native, and suppressed whenever focus is inside a text field —
 * this app is a text field on its home route, so an unguarded `n` would eat the
 * first letter of half the thoughts typed into it.
 *
 * Registered above the navigator so the keys work on every route, not only the
 * five that are tabs.
 */
export function useWebShortcuts({ onSelectTab, onCapture, onSearch }: WebShortcutsOptions) {
  useEffect(() => {
    if (!isWeb || typeof window === 'undefined') return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as (HTMLElement & { isContentEditable?: boolean }) | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return;

      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        onSelectTab(Number(event.key) - 1);
        return;
      }

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        onCapture();
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        onSearch();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSelectTab, onCapture, onSearch]);
}
