import type { ApprovalDecision } from '@/lib/deskApprovals';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import { CodexRpc, type RpcRow } from './codexRpc.ts';
import { codexLogItem, codexPermissionRequest } from './codexApprovals.ts';
import type { ManagedSession, TurnChanged } from './managedSession.ts';
import { stopJobProcess } from './jobProcess.ts';
import { DeskError } from './claudeRuns.ts';

export type { ManagedSession } from './managedSession.ts';
export async function startCodex(path: string, start: DeskStart, runId: string, owner: string, approvals: Approvals,
  env: NodeJS.ProcessEnv, log: (row: unknown) => void, done: (code: number | null) => void, turnChanged: TurnChanged = () => {}): Promise<ManagedSession> {
  const items = new Map<string, any>(); const waiting = new Map<string | number, { id: string; resolve?: () => void; reject?: (error: Error) => void }>();
  let threadId = ''; let turnId = ''; let finished = false; let busy = true; let restarting = false; let turns = 0;
  let tokenUsage: unknown = null; const turnIds: string[] = [];
  const finish = (code: number | null) => {
    if (finished) return; finished = true;
    approvals.expireRun(owner, runId);
    for (const reply of waiting.values()) reply.reject?.(new Error('Provider disconnected before confirming the decision.'));
    waiting.clear(); done(code);
  };
  const receive = (row: RpcRow) => {
    const p = row.params ?? {};
    if (row.method === 'thread/tokenUsage/updated' && p.threadId === threadId) tokenUsage = p.tokenUsage;
    if (row.method === 'thread/compacted' && p.threadId === threadId) { busy = false; tokenUsage = null; turnChanged(0, true); }
    if (row.method && row.id !== undefined) {
      const spec = codexPermissionRequest(row, start.cwd);
      if (!spec || p.threadId !== threadId) { void rpc.send({ id: row.id, error: { code: -32601, message: 'Unsupported runtime request; use Cellar entry questions for structured answers.' } }); return; }
      if (row.method === 'item/fileChange/requestApproval') {
        const changes = items.get(p.itemId)?.changes;
        if (Array.isArray(changes) && changes.length) spec.subject = JSON.stringify(changes, null, 2);
      }
      const providerId = row.id;
      const opened = approvals.open(owner, { runId, agent: 'codex', what: spec.what, subject: spec.subject, effect: spec.effect, always: spec.always },
        async (choice: ApprovalDecision) => {
          const reply = waiting.get(providerId);
          if (!reply) throw new Error('Codex no longer waits for this request.');
          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Codex has not confirmed the decision.')), 20_000);
            reply.resolve = () => { clearTimeout(timer); resolve(); }; reply.reject = (error) => { clearTimeout(timer); reject(error); };
            void rpc.send({ id: providerId, result: spec.response(choice) }).catch(reply.reject);
          });
        });
      waiting.set(providerId, { id: opened.id }); return;
    }
    if (row.method === 'serverRequest/resolved') {
      const reply = waiting.get(p.requestId);
      if (reply?.resolve) { approvals.acknowledge(owner, reply.id); reply.resolve(); } else if (reply) approvals.expire(owner, reply.id);
      waiting.delete(p.requestId); return;
    }
    if (row.method === 'turn/started') { turnId = p.turn?.id ?? turnId; busy = true; turnChanged(undefined); }
    if (row.method === 'item/started' || row.method === 'item/completed') {
      const raw = p.item; if (!raw?.id) return;
      items.set(raw.id, raw); log({ type: row.method === 'item/completed' ? 'item.completed' : 'item.started', item: codexLogItem(raw) });
    }
    if (row.method?.startsWith('item/') && typeof p.delta === 'string') {
      const raw = items.get(p.itemId); if (!raw) return;
      if (row.method === 'item/agentMessage/delta') raw.text = (raw.text ?? '') + p.delta;
      if (row.method === 'item/commandExecution/outputDelta') raw.aggregatedOutput = (raw.aggregatedOutput ?? '') + p.delta;
      log({ type: 'item.updated', item: codexLogItem(raw) });
    }
    if (row.method === 'error') log({ type: 'error', error: p.error });
    if (row.method === 'turn/completed') {
      const status = p.turn?.status;
      if (status === 'failed') log({ type: 'turn.failed', error: p.turn.error });
      // Resolved notifications normally precede completion; an unresolved response stays unknown.
      busy = false; turns++; turnIds.push(p.turn?.id ?? turnId);
      approvals.expireRun(owner, runId);
      turnChanged(status === 'completed' ? 0 : status === 'interrupted' ? null : 1);
    }
  };
  let rpc!: CodexRpc; let closed!: Promise<void>;
  const connect = async (resume?: string) => {
    rpc = new CodexRpc(path, start.cwd, env, receive, (text) => log({ type: 'diagnostic', message: text }));
    closed = new Promise<void>((resolve) => rpc.child.once('close', () => resolve()));
    rpc.child.on('exit', () => { if (!restarting) finish(null); });
    await rpc.call('initialize', { clientInfo: { name: 'cellar', title: 'Cellar', version: '1.12.0' }, capabilities: { experimentalApi: true } });
    await rpc.send({ method: 'initialized', params: {} });
    const approvalPolicy = start.mode === 'full' ? 'never' : start.mode === 'ask' ? 'untrusted' : 'on-request';
    const sandbox = start.mode === 'full' ? 'danger-full-access' : start.mode === 'ask' ? 'read-only' : 'workspace-write';
    const result = await rpc.call(resume ? 'thread/resume' : 'thread/start', { ...(resume ? { threadId: resume } : {}), cwd: start.cwd, approvalPolicy, approvalsReviewer: 'user', sandbox });
    if (resume && result.thread.id !== resume) throw new Error('Codex resumed a different conversation; nothing dispatched.');
    threadId = result.thread.id;
  };
  const close = async () => {
    await stopJobProcess(rpc.child); await closed; finish(null);
  };
  let turnAttempted = false;
  try {
    await connect();
    const approvalPolicy = start.mode === 'full' ? 'never' : start.mode === 'ask' ? 'untrusted' : 'on-request';
    turnAttempted = true;
    const turn = await rpc.call('turn/start', { threadId, input: [{ type: 'text', text: start.prompt }], approvalPolicy, approvalsReviewer: 'user' });
    turnId = turn.turn.id;
  } catch (error) { await close(); if (!turnAttempted) throw new DeskError(`Codex failed before starting a turn: ${String(error)}`, 409, { notStarted: true }); throw error; }
  const interrupt = async (resume = true) => {
    if (!busy) return;
    await rpc.call('turn/interrupt', { threadId, turnId });
    const deadline = Date.now() + 10_000;
    while (busy && !finished && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    if (finished || busy) throw new Error('Codex has not confirmed interruption.');
    // Codex 0.162 can leave command children alive after turn/completed(interrupted).
    // Its protocol lacks T3's newer backgroundTerminals/terminate. Contain the private
    // provider process tree, then reload the same persisted thread without starting a turn.
    restarting = true;
    try {
      await stopJobProcess(rpc.child); await closed;
      for (const item of items.values()) if (item.type === 'commandExecution' && item.status === 'inProgress') {
        item.status = 'interrupted'; item.aggregatedOutput = `${item.aggregatedOutput ?? ''}\nInterrupted by Cellar; provider process tree stopped.`;
        log({ type: 'item.completed', item: codexLogItem(item) });
      }
      if (resume) await connect(threadId);
    }
    catch (error) { restarting = false; await close(); throw error; }
    finally { restarting = false; }
  };
  return { busy: () => busy, close, interrupt: () => interrupt(), stop: async () => { await interrupt(false); await close(); },
    point: () => ({ turns, sessionId: threadId, ...(turnIds.at(-1) ? { anchor: turnIds.at(-1) } : {}) }),
    rollback: async (point) => {
      if (busy || finished || point.turns > turns || (point.turns && !point.anchor)) throw new Error('Codex checkpoint conversation unavailable.');
      const approvalPolicy = start.mode === 'full' ? 'never' : start.mode === 'ask' ? 'untrusted' : 'on-request';
      const sandbox = start.mode === 'full' ? 'danger-full-access' : start.mode === 'ask' ? 'read-only' : 'workspace-write';
      // Installed 0.162.1 removed thread/rollback. Fork through an exact completed turn instead.
      const reply = await rpc.call(point.turns ? 'thread/fork' : 'thread/start', { ...(point.turns ? { threadId: point.sessionId ?? threadId, lastTurnId: point.anchor, deferGoalContinuation: true } : {}), cwd: start.cwd, approvalPolicy, approvalsReviewer: 'user', sandbox });
      if (!reply.thread?.id || reply.thread.id === threadId) throw new Error('Codex did not confirm a new conversation at the checkpoint.');
      threadId = reply.thread.id; turns = point.turns; turnIds.length = 0; if (point.anchor) turnIds.push(point.anchor); tokenUsage = null;
    },
    usage: async () => ({ agent: 'codex', context: tokenUsage, limits: await rpc.call('account/rateLimits/read', {}).catch(() => null) }),
    compact: async () => { if (busy || finished) throw new Error('Wait for an idle Codex run.'); busy = true; try { await rpc.call('thread/compact/start', { threadId }); } catch (e) { busy = false; throw e; } },
    send: async (text, id, displayText = text) => {
      if (finished || busy) throw new Error('Codex chat is unavailable or still busy.');
      busy = true; turnChanged(undefined);
      const result = await rpc.call('turn/start', { threadId, input: [{ type: 'text', text }] });
      turnId = result.turn.id;
      log({ type: 'cellar.message', id, text: displayText });
    } };
}
