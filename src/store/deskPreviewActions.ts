import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
import type { PreviewAction } from '@/lib/deskManagedPreview';

export const usePreviewActions = create<{ pending: Record<string, PreviewAction>; set: (key: string, action: PreviewAction | null) => void }>()(
  persist((set) => ({ pending: {}, set: (key, action) => set((state) => {
    const pending = { ...state.pending }; if (action) pending[key] = action; else delete pending[key]; return { pending };
  }) }), { name: 'cellar-preview-actions', storage: createJSONStorage(() => mmkvStorage) }),
);
