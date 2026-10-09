import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DeskAgent } from '@/lib/deskProtocol';
import { DEFAULT_MODE, type DeskMode } from '@/lib/deskTask';
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
  /** What a new task starts with (settings › desk › agents); per device. */
  defaultAgent: DeskAgent;
  setDefaultAgent: (agent: DeskAgent) => void;
  defaultMode: DeskMode;
  setDefaultMode: (mode: DeskMode) => void;
};

export const useDeskPrefs = create<DeskPrefsState>()(
  persist(
    (set) => ({
      sample: false,
      setSample: (sample) => set({ sample }),
      commandsProject: null,
      setCommandsProject: (commandsProject) => set({ commandsProject }),
      defaultAgent: 'claude',
      setDefaultAgent: (defaultAgent) => set({ defaultAgent }),
      defaultMode: DEFAULT_MODE,
      setDefaultMode: (defaultMode) => set({ defaultMode }),
    }),
    { name: 'cellar-desk-prefs', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
