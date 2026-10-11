import { join, relative } from 'node:path';
import type { DeskStart } from '@/lib/deskProtocol';
import { leadingCommand } from '@/lib/deskCommands';
import type { QueuedMessage } from '@/lib/deskDispatch';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';

/** A leading saved command runs at dispatch time in the chat's actual workspace. */
export async function dispatchCommand(deps: HostDeps, item: QueuedMessage, start: DeskStart): Promise<string> {
  const command = leadingCommand(item.text);
  if (!command) return item.text;
  if (!deps.commands || !deps.jobs || !start.projectId) throw new DeskError('Project commands unavailable for this chat.', 409);
  const plan = await deps.commands.plan(start.projectId, command);
  const gradle = plan.gradle ? join(start.cwd, relative(plan.cwd, plan.gradle)) : null;
  const job = await deps.jobs.start({ ...plan, cwd: start.cwd, gradle }, command, item.runId);
  return `${item.text}\n\n[Cellar: the saved $${command} command has already started as host job ${job.id} in ${start.cwd}. Do not execute it again. Its result is pending; read the job's host log for the actual outcome.]`;
}
