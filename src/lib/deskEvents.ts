import type { DeskLogLine, DeskRun } from './deskProtocol';
import { readDeskRuns } from './deskRunSnapshot';
import { readRuntimeRequest, type RuntimeRequest } from './deskApprovals';

export const TURN_KINDS = ['user_message', 'assistant_message', 'reasoning', 'command_execution', 'file_change', 'dynamic_tool', 'web_search', 'file_search', 'todo_list', 'proposed_plan', 'approval_request', 'user_input_request', 'subagent', 'checkpoint', 'error', 'compaction', 'handoff', 'legacy_output'] as const;
export type TurnKind = (typeof TURN_KINDS)[number];
export type TurnItem = {
  id: string; kind: TurnKind; text: string; status: 'running' | 'completed' | 'failed' | 'unknown';
  detail?: string; parts?: string[];
};
export type DeskEvent = { sequence: number; at: number; runId: string | null } & (
  { kind: 'catalog'; runs: DeskRun[] } | { kind: 'item'; item: TurnItem } | { kind: 'approvals'; approvals: RuntimeRequest[] }
);
export type EventSnapshot = { epoch: string; sequence: number; runs: DeskRun[]; runId: string | null; items: TurnItem[]; at: number; approvals?: RuntimeRequest[] };
export type StreamMessage = { type: 'snapshot'; snapshot: EventSnapshot }
  | { type: 'event'; event: DeskEvent }
  | { type: 'synchronized'; sequence: number }
  | { type: 'heartbeat'; at: number }
  | { type: 'error'; error: string };
export type StreamState = EventSnapshot & { phase: 'connecting' | 'live' | 'disconnected' | 'failed'; error: string | null };
export const EMPTY_STREAM: StreamState = { epoch: '', sequence: 0, runs: [], runId: null, items: [], at: 0, phase: 'connecting', error: null };

const object = (raw: unknown): Record<string, unknown> | null => raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null;
const sequence = (raw: unknown): raw is number => Number.isSafeInteger(raw) && (raw as number) >= 0;
export function readTurnItem(raw: unknown): TurnItem | null {
  const row = object(raw);
  if (!row || typeof row.id !== 'string' || !row.id || !TURN_KINDS.includes(row.kind as TurnKind)
    || typeof row.text !== 'string' || !['running', 'completed', 'failed', 'unknown'].includes(String(row.status))
    || (row.detail !== undefined && typeof row.detail !== 'string')
    || (row.parts !== undefined && (!Array.isArray(row.parts) || !row.parts.every((part) => typeof part === 'string') || row.parts.join('') !== row.text))) return null;
  return row as TurnItem;
}
export function readStreamMessage(raw: unknown): StreamMessage | null {
  const row = object(raw);
  if (!row) return null;
  if (row.type === 'error' && typeof row.error === 'string') return row as StreamMessage;
  if (row.type === 'heartbeat' && typeof row.at === 'number' && Number.isFinite(row.at)) return row as StreamMessage;
  if (row.type === 'synchronized' && sequence(row.sequence)) return row as StreamMessage;
  if (row.type === 'snapshot') {
    const snap = object(row.snapshot);
    if (!snap || typeof snap.epoch !== 'string' || !snap.epoch || !sequence(snap.sequence) || !readDeskRuns(snap.runs)
      || !(snap.runId === null || typeof snap.runId === 'string') || !Array.isArray(snap.items) || !snap.items.every(readTurnItem)
      || typeof snap.at !== 'number' || !Number.isFinite(snap.at)) return null;
    if (snap.approvals !== undefined && (!Array.isArray(snap.approvals) || !snap.approvals.every(readRuntimeRequest))) return null;
    return row as StreamMessage;
  }
  if (row.type === 'event') {
    const event = object(row.event);
    if (!event || !sequence(event.sequence) || event.sequence === 0 || typeof event.at !== 'number'
      || !(event.runId === null || typeof event.runId === 'string')) return null;
    if (event.kind === 'catalog' && readDeskRuns(event.runs)) return row as StreamMessage;
    if (event.kind === 'approvals' && Array.isArray(event.approvals) && event.approvals.every(readRuntimeRequest)) return row as StreamMessage;
    if (event.kind === 'item' && typeof event.runId === 'string' && readTurnItem(event.item)) return row as StreamMessage;
  }
  return null;
}
/** A snapshot is authoritative. Replay at/below its watermark is idempotent. */
export function reduceStream(state: StreamState, message: StreamMessage): StreamState {
  if (message.type === 'error') return { ...state, phase: 'failed', error: message.error };
  if (message.type === 'snapshot') return { ...message.snapshot, phase: 'connecting', error: null };
  if (message.type === 'heartbeat') return state.phase === 'live' ? { ...state, at: message.at } : state;
  if (message.type === 'synchronized') return state.phase === 'connecting' && !!state.epoch && message.sequence === state.sequence
    ? { ...state, phase: 'live', error: null } : { ...state, phase: 'failed', error: 'Event gap — reconnect to reload the PC snapshot.' };
  const event = message.event;
  if (event.sequence <= state.sequence) return state;
  if (event.sequence !== state.sequence + 1) return { ...state, phase: 'failed', error: 'Event gap — reconnect to reload the PC snapshot.' };
  if (event.kind === 'catalog') return { ...state, sequence: event.sequence, at: event.at, runs: event.runs };
  if (event.kind === 'approvals') return { ...state, sequence: event.sequence, at: event.at, approvals: event.approvals };
  const items = state.items.slice();
  if (event.runId === state.runId) {
    const index = items.findIndex((item) => item.id === event.item.id);
    if (index < 0) items.push(event.item); else items[index] = event.item;
  }
  return { ...state, items, sequence: event.sequence, at: event.at };
}
/** Never split fenced code, lists or tables mid-block. Oversized blocks remain intact. */
export function markdownChunks(text: string, target = 4000): string[] {
  const out: string[] = []; let chunk = ''; let fence: string | null = null;
  for (const line of text.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const mark = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (mark) { if (!fence) fence = mark; else if (mark[0] === fence[0] && mark.length >= fence.length) fence = null; }
    chunk += line;
    if (!fence && !line.trim() && chunk.length >= target) { out.push(chunk); chunk = ''; }
  }
  if (chunk) out.push(chunk);
  return out;
}
export function turnLines(items: readonly TurnItem[]): DeskLogLine[] {
  return items.map((item) => ({ who: item.kind === 'user_message' ? 'you' : item.kind === 'assistant_message' ? 'agent'
    : ['command_execution', 'file_change', 'dynamic_tool', 'web_search', 'file_search', 'todo_list', 'subagent'].includes(item.kind) ? 'tool' : 'system',
  text: `${item.text}${item.detail ? `\n${item.detail}` : ''}` }));
}
