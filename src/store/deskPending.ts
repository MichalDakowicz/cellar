import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DeskStart } from '@/lib/deskProtocol';
import { mmkvStorage } from '@/lib/mmkvStorage';

type Pending = { tasks: Record<string, DeskStart[]>; failed: Record<string, boolean>; put: (key: string, tasks: DeskStart[], failed?: boolean) => void };
/** Only confirmed starts leave this durable queue. Keys bind it to account and PC. */
export const useDeskPending = create<Pending>()(persist((set) => ({
  tasks: {}, failed: {},
  put: (key, tasks, failed = false) => set((state) => ({ tasks: { ...state.tasks, [key]: tasks }, failed: { ...state.failed, [key]: failed } })),
}), { name: 'cellar-desk-pending', storage: createJSONStorage(() => mmkvStorage) }));
