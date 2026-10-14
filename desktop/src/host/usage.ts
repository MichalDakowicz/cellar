import { providerUsage } from '@/lib/deskUsage';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
export async function runUsage(deps: HostDeps, runId: string, compact = false) {
  const owner = deps.account.current?.userId;
  const value = owner && deps.runs.runtime?.get(owner, runId);
  if (!value) throw new DeskError('Usage requires a connected provider session owned by this account.', 409);
  if (compact) { if (!value.session.compact || value.session.busy() || deps.controls?.queue(runId).items.length) throw new DeskError('Wait for an idle connected run with an empty queue.', 409); await value.session.compact(); return { requested: true }; }
  if (!value.session.usage) throw new DeskError('Provider does not report usage.', 409);
  const usage = providerUsage(runId, await value.session.usage());
  if (deps.account.current?.userId !== owner) throw new DeskError('Account changed during usage read.', 409);
  return usage;
}
