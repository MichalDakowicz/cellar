import { realpathSync, statSync } from 'node:fs';
import type { DeskStart } from '@/lib/deskProtocol';
import { repoKey } from '@/lib/repoLink';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { toolPath } from './tools.ts';
import { repository } from './worktreeGit.ts';

/** Validate and reserve every attachment before starting any process. */
export async function startTask(deps: HostDeps, start: DeskStart, probe = toolPath) {
  const owner = deps.account.current?.userId;
  const refuse = (message: string): never => { throw new DeskError(message, 409, { notStarted: true }); };
  if (!owner || !start.commandId || !start.projectId || !start.mode || !start.where || !start.entryIds) refuse('Update the phone and select the complete task.');
  if (start.where === 'worktree' && !deps.worktrees) refuse('Update Cellar on the PC for worktrees; nothing started.');
  if (start.agent === 'agy' && start.mode !== 'edits') refuse('Antigravity currently supports edits ok only.');
  let projects;
  try { projects = await deps.account.commandProjects(); }
  catch (error) { refuse(`Project read failed before launch: ${error instanceof Error ? error.message : String(error)}`); }
  const project = projects!.find((row) => row.projectId === start.projectId);
  if (!project) refuse('This project has no folder in your signed-in Cellar.');
  let cwd: string;
  try {
    cwd = realpathSync.native(start.cwd);
    if (!statSync(cwd).isDirectory() || repoKey(cwd) !== repoKey(realpathSync.native(project!.path))) refuse('Task folder does not match the selected project.');
  } catch (error) {
    if (error instanceof DeskError) throw error;
    refuse('Project folder is unavailable on the PC.');
  }
  if (!(await probe(start.agent))) refuse(`${start.agent} is not installed on this PC.`);
  if (start.where === 'worktree') {
    try { await repository(cwd!); }
    catch (error) { refuse(`Worktree unavailable before launch: ${error instanceof Error ? error.message : String(error)}`); }
  }
  if (deps.account.current?.userId !== owner) refuse('Account changed; nothing started.');
  const launch = async () => {
    if (deps.account.current?.userId !== owner) refuse('Account changed before reservations.');
    await deps.account.claimTaskEntries(start);
    try {
      if (deps.account.current?.userId !== owner) refuse('Account changed before launch.');
      let workspace = null;
      if (start.where === 'worktree') {
        try { workspace = await deps.worktrees!.create(start); }
        catch (error) { refuse(`Worktree creation failed before agent launch: ${error instanceof Error ? error.message : String(error)}. Inspect the workspace at the PC before retrying.`); }
      }
      if (deps.account.current?.userId !== owner) refuse('Account changed before launch.');
      return await deps.runs.start({ ...start, cwd: workspace?.path ?? cwd!,
        ...(workspace ? { worktreeId: workspace.id, branch: workspace.branch } : {}) });
    } catch (error) {
      // Only proven pre-launch failures release reservations; uncertain launches retain them.
      if (error instanceof DeskError && error.extra.notStarted === true) await deps.account.releaseTaskEntries(start);
      throw error;
    }
  };
  return deps.worktrees ? deps.worktrees.exclusive(start.projectId!, launch) : launch();
}
