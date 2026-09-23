import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toggleCollapsed } from '@/lib/entryCollapse';
import { NO_FILTER, type EntryFilter } from '@/lib/entryGroups';
import type { KanbanAxis } from '@/lib/kanban';
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

export type ProjectView = 'grouped' | 'stream' | 'kanban';

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
  /** What the board's columns are cut by. Only read while `view` is kanban. */
  kanbanAxis: KanbanAxis;
  /** Many-lines capture mode, sticky because it is a mode you work in. */
  raw: boolean;
  /**
   * The project chips the capture screen last dropped into. Empty is the inbox;
   * more than one files the thought into each (`lib/fileTargets`).
   */
  lastProjectIds: string[];
  draftKind: Kind;
  inboxSort: InboxSort;
  /** Which shelf the figures cover. `null` is every shelf, and the inbox. */
  statsShelfId: string | null;
  setShelf: (shelfId: string | null) => void;
  setView: (view: ProjectView) => void;
  setKanbanAxis: (axis: KanbanAxis) => void;
  setRaw: (raw: boolean) => void;
  setLastProjects: (projectIds: string[]) => void;
  setDraftKind: (kind: Kind) => void;
  setInboxSort: (sort: InboxSort) => void;
  setStatsShelf: (shelfId: string | null) => void;
};

export const useCellarPrefs = create<PrefsState>()(
  persist(
    (set) => ({
      shelfId: null,
      view: 'grouped',
      kanbanAxis: 'state',
      raw: false,
      lastProjectIds: [],
      draftKind: 'idea',
      inboxSort: 'newest',
      statsShelfId: null,
      setShelf: (shelfId) => set({ shelfId }),
      setView: (view) => set({ view }),
      setKanbanAxis: (kanbanAxis) => set({ kanbanAxis }),
      setRaw: (raw) => set({ raw }),
      setLastProjects: (lastProjectIds) => set({ lastProjectIds }),
      setDraftKind: (draftKind) => set({ draftKind }),
      setInboxSort: (inboxSort) => set({ inboxSort }),
      setStatsShelf: (statsShelfId) => set({ statsShelfId }),
    }),
    {
      name: 'cellar-prefs',
      storage: createJSONStorage(() => mmkvStorage),
      version: 2,
      // v1 remembered one chip. Carried across as a set of one, so the update
      // does not quietly send the next thought to the inbox.
      migrate: (persisted, version) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version < 2) {
          const last = state.lastProjectId;
          state.lastProjectIds = typeof last === 'string' ? [last] : [];
          delete state.lastProjectId;
        }
        return state as unknown as PrefsState;
      },
    },
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
 * Which headings are folded away right now.
 *
 * Not persisted, and for the filter's reason: a band you folded three days ago
 * and cannot see is the fastest way to conclude the app has lost your entries.
 * It survives moving between screens within a session and nothing more.
 *
 * One set for the whole app rather than one per project, because the keys are
 * the band and the kind — `b:open`, `open:glitch` — and folding "done" away
 * means the same thing in every project you open.
 */
type CollapsedState = {
  collapsed: Set<string>;
  toggle: (key: string) => void;
  clear: () => void;
};

export const useCollapsedSections = create<CollapsedState>((set) => ({
  collapsed: new Set<string>(),
  toggle: (key) => set((state) => ({ collapsed: toggleCollapsed(state.collapsed, key) })),
  clear: () => set({ collapsed: new Set<string>() }),
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
  /** Files these entries into the project as it lands; empty just creates one. */
  newProject: ((entryIds: string[]) => void) | null;
  fileUnder: ((entryId: string) => void) | null;
  /** The same sheet for a held selection. One entry is `fileUnder`'s job. */
  fileMany: ((entryIds: string[]) => void) | null;
  inboxSort: (() => void) | null;
  statsScope: (() => void) | null;
  /** Rename, move or delete one project. */
  editProject: ((projectId: string) => void) | null;
  /** Rename or delete one shelf. */
  editShelf: ((shelfId: string) => void) | null;
  register: (handles: Partial<Omit<SheetHandles, 'register'>>) => void;
};

/**
 * A request to put the cursor in the capture field, rather than a handle that
 * does it.
 *
 * The web `n` shortcut fires from any route, and on every route but the home
 * one the capture screen is not mounted yet — a registered focus callback would
 * be null at the moment the key is pressed, or worse, stale. So the shortcut
 * navigates and leaves a flag, and the capture screen picks it up as it mounts.
 */
type CaptureFocusState = {
  pending: boolean;
  request: () => void;
  clear: () => void;
};

export const useCaptureFocus = create<CaptureFocusState>((set) => ({
  pending: false,
  request: () => set({ pending: true }),
  clear: () => set({ pending: false }),
}));

export const useCellarSheets = create<SheetHandles>((set) => ({
  filter: null,
  shelfPicker: null,
  newProject: null,
  fileUnder: null,
  fileMany: null,
  inboxSort: null,
  statsScope: null,
  editProject: null,
  editShelf: null,
  register: (handles) => set(handles),
}));
