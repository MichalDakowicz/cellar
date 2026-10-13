import { create } from 'zustand';

/**
 * Words handed from the desktop's capture bar to the new task screen
 * (shift+enter, `DeskHome.dc.html`).
 *
 * In memory and never persisted, and not a route param: a half-formed task in
 * the address bar would sit in the browser's history long after it was sent.
 * The new task screen reads it once and clears it.
 */
type DeskHandoffState = {
  text: string;
  hand: (text: string) => void;
  clear: () => void;
};

export const useDeskHandoff = create<DeskHandoffState>()((set) => ({
  text: '',
  hand: (text) => set({ text }),
  clear: () => set({ text: '' }),
}));
