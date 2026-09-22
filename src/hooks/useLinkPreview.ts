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

/**
 * Links whose cached failure has already been retried this launch.
 *
 * A failure is cached so that the login-walled half of a cellar is not refetched
 * forever — but caching it permanently means one slow morning marks a link dead
 * for good, which is the worse of the two mistakes. Once per launch is the
 * middle: a link that is genuinely unreachable costs one request a session.
 */
const retried = new Set<string>();

/**
 * Generous, because the alternative to waiting is caching a failure. Nothing is
 * blocked on it — the row already reads as its host while this runs.
 */
const TIMEOUT_MS = 15000;

async function readMeta(href: string): Promise<LinkMeta | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(href, {
      signal: controller.signal,
      headers: {
        accept: 'text/html',
        // No Range header, deliberately. Asking for the first 64KB looks like
        // the obvious saving and is the bug this feature shipped with: a
        // document's head is not near its front, and youtube.com puts its
        // `og:title` at byte 707,923. A host that honoured the range would
        // hand back a page with no title in it, which caches as a failure.
        //
        // Sites serve a different page to something that does not look like a
        // browser — a consent wall, or no open graph at all. This asks for the
        // page a person would see, which is the page the title belongs to.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      },
    });
    if (!response.ok) return null;

    const type = response.headers.get('content-type') ?? '';
    if (type && !type.includes('html')) return null;

    // The cap is a guard against something pathological, not a budget — the
    // parser bounds its own work to the head (`lib/linkMeta`).
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
    if (!href || inFlight.has(href)) return;
    // A known title is final. A known *failure* is worth one more try per
    // launch, because the usual reason for one is that the network was bad for
    // a moment rather than that the page does not exist.
    if (record && !(record.failedAt && !retried.has(href))) return;

    inFlight.add(href);
    retried.add(href);
    void readMeta(href)
      .then((meta) => (meta ? remember(href, meta) : fail(href)))
      .finally(() => inFlight.delete(href));
  }, [href, record, remember, fail]);

  return record;
}
