import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { parseKeySearch } from '@/lib/deskKeySearch';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { keyScope } from './keyScope.ts';
import { checkedKeyPath, keyFiles } from './keyFiles.ts';

/** Small text snippets only, from the same Git-visible owned source as @ search. */
export async function previewKey(deps: HostDeps, raw: unknown): Promise<{ text: string }> {
  let request;
  try { request = parseKeySearch(raw); } catch { throw new DeskError('Invalid file preview scope.'); }
  const extra = raw as { path?: unknown; line?: unknown };
  if (request.key !== '@' || !request.runId || typeof extra.path !== 'string' || typeof extra.line !== 'number'
    || !Number.isSafeInteger(extra.line) || extra.line < 1 || extra.line > 1_000_000) throw new DeskError('Select a file and valid line.');
  const scope = await keyScope(deps, request);
  const path = await checkedKeyPath(scope.cwd, extra.path);
  if (!path || !(await keyFiles(scope.cwd)).files.some((row) => row.path === extra.path && !row.path.endsWith('/'))) throw new DeskError('File is unavailable in this run’s worktree.', 403);
  const file = await open(path, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW));
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 256 * 1024) throw new DeskError('Preview unavailable for non-text or large files.', 409);
    const text = await file.readFile('utf8');
    if (text.includes('\0')) throw new DeskError('Binary file preview unavailable.', 409);
    scope.unchanged(); await keyScope(deps, request);
    if (await checkedKeyPath(scope.cwd, extra.path) !== path) throw new DeskError('File changed during preview; retry.', 409);
    const lines = text.split(/\r?\n/);
    if (extra.line > lines.length) return { text: `File has ${lines.length} lines; line ${extra.line} is outside it.` };
    const start = Math.max(0, extra.line - 3);
    return { text: lines.slice(start, start + 8).map((line, index) => `${start + index + 1}  ${line.slice(0, 400)}`).join('\n') };
  } finally { await file.close(); }
}
