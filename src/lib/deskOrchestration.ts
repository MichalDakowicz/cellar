import { isDeskAgent, type DeskAgent, type DeskRun, type DeskStart, type DeskLogLine } from './deskProtocol';
import type { TurnItem } from './deskEvents';

export type OrchestrationRequest = { commandId: string; kind: 'race' | 'night' | 'group'; prompt: string; projectIds: string[]; agents: DeskAgent[]; mode: 'ask' | 'edits' | 'full'; startsAt?: number; endsAt?: number; maxRuns?: number; reservePercent?: number };
export type OrchestrationMember = { projectId: string; project: string; start: DeskStart; baseCommit: string; state: 'queued' | 'starting' | 'started' | 'failed' | 'unknown' | 'skipped'; runId?: string; error?: string; disposition?: 'kept' | 'tossed' };
export type Orchestration = { id: string; kind: OrchestrationRequest['kind']; prompt: string; createdAt: number; startsAt: number; endsAt: number | null; maxRuns: number; reservePercent: number; members: OrchestrationMember[]; stopped: boolean; picked?: string; retentionUntil?: number; note?: string };
export type MemberView = { projectId: string; project: string; agent: DeskAgent; baseCommit: string; run: DeskRun | null; state: string; error?: string; disposition?: 'kept' | 'tossed'; diff: string; summary: string; checks: string; usage: string; previews: number[] };
export type OrchestrationView = Omit<Orchestration, 'members'> & { members: MemberView[]; actions: { commandId: string; action: string; state: string; error?: string }[] };
export type OrchestrationAction = { commandId: string; id: string; action: 'pick' | 'keep' | 'toss' | 'stop' | 'follow'; runId?: string; text?: string };
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function orchestrationSummary(items: readonly TurnItem[], lines: readonly DeskLogLine[] = []): string {
  const messages = items.filter((item) => item.kind === 'assistant_message').map((item) => item.text);
  if (messages.length) return messages.slice(-2).join('\n\n').slice(-2000);
  return [...new Set(lines.filter((l) => l.who === 'agent').flatMap((line) => {
    if (!line.text.trimStart().startsWith('{')) return [line.text];
    try { const row = JSON.parse(line.text); return row.item?.type === 'agent_message' && typeof row.item.text === 'string' ? [row.item.text] : []; } catch { return []; }
  }))].slice(-2).join('\n\n').slice(-2000);
}
export function parseOrchestration(raw: unknown, now = Date.now()): OrchestrationRequest {
  const v = raw as OrchestrationRequest;
  if (!v || typeof v !== 'object' || !UUID.test(v.commandId ?? '') || !['race', 'night', 'group'].includes(v.kind)
    || typeof v.prompt !== 'string' || !v.prompt.trim() || v.prompt.length > 7000 || !Array.isArray(v.projectIds) || !v.projectIds.length || v.projectIds.length > 20 || new Set(v.projectIds).size !== v.projectIds.length || v.projectIds.some((id) => typeof id !== 'string' || !UUID.test(id))
    || !Array.isArray(v.agents) || v.agents.length !== (v.kind === 'race' ? 2 : 1) || v.agents.some((a) => !isDeskAgent(a)) || !['ask', 'edits', 'full'].includes(v.mode)) throw new Error('Choose a prompt, owned projects, agents and access mode.');
  if (v.kind === 'race' && v.projectIds.length !== 1) throw new Error('A race needs exactly one project.');
  if (v.kind === 'night' && (!Number.isSafeInteger(v.startsAt) || !Number.isSafeInteger(v.endsAt) || v.startsAt! < now - 60_000 || v.startsAt! > now + 7 * 86400_000 || v.endsAt! <= v.startsAt! || v.endsAt! - v.startsAt! > 12 * 3600_000 || v.mode !== 'ask'
    || !Number.isInteger(v.maxRuns) || v.maxRuns! < 1 || v.maxRuns! > 20 || !Number.isInteger(v.reservePercent) || v.reservePercent! < 10 || v.reservePercent! > 90)) throw new Error('Night shift needs a future window (up to 12h), ask-first mode, run cap and 10–90% morning reserve.');
  return { commandId: v.commandId, kind: v.kind, prompt: v.prompt.trim(), projectIds: [...v.projectIds], agents: [...v.agents], mode: v.mode,
    ...(v.kind === 'night' ? { startsAt: v.startsAt, endsAt: v.endsAt, maxRuns: v.maxRuns, reservePercent: v.reservePercent } : {}) };
}
