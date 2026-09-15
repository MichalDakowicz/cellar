import type { FlashListRef } from '@shopify/flash-list';
import { useCallback, useRef } from 'react';

import { isWeb } from '@/hooks/useResponsive';
import { scrollsItself, wheelPixels } from '@/lib/wheelScroll';

/**
 * Makes the wheel drive a screen's list from anywhere on the page.
 *
 * A desktop screen is a list in a column with a rail beside it and a lot of
 * page around both, and a wheel only moves what it is over — so pointing at the
 * heading, the gutter or the margin does nothing at all. This binds a listener
 * to the page and forwards the notch to the list, unless the pointer is over
 * something that scrolls itself (`lib/wheelScroll`): the list, the rail while
 * it has room left, a sheet over the top. The browser is right about those.
 *
 * Web-only and web-only by construction — there is no wheel on a phone, and
 * `attachPage` is simply never bound off web. The scroll goes through the DOM
 * node rather than `scrollToOffset` so the browser keeps doing the clamping,
 * the momentum and the scrollbar; driving the offset by hand fights all three.
 */
export function useWheelToList<T>() {
  const listRef = useRef<FlashListRef<T> | null>(null);
  const bound = useRef<{ node: HTMLElement; handler: (event: WheelEvent) => void } | null>(null);

  const attachPage = useCallback((node: unknown) => {
    if (bound.current) {
      bound.current.node.removeEventListener('wheel', bound.current.handler);
      bound.current = null;
    }
    // React hands the ref `null` on unmount, which is the detach above.
    if (!isWeb || !node) return;

    const page = node as HTMLElement;
    const handler = (event: WheelEvent) => {
      const list = listRef.current?.getScrollableNode() as HTMLElement | null | undefined;
      if (!list) return;

      // Up from whatever is under the pointer to the page itself. The list is
      // its own scroller, so a wheel over it stops at the first step and the
      // browser handles it exactly as before.
      for (let at = event.target as HTMLElement | null; at && at !== page; at = at.parentElement) {
        const style = window.getComputedStyle(at);
        if (scrollsItself({ scrollHeight: at.scrollHeight, clientHeight: at.clientHeight, overflowY: style.overflowY }))
          return;
      }

      const by = wheelPixels(event.deltaY, event.deltaMode, list.clientHeight);
      if (by === 0) return;
      list.scrollTop += by;
      // Only after the list has taken it — otherwise a page that cannot scroll
      // still loses the browser's own back/refresh gestures for nothing.
      event.preventDefault();
    };

    page.addEventListener('wheel', handler, { passive: false });
    bound.current = { node: page, handler };
  }, []);

  return { listRef, attachPage };
}
