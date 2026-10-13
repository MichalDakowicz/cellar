import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import type { CanUseTool, PermissionUpdate } from '@anthropic-ai/claude-agent-sdk';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import type { ManagedSession, TurnChanged } from './managedSession.ts';
import { ClaudeInput } from './claudeInput.ts';

/** Only exact session-scoped rule suggestions can be offered as a broader grant. */
export function sessionSuggestions(suggestions: PermissionUpdate[] = []): PermissionUpdate[] {
  return suggestions.filter((row) => row.destination === 'session' && row.type === 'addRules' && row.behavior === 'allow');
}
export function claudeCanUseTool(start: DeskStart, runId: string, owner: string, approvals: Approvals): CanUseTool {
  return async (toolName, input, options) => {
    if (toolName === 'AskUserQuestion') return { behavior: 'deny', message: 'Use Cellar entry questions for structured answers; native questions are not supported in this client yet.' };
    const suggestions = sessionSuggestions(options.suggestions);
    if (options.signal.aborted) return { behavior: 'deny', message: 'Request cancelled.' };
    return new Promise((resolve) => {
      let settled = false;
      const opened = approvals.open(owner, { runId, agent: 'claude', what: `use ${toolName}`,
        subject: JSON.stringify(input, null, 2), effect: start.cwd,
        always: suggestions.length ? `Allow these matching rules for this run: ${JSON.stringify(suggestions)}` : null }, async (choice) => {
          if (settled || options.signal.aborted) throw new Error('Claude cancelled this request before confirmation.');
          settled = true; options.signal.removeEventListener('abort', aborted);
          approvals.acknowledge(owner, opened.id);
          resolve(choice === 'deny' ? { behavior: 'deny', message: 'User denied this action in Cellar.' }
            : { behavior: 'allow', updatedInput: input, ...(choice === 'always' ? { updatedPermissions: suggestions } : {}) });
        });
      const aborted = () => {
        if (settled) return; settled = true;
        approvals.expire(owner, opened.id, 'Claude cancelled this request.');
        resolve({ behavior: 'deny', message: 'Request cancelled.' });
      };
      options.signal.addEventListener('abort', aborted, { once: true });
      if (options.signal.aborted) aborted();
    });
  };
}
export async function startClaudeSdk(path: string, start: DeskStart, runId: string, owner: string, approvals: Approvals,
  env: NodeJS.ProcessEnv, log: (row: unknown) => void, done: (code: number | null) => void, turnChanged: TurnChanged = () => {},
  injected?: { query: typeof import('@anthropic-ai/claude-agent-sdk').query; spawned?: Promise<void> }): Promise<ManagedSession> {
  const { query } = injected ?? await import('@anthropic-ai/claude-agent-sdk');
  const abortController = new AbortController(); let stopping = false; let busy = true; let finished = false;
  const input = new ClaudeInput(); input.push(start.prompt, start.commandId ?? randomUUID());
  const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  let process: ReturnType<typeof spawn> | null = null;
  let resolveSpawn!: () => void; let rejectSpawn!: (error: Error) => void;
  const spawned = new Promise<void>((resolve, reject) => { resolveSpawn = resolve; rejectSpawn = reject; });
  const session = query({ prompt: input, options: {
    cwd: start.cwd, env, pathToClaudeCodeExecutable: path, abortController, includePartialMessages: true,
    settingSources: ['user', 'project', 'local'],
    permissionMode: start.mode === 'full' ? 'bypassPermissions' : start.mode === 'edits' ? 'acceptEdits' : 'default',
    allowDangerouslySkipPermissions: start.mode === 'full', canUseTool: claudeCanUseTool(start, runId, owner, approvals),
    spawnClaudeCodeProcess: (options) => {
      const child = spawn(options.command, options.args, { cwd: options.cwd, env: options.env, signal: options.signal,
        windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
      process = child;
      child.once('spawn', resolveSpawn); child.once('error', rejectSpawn); return child;
    },
  } });
  const ended = (async () => {
    let code: number | null = null;
    try { for await (const message of session) {
      const echo = message as typeof message & { user_message_uuid?: string; user_message_uuids?: string[] };
      for (const id of echo.user_message_uuids ?? (echo.user_message_uuid ? [echo.user_message_uuid] : [])) pending.get(id)?.resolve();
      // Cellar records submitted text only after a provider echo; tool-result user rows remain intact.
      if (!(message.type === 'user' && typeof message.message.content === 'string')) log(message);
      if (message.type === 'result') { code = message.is_error ? 1 : 0; busy = false; approvals.expireRun(owner, runId); turnChanged(code); }
    } } catch (error) { rejectSpawn(error instanceof Error ? error : new Error(String(error))); log({ type: 'result', is_error: true, result: String(error) }); code = 1; }
    finally { finished = true; input.close(); for (const ack of pending.values()) ack.reject(new Error('Claude disconnected before confirming delivery.'));
      pending.clear(); approvals.expireRun(owner, runId); done(stopping ? null : code); }
  })();
  await (injected?.spawned ?? spawned);
  const close = async () => { input.close(); abortController.abort(); process?.kill(); session.close(); await ended; };
  const interrupt = async () => {
    if (!busy) return;
    await session.interrupt();
    const deadline = Date.now() + 10_000;
    while (busy && !finished && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    if (finished || busy) throw new Error('Claude has not confirmed interruption.');
  };
  return { busy: () => busy, close, interrupt,
    stop: async () => { stopping = true; await interrupt(); await close(); },
    send: async (text, id, displayText = text) => {
      if (finished || busy) throw new Error('Claude chat is unavailable or still busy.');
      busy = true; turnChanged(undefined);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Claude has not echoed this message; delivery is unknown.')); }, 20_000);
        pending.set(id, { resolve: () => { clearTimeout(timer); pending.delete(id); log({ type: 'cellar.message', id, text: displayText }); resolve(); },
          reject: (error) => { clearTimeout(timer); pending.delete(id); reject(error); } });
        try { input.push(text, id); } catch (error) { pending.get(id)?.reject(error as Error); }
      });
    } };
}
