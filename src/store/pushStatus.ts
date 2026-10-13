import { create } from 'zustand';
export const usePushStatus = create<{ state: 'off' | 'registering' | 'ready' | 'failed'; error: string | null; set: (state: 'off' | 'registering' | 'ready' | 'failed', error?: string | null) => void }>((set) => ({ state: 'off', error: null, set: (state, error = null) => set({ state, error }) }));
