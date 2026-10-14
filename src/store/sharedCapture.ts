import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
export const useSharedCapture = create<{ pending: Record<string, string[]>; receive: (owner: string, text: string) => void; edit: (owner: string, text: string) => void; consume: (owner: string) => void }>()(persist((set) => ({
  edit: (owner, text) => set((s) => ({ pending: { ...s.pending, [owner]: s.pending[owner]?.length ? [text, ...s.pending[owner].slice(1)] : [] } })),
  pending: {}, receive: (owner, text) => set((s) => ({ pending: { ...s.pending, [owner]: [...(s.pending[owner] ?? []), text.slice(0, 8000)].slice(-10) } })),
  consume: (owner) => set((s) => ({ pending: { ...s.pending, [owner]: (s.pending[owner] ?? []).slice(1) } })),
}), { name: 'cellar-shared-drafts', version: 1, migrate: () => ({ pending: {} }), storage: createJSONStorage(() => mmkvStorage) }));
