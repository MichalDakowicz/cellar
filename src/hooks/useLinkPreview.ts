import { useEffect } from 'react';

import { isEmptyMeta, META_BYTES, parseLinkMeta, type LinkMeta } from '@/lib/linkMeta';
import { useLinkPreviews, type LinkRecord } from '@/store/linkPreviews';

/**
 * What a link is called, fetched once and then remembered.
 *
 * The fetch is a plain GET of the page and a regex over its head. That works on
 * the phone, which is what this app is; **it does not work on the web build**,
 * where the browser refuses a cross-origin read and every link falls back to
 * its host. That is a deliberate stopping point rather than an oversight — the
 * fix is a proxy the app does not have yet, and a link that reads as its host
 * is the behaviour this app had yesterday.
 *
 * In flight is tracked in a module-level set rather than in the store: a list
 * can mount the same link in four rows at once, and four fetches of one page is
 * the one thing this hook exists to prevent. It is not state anything renders,
 * so putting it in the store would re-render every row for nothing.
 */

const inFlight = new Set<string>();

/** Long enough for a slow host, short enough not to hold a row's fetch open. */
const TIMEOUT_MS = 8000;

async function readMeta(href: string): Promise<LinkMeta | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(href, {
      signal: controller.signal,
      headers: { accept: 'text/html' },
    });
    if (!response.ok) return null;

    const type = response.headers.get('content-type') ?? '';
    if (!type.includes('html')) return null;

    // The whole body, then cut: react-native's fetch has no streaming reader,
    // so the cap is about what gets regexed rather than what comes down.
    const meta = parseLinkMeta((await response.text()).slice(0, META_BYTES));
    return isEmptyMeta(meta) ? null : meta;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One link. Returns whatever is already known immediately, and fetches once if
 * nothing is — so a row renders its host on the first frame and its title on
 * the one after, rather than rendering nothing while it waits.
 */
export function useLinkPreview(href: string | null): LinkRecord | null {
  const record = useLinkPreviews((state) => (href ? (state.byHref[href] ?? null) : null));
  const remember = useLinkPreviews((state) => state.remember);
  const fail = useLinkPreviews((state) => state.fail);

  useEffect(() => {
    if (!href || record || inFlight.has(href)) return;
    inFlight.add(href);
    void readMeta(href)
      .then((meta) => (meta ? remember(href, meta) : fail(href)))
      .finally(() => inFlight.delete(href));
  }, [href, record, remember, fail]);

  return record;
}
