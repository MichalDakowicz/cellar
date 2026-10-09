import type { DeskAgent, DeskRunState, DeskStart } from '@/lib/deskProtocol';
import { runTitle } from '@/lib/deskProtocol';

/**
 * How each agent is started from the phone, as an argument list — never a
 * shell line. The prompt is free text from another device; handed to a shell it
 * would be a command, handed to `spawn` as one argv entry it is only ever a
 * prompt. The `--` before it is the same guard for the agent's own parser: a
 * prompt that starts with a dash is still a prompt.
 *
 * Permission mode is the decision on the cellar entry: auto, the same classifier
 * as a session at the desk. Each agent spells it differently and not every one
 * has it — the closest each one offers is written next to it.
 */

export type SpawnPlan = {
  agent: DeskAgent;
  args: string[];
  /**
   * `background` — the agent keeps the session itself (`claude --bg`), so it
   * outlives this app and shows in its own list. `own` — this app spawns it,
   * holds the log, and records the exit.
   */
  kind: 'background' | 'own';
};

export function spawnPlan(start: DeskStart): SpawnPlan {
  const title = runTitle(start);
  switch (start.agent) {
    case 'claude':
      // Never a model flag: haiku has no auto mode and silently drops to manual,
      // which on a background run is a session that stops at its first tool call.
      return {
        agent: 'claude',
        kind: 'background',
        args: ['--bg', '-n', title, '--permission-mode', 'auto', '--', start.prompt],
      };
    case 'codex':
      // --approve-for-me routes every approval through codex's own automatic
      // review inside the workspace-write sandbox: its version of auto.
      return {
        agent: 'codex',
        kind: 'own',
        args: ['exec', '--approve-for-me', '--color', 'never', '-C', start.cwd, '--', start.prompt],
      };
    case 'agy':
      // Antigravity has no classifier mode. accept-edits is the nearest: edits
      // go through, anything else it would ask about is not done unattended.
      return {
        agent: 'agy',
        kind: 'own',
        args: ['--print', '--mode', 'accept-edits', '--', start.prompt],
      };
  }
}

/** The line `claude --bg` prints: `backgrounded · 4a588420 · <name>`. */
export function backgroundId(stdout: string): string | null {
  return /backgrounded\s+\S+\s+([0-9a-f]{6,})/i.exec(stdout)?.[1] ?? null;
}

/** What `claude --bg` says when the folder was never opened in claude — worth its own sentence. */
export function untrustedFolder(output: string): boolean {
  return /workspace not trusted/i.test(output);
}

/** One row of `claude agents --json --all`. */
export type ClaudeAgentRow = {
  id?: string;
  pid?: number;
  cwd: string;
  kind: 'background' | 'interactive' | string;
  startedAt: number;
  sessionId: string;
  name?: string;
  status?: string;
  state?: string;
};

/**
 * Claude's two vocabularies — `state` for a background session, `status` for
 * an interactive one — onto the one the phone shows. An interactive session
 * sitting idle is a person's session waiting for that person.
 */
export function claudeRunState(row: Pick<ClaudeAgentRow, 'kind' | 'state' | 'status'>): DeskRunState {
  switch (row.state) {
    case 'done':
      return 'done';
    case 'failed':
      return 'failed';
    case 'blocked':
      return 'waiting';
    case 'stopped':
    case 'killed':
      return 'stopped';
    case 'running':
      return 'running';
  }
  if (row.status === 'busy') return 'running';
  if (row.kind === 'interactive') return 'waiting';
  return row.status === 'idle' ? 'done' : 'running';
}

/** `C:\ping\cellar` → `C--ping-cellar`, the folder claude keeps that directory's transcripts in. */
export function claudeProjectSlug(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]/g, '-');
}
