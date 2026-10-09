/**
 * The markdown an agent writes, cut into what the run chat draws.
 *
 * Agents answer in markdown — backticked names, bold, lists, fenced code,
 * tables — and shown raw it reads as noise on a phone. This is a deliberately
 * small reader for the subset agents actually use, not CommonMark: blocks are
 * found line by line, inline marks by one pass of a regex. Anything it does not
 * recognise stays as text, which is the honest fallback.
 *
 * Pure, so the phone's run chat and the desktop chat read a reply the same way.
 */

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'quote'; inline: Inline[] }
  | { type: 'code'; lang: string | null; text: string }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] }
  | { type: 'rule' };

// `code` first so nothing inside backticks is read as a mark; then links,
// bold, and italic — `_x_` only between non-word characters, so snake_case
// names stay as they are.
const INLINE_RE =
  /`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|(?<![\w*])\*([^*\n]+)\*(?![\w*])|(?<![\w_])_([^_\n]+)_(?![\w_])/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push({ type: 'text', text: text.slice(cursor, start) });
    const [, code, label, href, bold1, bold2, italic1, italic2] = match;
    if (code !== undefined) out.push({ type: 'code', text: code });
    else if (label !== undefined) out.push({ type: 'link', text: label, href: href! });
    else if (bold1 !== undefined || bold2 !== undefined) out.push({ type: 'bold', text: (bold1 ?? bold2)! });
    else out.push({ type: 'italic', text: (italic1 ?? italic2)! });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) out.push({ type: 'text', text: text.slice(cursor) });
  return out;
}

const FENCE = /^\s*```\s*([\w+-]*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(row: string): Inline[][] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => parseInline(cell.trim()));
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fence = FENCE.exec(line);
    if (fence) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i += 1; // the closing fence, or past the end when it never came
      blocks.push({ type: 'code', lang: fence[1] || null, text: body.join('\n') });
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: 'rule' });
      i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2].trim()) });
      i += 1;
      continue;
    }

    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      const header = cells(line);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && TABLE_ROW.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const ordered = NUMBERED.test(line);
    if (ordered || BULLET.test(line)) {
      const pattern = ordered ? NUMBERED : BULLET;
      const items: Inline[][] = [];
      while (i < lines.length && pattern.test(lines[i])) items.push(parseInline(pattern.exec(lines[i++])![1].trim()));
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(QUOTE.exec(lines[i++])![1].trim());
      blocks.push({ type: 'quote', inline: parseInline(body.join(' ')) });
      continue;
    }

    // A paragraph runs until a blank line or the start of another block.
    const body: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !BULLET.test(lines[i]) &&
      !NUMBERED.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !RULE.test(lines[i]) &&
      !TABLE_ROW.test(lines[i])
    ) {
      body.push(lines[i++].trim());
    }
    if (body.length === 0) body.push(lines[i++].trim());
    blocks.push({ type: 'paragraph', inline: parseInline(body.join(' ')) });
  }

  return blocks;
}
