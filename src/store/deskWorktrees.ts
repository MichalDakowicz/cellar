import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WorktreeRequest } from '@/lib/deskWorktrees';
import { mmkvStorage } from '@/lib/mmkvStorage';

type State = { pending: Record<string, WorktreeRequest>; put: (key: string, request: WorktreeRequest | null) => void };
/** A lost reply survives restart and binds recovery to the same account, PC and worktree. */
export const useWorktreePending = create<State>()(persist((set) => ({
  pending: {},
  put: (key, request) => set((state) => {
    const pending = { ...state.pending };
    if (request) pending[key] = request; else delete pending[key];
    return { pending };
  }),
}), { name: 'cellar-worktree-pending', storage: createJSONStorage(() => mmkvStorage) }));
