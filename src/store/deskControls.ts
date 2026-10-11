import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ControlReceipt, RunControl } from '@/lib/deskDispatch';
import { mmkvStorage } from '@/lib/mmkvStorage';

type SavedControl = { request: RunControl; receipt?: ControlReceipt };
type State = {
  controls: Record<string, SavedControl>;
  save: (key: string, request: RunControl, receipt?: ControlReceipt) => void;
  clear: (key: string) => void;
};
/** Persist before sending. Recover the same request after a lost reply or cold launch. */
export const useDeskControls = create<State>()(persist((set) => ({
  controls: {},
  save: (key, request, receipt) => set((state) => ({ controls: { ...state.controls, [key]: { request, receipt } } })),
  clear: (key) => set((state) => { const controls = { ...state.controls }; delete controls[key]; return { controls }; }),
}), { name: 'desk-controls-v1', storage: createJSONStorage(() => mmkvStorage), partialize: (state) => ({ controls: state.controls }) }));
