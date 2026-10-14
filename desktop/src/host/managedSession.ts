export type ManagedSession = {
  point?: () => import('@/lib/deskCheckpoints').ConversationPoint;
  rollback?: (point: import('@/lib/deskCheckpoints').ConversationPoint) => Promise<void>;
  restore?: (point: import('@/lib/deskCheckpoints').ConversationPoint, files: () => Promise<void>) => Promise<void>;
  usage?: () => Promise<unknown>;
  compact?: () => Promise<void>;
  busy: () => boolean;
  send: (text: string, id: string, displayText?: string) => Promise<void>;
  interrupt: () => Promise<void>;
  stop: () => Promise<void>;
  close: () => Promise<void>;
};
export type TurnChanged = (code: number | null | undefined, maintenance?: boolean) => void;
