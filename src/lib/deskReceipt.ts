import type { DeskRun } from './deskProtocol';

export type DeskReceipt = {
  commandId: string;
  state: 'pending' | 'confirmed' | 'failed' | 'unknown';
  run?: DeskRun;
  error?: string;
  untrusted?: string;
};
