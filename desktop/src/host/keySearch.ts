import { parseKeySearch, type KeySearchResult } from '@/lib/deskKeySearch';
import { keySuggestions, type KeySources } from '@/lib/deskKeys';
import { keyScope } from './keyScope.ts';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { keyFiles } from './keyFiles.ts';
import { keySkills } from './keySkills.ts';
import { toolPath } from './tools.ts';

/** Account and selected project are checked before any local discovery. */
export async function searchKeys(deps: HostDeps, raw: unknown): Promise<KeySearchResult> {
  let request;
  try { request = parseKeySearch(raw); } catch { throw new DeskError('Invalid keys search scope.'); }
  const { cwd, unchanged } = await keyScope(deps, request);
  const sources: KeySources = { projects: [], entries: [], commands: [], files: [], skills: [] };
  let notice: string | null = null;
  if (request.key === '@') {
    if (!request.runId) return { suggestions: [], notice: 'Files require a selected run; its new worktree does not exist yet.' };
    const found = await keyFiles(cwd);
    sources.files = found.files; notice = found.notice;
  } else if (request.key === '/') {
    if (!(await toolPath(request.agent))) return { suggestions: [], notice: `${request.agent} is not installed on this PC.` };
    const found = await keySkills(request.agent, cwd);
    sources.skills = found.skills; notice = found.notice;
  } else {
    if (!deps.commands) return { suggestions: [], notice: 'Project commands unavailable on this host.' };
    const catalogue = (await deps.commands.list()).find((row) => row.id === request.projectId);
    sources.commands = catalogue?.commands.map((row) => row.id) ?? [];
    notice = catalogue?.error ?? null;
  }
  unchanged();
  await keyScope(deps, request);
  return { suggestions: keySuggestions({ ...request, start: 0, end: 0 }, sources), notice };
}
