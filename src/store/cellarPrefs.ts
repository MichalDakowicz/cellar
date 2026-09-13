import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { NO_FILTER, type EntryFilter } from '@/lib/entryGroups';
import { mmkvStorage } from '@/lib/mmkvStorage';
import type { Kind } from '@/types/cellar';

/**
 * How you are looking at the cellar right now.
 *
 * All of it is a UI preference, so it lives in MMKV rather than on the account:
 * which shelf you are standing in front of is not a fact about you, and it
 * should survive a cold start without a round trip.
 *
 * The filter is **not** persisted across launches. A filter you set three days
 * ago and cannot see is the fastest way to conclude the app has lost your
 * entries — so it resets to NO_FILTER on every start, and the left island wears
 * a dot whenever it is on.
 */

export type ProjectView = 'grouped' | 'stream';

/** How the unfiled pile is stacked. The inbox's left-island action. */
export type InboxSort = 'newest' | 'oldest' | 'kind';

export const INBOX_SORTS: { value: InboxSort; label: string }[] = [
  { value: 'newest', label: 'newest first' },
  { value: 'oldest', label: 'oldest first' },
  { value: 'kind', label: 'grouped by kind' },
];

type PrefsState = {
  /** `null` until the first shelf loads, then the shelf you were last in. */
  shelfId: string | null;
  view: ProjectView;
  /** Many-lines capture mode, sticky because it is a mode you work in. */
  raw: boolean;
  /** The project chip the capture screen last dropped into. */
  lastProjectId: string | null;
  draftKind: Kind;
  inboxSort: InboxSort;
  /** Which shelf the figures cover. `null` is every shelf, and the inbox. */
  statsShelfId: string | null;
  setShelf: (shelfId: string | null) => void;
  setView: (view: ProjectView) => void;
  setRaw: (raw: boolean) => void;
  setLastProject: (projectId: string | null) => void;
  setDraftKind: (kind: Kind) => void;
  setInboxSort: (sort: InboxSort) => void;
  setStatsShelf: (shelfId: string | null) => void;
};

export const useCellarPrefs = create<PrefsState>()(
  persist(
    (set) => ({
      shelfId: null,
      view: 'grouped',
      raw: false,
      lastProjectId: null,
      draftKind: 'idea',
      inboxSort: 'newest',
      statsShelfId: null,
      setShelf: (shelfId) => set({ shelfId }),
      setView: (view) => set({ view }),
      setRaw: (raw) => set({ raw }),
      setLastProject: (lastProjectId) => set({ lastProjectId }),
      setDraftKind: (draftKind) => set({ draftKind }),
      setInboxSort: (inboxSort) => set({ inboxSort }),
      setStatsShelf: (statsShelfId) => set({ statsShelfId }),
    }),
    { name: 'cellar-prefs', storage: createJSONStorage(() => mmkvStorage), version: 1 },
  ),
);

type FilterState = {
  filter: EntryFilter;
  setFilter: (filter: EntryFilter) => void;
  toggleKind: (kind: Kind) => void;
  clear: () => void;
};

export const useEntryFilter = create<FilterState>((set) => ({
  filter: NO_FILTER,
  setFilter: (filter) => set({ filter }),
  toggleKind: (kind) =>
    set((state) => ({
      filter: {
        ...state.filter,
        kinds: state.filter.kinds.includes(kind)
          ? state.filter.kinds.filter((k) => k !== kind)
          : [...state.filter.kinds, kind],
      },
    })),
  clear: () => set({ filter: NO_FILTER }),
}));

/**
 * The globally-mounted sheets register their openers here, so the nav island's
 * left action, a row's button and a screen's own control all open the *same*
 * instance rather than three copies fighting over the same modal slot
 * (PING.md §9.8).
 */
type SheetHandles = {
  filter: (() => void) | null;
  shelfPicker: (() => void) | null;
  /** `entryId` files an existing entry; `null` just creates a project. */
  newProject: ((entryId: string | null) => void) | null;
  fileUnder: ((entryId: string) => void) | null;
  inboxSort: (() => void) | null;
  statsScope: (() => void) | null;
  register: (handles: Partial<Omit<SheetHandles, 'register'>>) => void;
};

export const useCellarSheets = create<SheetHandles>((set) => ({
  filter: null,
  shelfPicker: null,
  newProject: null,
  fileUnder: null,
  inboxSort: null,
  statsScope: null,
  register: (handles) => set(handles),
}));
