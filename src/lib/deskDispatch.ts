import type { DeskStart } from './deskProtocol';

export type RunControl = {
  commandId: string;
  action: 'send' | 'promote' | 'cancel' | 'edit' | 'stop' | 'stopAll';
  runId: string | null;
  itemId?: string;
  revision?: number;
  text?: string;
  scope?: 'host' | 'account';
  source: 'phone' | 'pc';
};
export type QueuedMessage = {
  id: string; runId: string; text: string; revision: number; createdAt: number;
  source: 'phone' | 'pc';
  settings: { agent: 'claude' | 'codex'; mode: NonNullable<DeskStart['mode']>; model: 'provider default'; effort: 'provider default' };
  state: 'queued' | 'dispatching' | 'delivered' | 'cancelled' | 'unknown';
  error?: string;
};
export type StopResult = { id: string; name: string; state: 'confirmed' | 'failed' | 'unknown'; error?: string };
export type HostStop = { id: string; name: string; commandId: string; state: 'pending' | 'confirmed' | 'failed' | 'unknown'; runs?: StopResult[]; error?: string };
export type ControlReceipt = {
  commandId: string; action: RunControl['action']; runId: string | null;
  state: 'pending' | 'confirmed' | 'failed' | 'unknown';
  item?: QueuedMessage; runs?: StopResult[]; hosts?: HostStop[]; error?: string;
};
export type RunQueue = { runId: string; available: boolean; busy: boolean; items: QueuedMessage[]; reason?: string };
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const RUN = /^(?:[a-f\d]{6,16}|j[a-f\d]{16})$/i;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';

/** Reject arbitrary provider settings/RPC at the shared boundary. */
export function readRunControl(raw: unknown): RunControl | null {
  if (!object(raw) || typeof raw.commandId !== 'string' || !UUID.test(raw.commandId)
    || !['send', 'promote', 'cancel', 'edit', 'stop', 'stopAll'].includes(String(raw.action))
    || !['phone', 'pc'].includes(String(raw.source))) return null;
  const action = raw.action as RunControl['action'];
  if (action === 'stopAll') {
    if (raw.runId !== null || !['host', 'account'].includes(String(raw.scope))) return null;
    return { commandId: raw.commandId, action, runId: null, scope: raw.scope as 'host' | 'account', source: raw.source as 'phone' | 'pc' };
  }
  if (typeof raw.runId !== 'string' || !RUN.test(raw.runId)) return null;
  const value: RunControl = { commandId: raw.commandId, action, runId: raw.runId, source: raw.source as 'phone' | 'pc' };
  if (action === 'send' || action === 'edit') {
    if (typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 8000) return null;
    value.text = raw.text.trim();
  }
  if (['edit', 'cancel', 'promote'].includes(action)) {
    if (typeof raw.itemId !== 'string' || !UUID.test(raw.itemId) || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 0) return null;
    value.itemId = raw.itemId; value.revision = Number(raw.revision);
  }
  return value;
}
export function readQueuedMessage(raw: unknown): QueuedMessage {
  if (!object(raw) || typeof raw.id !== 'string' || !UUID.test(raw.id) || typeof raw.runId !== 'string' || !RUN.test(raw.runId)
    || typeof raw.text !== 'string' || !raw.text.trim() || raw.text.length > 8000 || !Number.isSafeInteger(raw.revision) || Number(raw.revision) < 0
    || typeof raw.createdAt !== 'number' || !Number.isFinite(raw.createdAt) || !['phone', 'pc'].includes(String(raw.source))
    || !['queued', 'dispatching', 'delivered', 'cancelled', 'unknown'].includes(String(raw.state)) || !object(raw.settings)
    || !['claude', 'codex'].includes(String(raw.settings.agent)) || !['ask', 'edits', 'full'].includes(String(raw.settings.mode))
    || raw.settings.model !== 'provider default' || raw.settings.effort !== 'provider default'
    || (raw.error !== undefined && typeof raw.error !== 'string')) throw new Error('Invalid PC queue item.');
  return raw as QueuedMessage;
}
export function readControlReceipt(raw: unknown, request: RunControl): ControlReceipt {
  if (!object(raw) || raw.commandId !== request.commandId || raw.action !== request.action || raw.runId !== request.runId
    || !['pending', 'confirmed', 'failed', 'unknown'].includes(String(raw.state))
    || (raw.error !== undefined && typeof raw.error !== 'string')) throw new Error('Invalid PC control receipt.');
  if (raw.item !== undefined) {
    const item = readQueuedMessage(raw.item);
    if (item.runId !== request.runId || item.id !== (request.action === 'send' ? request.commandId : request.itemId)) throw new Error('PC receipt belongs to another message.');
    if (raw.state === 'confirmed' && ((request.action === 'cancel' && item.state !== 'cancelled')
      || (request.action === 'promote' && item.state !== 'delivered')
      || (['send', 'edit'].includes(request.action) && !['queued', 'delivered'].includes(item.state)))) throw new Error('PC has not confirmed this message action.');
  } else if (raw.state === 'confirmed' && ['send', 'promote', 'cancel', 'edit'].includes(request.action)) throw new Error('PC omitted the message result.');
  for (const list of [raw.runs, raw.hosts]) if (list !== undefined && (!Array.isArray(list) || list.some((row) => !object(row)
    || typeof row.id !== 'string' || typeof row.name !== 'string' || !['pending', 'confirmed', 'failed', 'unknown'].includes(String(row.state))))) throw new Error('Invalid PC stop results.');
  return raw as ControlReceipt;
}
export function readRunQueue(raw: unknown, runId: string): RunQueue {
  if (!object(raw) || raw.runId !== runId || typeof raw.available !== 'boolean' || typeof raw.busy !== 'boolean' || !Array.isArray(raw.items)) throw new Error('Invalid PC queue.');
  const items = raw.items.map(readQueuedMessage);
  if (items.some((item) => item.runId !== runId)) throw new Error('PC queue belongs to another run.');
  return { ...raw, items } as RunQueue;
}
export function controlMessage(receipt: ControlReceipt): string {
  if (receipt.action === 'stopAll') {
    if (!receipt.hosts?.length && receipt.state !== 'confirmed') return receipt.error ?? 'PC is reading hosts and confirming stops…';
    const hosts = receipt.hosts ?? [];
    const runs = receipt.runs ?? hosts.flatMap((host) => host.runs ?? []);
    return `${runs.filter((run) => run.state === 'confirmed').length} runs stopped · ${runs.filter((run) => run.state !== 'confirmed').length} unconfirmed/unsupported · ${hosts.filter((host) => host.state === 'pending').length} hosts pending${receipt.error ? ` · ${receipt.error}` : ''}`;
  }
  if (receipt.state !== 'confirmed') return receipt.error ?? (receipt.state === 'pending' ? 'PC is confirming this action…' : 'Outcome unknown; check the original receipt.');
  if (receipt.action === 'send') return receipt.item?.state === 'queued' ? 'Queued on PC · sends after this turn.' : 'Agent received your message · execution still pending.';
  if (receipt.action === 'promote') return 'Interruption confirmed · agent received this message.';
  if (receipt.action === 'edit') return 'PC saved this queued edit.';
  if (receipt.action === 'cancel') return 'PC cancelled this queued message.';
  if (receipt.action === 'stop') return 'PC confirmed this run stopped.';
  return 'PC confirmed the action.';
}
