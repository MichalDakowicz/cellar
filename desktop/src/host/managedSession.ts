export type ManagedSession = {
  busy: () => boolean;
  send: (text: string, id: string, displayText?: string) => Promise<void>;
  interrupt: () => Promise<void>;
  stop: () => Promise<void>;
  close: () => Promise<void>;
};
export type TurnChanged = (code: number | null | undefined) => void;
