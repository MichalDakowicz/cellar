import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { basename, isAbsolute, relative } from 'node:path';
import { documentType, DOCUMENT_MEDIA_MAX, DOCUMENT_TEXT_MAX, type DeskDocument, type DocumentRequest } from '@/lib/deskDocuments';
import { parseKeySearch } from '@/lib/deskKeySearch';
import type { HostDeps } from './api.ts';
import { keyScope } from './keyScope.ts';
import { checkedKeyPath } from './keyFiles.ts';
import { git } from './worktreeGit.ts';
import { DeskError } from './claudeRuns.ts';

/** Read owned Git-visible files only. No URL fetch, macro evaluation or arbitrary filesystem access. */
export async function readHostDocument(deps: HostDeps, raw: unknown): Promise<DeskDocument> {
  const v = raw as DocumentRequest;
  if (!v || typeof v.path !== 'string' || v.path.length > 2048) throw new DeskError('Choose a file in an owned project.');
  let request;
  try { request = parseKeySearch({ key: '@', query: '', agent: v.agent ?? 'codex', projectId: v.projectId, runId: v.runId }); }
  catch { throw new DeskError('Invalid document scope.'); }
  const scope = await keyScope(deps, request);
  const ref = v.path.replace(/\\/g, '/');
  const path = (isAbsolute(ref) ? relative(scope.cwd, ref) : ref.replace(/^\.\//, '')).replace(/\\/g, '/');
  const actual = await checkedKeyPath(scope.cwd, path);
  if (!actual || !(await git(scope.cwd, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', path)).split('\0').includes(path)) throw new DeskError('File is outside this project, ignored, linked or unavailable.', 403);
  const [kind, mime] = documentType(path); const name = basename(path);
  const handle = await open(actual, constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW));
  try {
    const stat = await handle.stat();
    const max = ['image', 'audio', 'video'].includes(kind) ? DOCUMENT_MEDIA_MAX : DOCUMENT_TEXT_MAX;
    if (!stat.isFile() || stat.nlink > 1) throw new DeskError('Only regular, unlinked files can be previewed.', 403);
    if (kind === 'unsupported') { scope.unchanged(); return { name, path, kind, mime, bytes: Math.min(stat.size, DOCUMENT_MEDIA_MAX), note: 'No built-in viewer for this format.' }; }
    if (stat.size > max) throw new DeskError(`File exceeds the ${max / 1024 / 1024 < 1 ? '256 KiB text' : '8 MiB media'} viewer limit.`, 409);
    const bytes = Buffer.alloc(stat.size + 1); let offset = 0;
    while (offset < bytes.length) { const read = await handle.read(bytes, offset, bytes.length - offset, offset); if (!read.bytesRead) break; offset += read.bytesRead; }
    const after = await handle.stat();
    scope.unchanged(); await keyScope(deps, request);
    if (offset !== stat.size || after.size !== stat.size || after.mtimeMs !== stat.mtimeMs || await checkedKeyPath(scope.cwd, path) !== actual) throw new DeskError('File changed while reading; reopen it.', 409);
    const data = bytes.subarray(0, offset);
    if (['image', 'audio', 'video'].includes(kind)) {
      const valid = mime === 'image/png' ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.length >= 24 && data.readUInt32BE(16) * data.readUInt32BE(20) <= 40_000_000
        : mime === 'image/jpeg' ? data[0] === 255 && data[1] === 216 && data[2] === 255
        : mime === 'image/gif' ? /^GIF8[79]a$/.test(data.subarray(0, 6).toString())
        : mime === 'image/webp' ? data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP'
        : mime === 'audio/wav' ? data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WAVE'
        : mime === 'audio/mp4' || mime === 'video/mp4' ? data.subarray(4, 8).toString() === 'ftyp'
        : mime === 'audio/ogg' ? data.subarray(0, 4).toString() === 'OggS'
        : mime === 'video/webm' ? data.subarray(0, 4).equals(Buffer.from([26,69,223,163]))
        : mime === 'audio/mpeg' ? data.subarray(0, 3).toString() === 'ID3' || (data[0] === 255 && (data[1] & 224) === 224) : false;
      if (!valid) throw new DeskError('File contents do not match a supported media format.', 409);
      return { name, path, kind, mime, bytes: offset, url: `data:${mime};base64,${data.toString('base64')}` };
    }
    let source: string;
    try { source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data); } catch { throw new DeskError('Text viewer requires valid UTF-8.', 409); }
    if (source.includes('\0')) throw new DeskError('Binary content cannot be shown as text.', 409);
    return { name, path, kind, mime, bytes: offset, source, ...(kind === 'asciidoc' ? { note: 'AsciiDoc prose, lists, tables and source blocks. Includes and macros stay literal.' } : {}) };
  } finally { await handle.close(); }
}
