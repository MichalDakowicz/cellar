import { create } from 'zustand';
import type { DeskPair } from '@/lib/deskPair';

/** Browser uses the account mailbox. Never persist a phone's LAN HMAC key. */
export const useDeskPair = create<{
  pair: DeskPair | null; setPair: (pair: DeskPair) => void;
  forget: () => void; moved: (id: string, host: string, port: number) => void;
}>()(() => ({
  pair: null,
  setPair: () => { throw new Error('Pairing keys stay on the phone. This browser uses your account connection.'); },
  forget: () => {}, moved: () => {},
}));
