import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * The desk's device prefs.
 *
 * `sample` shows the sample desk (lib/deskSample) on the desk screens — how
 * pass 1 of docs/desk/TASKS.md is looked at before the pc reports any of it.
 * Per device and off by default: it is a way to see a screen, not a setting
 * anybody lives with.
 */
type DeskPrefsState = {
  sample: boolean;
  setSample: (sample: boolean) => void;
  /** The project whose `$` commands the desk's tiles show. */
  commandsProject: string | null;
  setCommandsProject: (id: string) => void;
};

export const useDeskPrefs = create<DeskPrefsState>()(
  persist(
    (set) => ({
      sample: false,
      setSample: (sample) => set({ sample }),
      commandsProject: null,
      setCommandsProject: (commandsProject) => set({ commandsProject }),
    }),
    { name: 'cellar-desk-prefs', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
