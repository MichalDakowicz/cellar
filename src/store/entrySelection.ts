import { create } from 'zustand';

import { toggleSelected } from '@/lib/entrySelection';

/**
 * Which thoughts are being held right now.
 *
 * Not persisted, and for the filter's reason (`store/cellarPrefs`): a selection
 * you made three days ago and cannot see is the fastest way to send an action
 * somewhere you did not mean it to go. It is also cleared whenever the screen
 * that started it goes away — see `features/cellar/useEntrySelection`.
 *
 * Select mode is not a flag. It is `ids.length > 0`, so unpicking the last row
 * leaves the mode on its own and there is no second piece of state that can
 * disagree with the first about whether the bar should be up.
 */
type SelectionState = {
  /** In the order they were picked — the order the copied line names them in. */
  ids: string[];
  toggle: (id: string) => void;
  clear: () => void;
};

export const useSelection = create<SelectionState>((set) => ({
  ids: [],
  toggle: (id) => set((state) => ({ ids: toggleSelected(state.ids, id) })),
  clear: () => set({ ids: [] }),
}));
