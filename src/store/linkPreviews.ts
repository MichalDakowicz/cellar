import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { EMPTY_META, type LinkMeta } from '@/lib/linkMeta';
import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * What each link turned out to be, kept on the device.
 *
 * Persisted, unlike the other view state in this app, and for the opposite
 * reason: a title is a fact about the page rather than about where you are
 * standing, and re-fetching every link in a project on every cold start would
 * make a list of thoughts do network on scroll. A page whose title changed is
 * a thing the user will never notice; a list that flickers from url to title
 * on every launch is a thing they will notice every time.
 *
 * A failure is cached too. Most links in a cellar are to things behind a login
 * or to a host that will never answer, and retrying those forever is the same
 * cost as never caching at all. `failedAt` is kept so a retry is possible later
 * without making one now.
 */

export type LinkRecord = {
  meta: LinkMeta;
  fetchedAt: number;
  /** Set instead of `fetchedAt` when the page could not be read. */
  failedAt?: number;
};

type PreviewState = {
  byHref: Record<string, LinkRecord>;
  remember: (href: string, meta: LinkMeta) => void;
  fail: (href: string) => void;
};

export const useLinkPreviews = create<PreviewState>()(
  persist(
    (set) => ({
      byHref: {},
      remember: (href, meta) =>
        set((state) => ({ byHref: { ...state.byHref, [href]: { meta, fetchedAt: Date.now() } } })),
      fail: (href) =>
        set((state) => ({
          byHref: { ...state.byHref, [href]: { meta: EMPTY_META, fetchedAt: 0, failedAt: Date.now() } },
        })),
    }),
    {
      name: 'cellar-link-previews',
      storage: createJSONStorage(() => mmkvStorage),
      // 2 drops everything version 1 cached, once, on first launch after the
      // update. A consent wall is a 200 with real tags on it, so its title was
      // stored as a *success* — and a success is final here, never retried. The
      // links that oEmbed now reads correctly are exactly the links already
      // holding a confidently wrong answer, so without this the fix reaches
      // only pages nobody has opened yet.
      //
      // Dropping rather than migrating: there is nothing to carry over, and the
      // cost of a cold cache is one fetch per link, which is what the store
      // does on a new device anyway.
      version: 2,
      migrate: () => ({ byHref: {} }),
    },
  ),
);
