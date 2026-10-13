import { realpath } from 'node:fs/promises';
import type { KeySearchRequest } from '@/lib/deskKeySearch';
import { repoKey } from '@/lib/repoLink';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';

export async function keyScope(deps: HostDeps, request: KeySearchRequest) {
  const owner = deps.account.current?.userId;
  if (!owner) throw new DeskError('Sign in on the PC to search keys.', 409);
  const unchanged = () => { if (deps.account.current?.userId !== owner) throw new DeskError('Account changed during keys search.', 409); };
  const project = (await deps.account.commandProjects()).find((row) => row.projectId === request.projectId);
  unchanged();
  if (!project) throw new DeskError('Project is not linked to this account on the PC.', 403);
  const root = await realpath(project.path);
  let cwd = root;
  if (request.runId) {
    const run = deps.runs.ownedForSearch(request.runId, owner);
    if (!run || run.projectId !== request.projectId || run.agent !== request.agent) throw new DeskError('Run is not owned by this account/project/agent.', 403);
    cwd = await realpath(run.cwd);
    if (repoKey(cwd) !== repoKey(run.cwd)) throw new DeskError('Run folder was redirected.', 403);
    if (run.worktreeId) {
      if (!deps.worktrees) throw new DeskError('Worktree discovery unavailable.', 409);
      await deps.worktrees.searchPath(run.worktreeId, request.projectId, cwd);
    } else if (run.where !== 'main' || repoKey(root) !== repoKey(cwd)) throw new DeskError('Run has no validated project checkout.', 403);
  }
  unchanged();
  return { owner, root, cwd, unchanged };
}
