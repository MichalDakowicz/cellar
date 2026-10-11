import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EventSnapshot } from '@/lib/deskEvents';
import { mmkvStorage } from '@/lib/mmkvStorage';

type History = { snapshots: Record<string, EventSnapshot>; cursors: Record<string, { epoch: string; sequence: number }>;
  save: (key: string, snapshot: EventSnapshot) => void };
/** Account and PC identity form the storage key. History is never a live host result. */
export const useDeskHistory = create<History>()(persist((set) => ({
  snapshots: {}, cursors: {},
  save: (key, snapshot) => set((state) => {
    const cursors = { ...state.cursors, [key]: { epoch: snapshot.epoch, sequence: snapshot.sequence } };
    if (!snapshot.runId) return { cursors };
    const next = { ...state.snapshots, [`${key}:${snapshot.runId}`]: snapshot };
    const keep = Object.entries(next).sort(([, a], [, b]) => b.at - a.at).slice(0, 12);
    return { cursors, snapshots: Object.fromEntries(keep) };
  }),
}), { name: 'cellar-desk-history', storage: createJSONStorage(() => mmkvStorage) }));
