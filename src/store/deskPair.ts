import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DeskPair } from '@/lib/deskPair';
import { mmkvStorage } from '@/lib/mmkvStorage';

/**
 * The pc this phone is paired with, kept on the phone.
 *
 * On the device and never on the account: the key in it is the pc's LAN
 * secret, and a secret written to the cellar would be readable by every other
 * device and agent the account has. One pc — the common case — and pairing a
 * second one replaces the first.
 */
type DeskPairState = {
  pair: DeskPair | null;
  setPair: (pair: DeskPair) => void;
  forget: () => void;
  /** The pc said, through the cellar, that it is somewhere else on the LAN now. */
  moved: (id: string, host: string, port: number) => void;
};

export const useDeskPair = create<DeskPairState>()(
  persist(
    (set) => ({
      pair: null,
      setPair: (pair) => set({ pair }),
      forget: () => set({ pair: null }),
      moved: (id, host, port) =>
        set((state) =>
          state.pair && state.pair.id === id && (state.pair.host !== host || state.pair.port !== port)
            ? { pair: { ...state.pair, host, port } }
            : state,
        ),
    }),
    { name: 'cellar-desk-pair', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
