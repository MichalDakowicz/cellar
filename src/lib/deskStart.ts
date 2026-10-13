import type { DeskAgent, DeskStart } from '@/lib/deskProtocol';
import { DESK_AGENTS } from '@/lib/deskProtocol';
import { normalizeRepoPath } from '@/lib/repoLink';

/**
 * A start built from the thing you pressed it on — the same line "copy a
 * prompt" puts on the clipboard, run in the folder the project lives in.
 *
 * The folder is the project's `repo_path` and nothing else. The pc refuses any
 * folder that is not a project's, so a project without one cannot be started
 * on the pc at all, and the control says so rather than failing on the far end.
 */
export function deskStartFrom(input: {
  prompt: string;
  repoPath: string | null | undefined;
  entryId?: string | null;
  agent: DeskAgent;
}): { ok: true; start: DeskStart } | { ok: false; reason: string } {
  const cwd = normalizeRepoPath(input.repoPath);
  if (!cwd) return { ok: false, reason: 'this project has no folder on the pc — set where it lives first' };
  return {
    ok: true,
    start: { agent: input.agent, prompt: input.prompt, cwd, name: null, entryId: input.entryId ?? null },
  };
}

/**
 * The agents to offer: the ones the pc says it has, in the protocol's order,
 * or all of them when it has not said — a refusal from the pc is a better
 * answer than a guess that hides one.
 */
export function offeredAgents(installed: readonly DeskAgent[] | null): DeskAgent[] {
  const all = DESK_AGENTS.map((agent) => agent.id);
  if (!installed || installed.length === 0) return all;
  return all.filter((agent) => installed.includes(agent));
}
