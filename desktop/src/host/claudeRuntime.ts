import { spawn } from 'node:child_process';
import type { CanUseTool, PermissionUpdate } from '@anthropic-ai/claude-agent-sdk';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import type { ManagedSession } from './codexRuntime.ts';

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
  env: NodeJS.ProcessEnv, log: (row: unknown) => void, done: (code: number | null) => void): Promise<ManagedSession> {
  const { query } = await import('@anthropic-ai/claude-agent-sdk');
  const abortController = new AbortController(); let stopping = false;
  let process: ReturnType<typeof spawn> | null = null;
  let resolveSpawn!: () => void; let rejectSpawn!: (error: Error) => void;
  const spawned = new Promise<void>((resolve, reject) => { resolveSpawn = resolve; rejectSpawn = reject; });
  const session = query({ prompt: start.prompt, options: {
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
      log(message);
      if (message.type === 'result') code = message.is_error ? 1 : 0;
    } } catch (error) { rejectSpawn(error instanceof Error ? error : new Error(String(error))); log({ type: 'result', is_error: true, result: String(error) }); code = 1; }
    finally { approvals.expireRun(owner, runId); done(stopping ? null : code); }
  })();
  await spawned;
  return { close: async () => { abortController.abort(); process?.kill(); await ended; },
    stop: async () => { stopping = true; await session.interrupt(); abortController.abort(); await ended; } };
}
