import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ApprovalAnswer } from '@/lib/deskApprovals';
import { mmkvStorage } from '@/lib/mmkvStorage';

type State = { pending: Record<string, ApprovalAnswer>; drafts: Record<string, string>;
  put: (key: string, answer: ApprovalAnswer | null) => void; draft: (key: string, text: string) => void };
/** Receipt identity and composer survive waiting, disconnect and a cold phone restart. */
export const useApprovalPending = create<State>()(persist((set) => ({
  pending: {}, drafts: {},
  put: (key, answer) => set((state) => {
    const pending = { ...state.pending }; if (answer) pending[key] = answer; else delete pending[key]; return { pending };
  }),
  draft: (key, text) => set((state) => { const drafts = { ...state.drafts }; if (text) drafts[key] = text; else delete drafts[key]; return { drafts }; }),
}), { name: 'desk-approvals', storage: createJSONStorage(() => mmkvStorage) }));
