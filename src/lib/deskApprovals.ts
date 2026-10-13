/** Runtime permission requests are host records, never inferred from a waiting run. */
export type ApprovalDecision = 'allow' | 'always' | 'deny';
export type RuntimeRequest = {
  id: string; runId: string; agent: 'claude' | 'codex';
  what: string; subject: string; effect: string; always: string | null;
  state: 'pending' | 'answering' | 'answered' | 'expired' | 'unknown';
  createdAt: number; decision?: ApprovalDecision; source?: 'phone' | 'pc'; error?: string;
};
export type ApprovalAnswer = { commandId: string; requestId: string; decision: ApprovalDecision; source: 'phone' | 'pc' };
export type ApprovalReceipt = {
  commandId: string; requestId: string; state: 'pending' | 'confirmed' | 'failed' | 'unknown';
  request: RuntimeRequest; error?: string;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function readRuntimeRequest(raw: unknown): RuntimeRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  return typeof row.id === 'string' && UUID.test(row.id) && typeof row.runId === 'string' && !!row.runId
    && ['claude', 'codex'].includes(String(row.agent))
    && ['what', 'subject', 'effect'].every((key) => typeof row[key] === 'string')
    && (row.always === null || typeof row.always === 'string')
    && ['pending', 'answering', 'answered', 'expired', 'unknown'].includes(String(row.state))
    && typeof row.createdAt === 'number' && Number.isFinite(row.createdAt)
    && (row.decision === undefined || ['allow', 'always', 'deny'].includes(String(row.decision)))
    && (row.source === undefined || ['phone', 'pc'].includes(String(row.source)))
    && (!['answering', 'answered'].includes(String(row.state)) || (row.decision !== undefined && row.source !== undefined))
    && (row.error === undefined || typeof row.error === 'string') ? row as RuntimeRequest : null;
}
export function readApprovalAnswer(raw: unknown): ApprovalAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as ApprovalAnswer;
  return typeof row.commandId === 'string' && UUID.test(row.commandId) && typeof row.requestId === 'string' && UUID.test(row.requestId)
    && ['allow', 'always', 'deny'].includes(row.decision) && ['phone', 'pc'].includes(row.source)
    ? { commandId: row.commandId, requestId: row.requestId, decision: row.decision, source: row.source } : null;
}
export function readApprovalReceipt(raw: unknown, answer: ApprovalAnswer): ApprovalReceipt {
  const row = raw as ApprovalReceipt | null;
  if (!row || row.commandId !== answer.commandId || row.requestId !== answer.requestId
    || !['pending', 'confirmed', 'failed', 'unknown'].includes(row.state)
    || !readRuntimeRequest(row.request) || row.request.id !== answer.requestId
    || (row.state === 'confirmed' && (row.request.state !== 'answered' || row.request.decision !== answer.decision || row.request.source !== answer.source))) {
    throw new Error('PC did not return a valid approval receipt.');
  }
  return row;
}
export function pendingApproval(row: RuntimeRequest): boolean { return row.state === 'pending' || row.state === 'answering'; }
export function approvalMessage(row: RuntimeRequest): string {
  if (row.state === 'answered') return `${row.decision === 'deny' ? 'Denied' : 'Allowed'} · decision confirmed by PC${row.source ? ` · from ${row.source}` : ''}`;
  if (row.state === 'answering') return 'Sending decision · awaiting PC confirmation';
  if (row.state === 'expired') return row.error ?? 'Request expired; the agent is no longer waiting for this answer.';
  if (row.state === 'unknown') return row.error ?? 'Decision outcome unknown; check the original receipt.';
  return 'Waiting for your decision';
}
