export type ConversationPoint = { turns: number; anchor?: string; sessionId?: string };
export type DeskCheckpoint = { id: string; runId: string; at: number; point: ConversationPoint; label: string };
export type CheckpointReview = { checkpoint: DeskCheckpoint; token: string; diff: string; truncated: boolean };
export type CheckpointReceipt = { commandId: string; checkpointId: string; state: 'applied' | 'unknown'; error?: string };
export type CheckpointRequest = { runId: string; checkpointId: string; token: string; commandId: string };
