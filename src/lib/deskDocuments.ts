import { parseMarkdown } from './markdown';

export const DOCUMENT_TEXT_MAX = 256 * 1024;
export const DOCUMENT_MEDIA_MAX = 8 * 1024 * 1024;
export type DocumentKind = 'markdown' | 'asciidoc' | 'json' | 'text' | 'image' | 'audio' | 'video' | 'unsupported';
export type DeskDocument = { name: string; path: string; kind: DocumentKind; mime: string; bytes: number; source?: string; url?: string; note?: string };
export type DocumentRequest = { projectId: string; runId?: string; agent?: 'codex' | 'claude' | 'agy'; path: string };
const TYPES: Record<string, [DocumentKind, string]> = {
  md: ['markdown', 'text/markdown'], markdown: ['markdown', 'text/markdown'], mdx: ['text', 'text/plain'],
  adoc: ['asciidoc', 'text/asciidoc'], asciidoc: ['asciidoc', 'text/asciidoc'], asc: ['asciidoc', 'text/asciidoc'],
  json: ['json', 'application/json'], txt: ['text', 'text/plain'], csv: ['text', 'text/csv'], tsv: ['text', 'text/tab-separated-values'],
  png: ['image', 'image/png'], jpg: ['image', 'image/jpeg'], jpeg: ['image', 'image/jpeg'], gif: ['image', 'image/gif'], webp: ['image', 'image/webp'],
  mp3: ['audio', 'audio/mpeg'], wav: ['audio', 'audio/wav'], m4a: ['audio', 'audio/mp4'], ogg: ['audio', 'audio/ogg'],
  mp4: ['video', 'video/mp4'], webm: ['video', 'video/webm'],
};
export function documentType(name: string): [DocumentKind, string] {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? name;
  const ext = base.split('.').pop()!.toLowerCase();
  if (TYPES[ext]) return TYPES[ext];
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|css|scss|html|xml|svg|yml|yaml|toml|ini|sh|ps1|sql|log|diff|patch)$/i.test(base) || /^(AGENTS|CLAUDE|LICENSE|Dockerfile|Makefile)$/i.test(base)) return ['text', 'text/plain'];
  return ['unsupported', 'application/octet-stream'];
}

/** AsciiDoc's portable prose subset. Includes, attributes, passthrough and code never execute. */
export function asciiDocMarkdown(source: string): string {
  const out: string[] = []; let fenced: string | null = null; let lang = ''; let table: string[] | null = null;
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\[source(?:,([^\]]+))?\]$/.test(line) && !fenced) { lang = /^\[source(?:,([^\]]+))?\]$/.exec(line)?.[1] ?? ''; continue; }
    if (/^(----|\.\.\.\.)$/.test(line)) { if (!fenced) { fenced = line; out.push('```' + lang); lang = ''; } else if (line === fenced) { fenced = null; out.push('```'); } else out.push(line); continue; }
    if (fenced) { out.push(line); continue; }
    if (line === '|===') {
      if (table) { const rows = table.filter((l) => l.startsWith('|')).map((l) => l.split('|').slice(1)); const width = Math.max(1, ...rows.map((r) => r.length)); if (rows.length) { out.push('| ' + rows[0].join(' | ') + ' |', '| ' + Array(width).fill('---').join(' | ') + ' |', ...rows.slice(1).map((r) => '| ' + r.join(' | ') + ' |')); } table = null; }
      else table = [];
      continue;
    }
    if (table) { table.push(line); continue; }
    if (/^\/\//.test(line)) continue;
    if (/^(include::|image::|ifdef::|ifndef::|endif::|:.*:)/.test(line)) { out.push('`' + line.replace(/`/g, '\\`') + '`'); continue; }
    out.push(line.replace(/^(={1,6})\s+/, (_, marks: string) => '#'.repeat(marks.length) + ' ')
      .replace(/^\.\s+/, '1. ').replace(/^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s*/, '> **$1:** ')
      .replace(/link:(https?:\/\/[^\s[]+)\[([^\]]*)\]/g, '[$2]($1)')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '**$1**'));
  }
  if (fenced) out.push('```'); if (table) out.push(...table);
  return out.join('\n');
}
export function documentMarkdown(file: Pick<DeskDocument, 'kind' | 'source'>): string {
  if (file.kind === 'asciidoc') return asciiDocMarkdown(file.source ?? '');
  return file.source ?? '';
}
export function documentBlocks(file: Pick<DeskDocument, 'kind' | 'source'>) { return parseMarkdown(documentMarkdown(file)); }

/** Local references get explicit file buttons; remote URLs retain normal link behavior. */
export function chatFileRefs(text: string): { path: string; name: string }[] {
  const candidates: string[] = [];
  for (const m of text.matchAll(/!?\[[^\]\n]*\]\((?:<([^>\n]+)>|([^\s)]+))(?:\s+"[^"]*")?\)|`([^`\n]+)`/g)) {
    let path = (m[1] ?? m[2] ?? m[3]).replace(/#L?\d+(?:C\d+)?(?:-L?\d+)?$/, '').replace(/:\d+(?::\d+)?$/, '');
    try { path = decodeURIComponent(path); } catch { continue; }
    if (/^(?:https?:|data:|javascript:|file:|content:|cellar:|\/\/)/i.test(path) || path.length > 2048 || /[\x00-\x1f]/.test(path) || documentType(path)[0] === 'unsupported') continue;
    if (!candidates.includes(path)) candidates.push(path);
    if (candidates.length >= 12) break;
  }
  return candidates.map((path) => ({ path, name: path.replace(/\\/g, '/').split('/').pop() || path }));
}
export function readDocument(raw: unknown): DeskDocument {
  const v = raw as DeskDocument;
  if (!v || typeof v.name !== 'string' || typeof v.path !== 'string' || !Number.isSafeInteger(v.bytes) || v.bytes < 0 || v.bytes > DOCUMENT_MEDIA_MAX || !['markdown', 'asciidoc', 'json', 'text', 'image', 'audio', 'video', 'unsupported'].includes(v.kind) || typeof v.mime !== 'string') throw new Error('Invalid document response.');
  if (['image', 'audio', 'video'].includes(v.kind)) {
    if (typeof v.url !== 'string' || !v.url.startsWith(`data:${v.mime};base64,`) || !/^[A-Za-z0-9+/]*={0,2}$/.test(v.url.slice(v.url.indexOf(',') + 1)) || v.url.length > DOCUMENT_MEDIA_MAX * 1.4 + 100 || !Object.values(TYPES).some(([kind, mime]) => kind === v.kind && mime === v.mime)) throw new Error('Invalid media response.');
  } else if (v.kind !== 'unsupported' && (typeof v.source !== 'string' || v.source.length > DOCUMENT_TEXT_MAX)) throw new Error('Invalid source response.');
  return v;
}
