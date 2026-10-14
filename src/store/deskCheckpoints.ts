import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
import type { CheckpointRequest } from '@/lib/deskCheckpoints';

export const useCheckpointRequests = create<{ pending: Record<string, CheckpointRequest>; put: (key: string, request: CheckpointRequest | null) => void }>()(
  persist((set) => ({ pending: {}, put: (key, request) => set((state) => {
    const pending = { ...state.pending }; if (request) pending[key] = request; else delete pending[key]; return { pending };
  }) }), { name: 'cellar-checkpoint-requests', storage: createJSONStorage(() => mmkvStorage) }),
);
