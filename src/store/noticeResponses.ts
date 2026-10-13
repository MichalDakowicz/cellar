import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
type Response = { commandId: string; state: 'pending' | 'confirmed' | 'failed'; error?: string };
export const useNoticeResponses = create<{ responses: Record<string, Response>; set: (key: string, response: Response) => void }>()(
  persist((set) => ({ responses: {}, set: (key, response) => set((state) => ({ responses: { ...state.responses, [key]: response } })) }),
    { name: 'cellar-notice-responses', storage: createJSONStorage(() => mmkvStorage) }),
);
