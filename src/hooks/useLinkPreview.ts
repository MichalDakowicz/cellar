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
        // Everything worth reading is in the head. A host that honours this
        // sends 65KB instead of the 1.7MB a video page weighs, which is the
        // difference between resolving and timing out on a phone; one that
        // ignores it answers 200 with the lot and still works.
        range: `bytes=0-${META_BYTES - 1}`,
        // Sites serve a different page to something that does not look like a
        // browser — a consent wall, or no open graph at all. This asks for the
        // page a person would see, which is the page the title belongs to.
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      },
    });
    // 206 is the ranged read succeeding, and it is the good case.
    if (!response.ok && response.status !== 206) return null;

    const type = response.headers.get('content-type') ?? '';
    if (type && !type.includes('html')) return null;

    // Cut again after the fact: react-native's fetch has no streaming reader,
    // so a host that ignored the range still hands over the whole page.
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
