import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/mmkvStorage';
import { randomUUID } from 'expo-crypto';
import { sharedDraft, editSharedDraft, submitSharedDraft, migrateSharedDrafts, type SharedDraft } from '@/lib/sharedDraft';
type State = { pending: Record<string, SharedDraft[]>; receive: (owner: string, text: string) => void; edit: (owner: string, patch: Parameters<typeof editSharedDraft>[1]) => void; submit: (owner: string) => SharedDraft; consume: (owner: string, id: string) => void };
export const useSharedCapture = create<State>()(persist((set, get) => ({
  edit: (owner, patch) => set((s) => ({ pending: { ...s.pending, [owner]: (s.pending[owner] ?? []).map((draft, i) => i ? draft : editSharedDraft(draft, patch)) } })),
  pending: {}, receive: (owner, text) => set((s) => ({ pending: { ...s.pending, [owner]: [...(s.pending[owner] ?? []), sharedDraft(randomUUID(), text)].slice(0, 10) } })),
  submit: (owner) => { const draft = get().pending[owner]?.[0]; if (!draft) throw new Error('Shared draft unavailable.'); const next = submitSharedDraft(draft); set((s) => ({ pending: { ...s.pending, [owner]: [next, ...s.pending[owner].slice(1)] } })); return next; },
  consume: (owner, id) => set((s) => ({ pending: { ...s.pending, [owner]: (s.pending[owner] ?? []).filter((d) => d.id !== id) } })),
}), { name: 'cellar-shared-drafts', version: 2, migrate: (raw, version) => migrateSharedDrafts(raw, version, randomUUID), storage: createJSONStorage(() => mmkvStorage) }));
