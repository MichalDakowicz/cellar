import { parseInline, parseMarkdown } from './markdown';

describe('parseInline', () => {
  it('reads code, bold, italic and links', () => {
    expect(parseInline('use `deskFolders` with **care**, *now* — [docs](https://x.dev/a)')).toEqual([
      { type: 'text', text: 'use ' },
      { type: 'code', text: 'deskFolders' },
      { type: 'text', text: ' with ' },
      { type: 'bold', text: 'care' },
      { type: 'text', text: ', ' },
      { type: 'italic', text: 'now' },
      { type: 'text', text: ' — ' },
      { type: 'link', text: 'docs', href: 'https://x.dev/a' },
    ]);
  });

  it('leaves snake_case and stray marks alone', () => {
    expect(parseInline('set repo_path and a*b*c')).toEqual([{ type: 'text', text: 'set repo_path and a*b*c' }]);
  });

  it('does not read marks inside code', () => {
    expect(parseInline('`**not bold**`')).toEqual([{ type: 'code', text: '**not bold**' }]);
  });
});

describe('parseMarkdown', () => {
  it('joins a paragraph and splits on blank lines', () => {
    const blocks = parseMarkdown('one\ntwo\n\nthree');
    expect(blocks).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: 'one two' }] },
      { type: 'paragraph', inline: [{ type: 'text', text: 'three' }] },
    ]);
  });

  it('reads headings, lists, quotes and rules', () => {
    const kinds = parseMarkdown('## Plan\n- a\n- b\n1. x\n2) y\n> said\n---\nend').map((block) => block.type);
    expect(kinds).toEqual(['heading', 'list', 'list', 'quote', 'rule', 'paragraph']);
    const [, bullets, numbers] = parseMarkdown('## Plan\n- a\n- b\n1. x\n2) y');
    expect(bullets).toMatchObject({ ordered: false, items: [[{ text: 'a' }], [{ text: 'b' }]] });
    expect(numbers).toMatchObject({ ordered: true });
  });

  it('keeps a fenced block verbatim, even without its closing fence', () => {
    expect(parseMarkdown('```ts\nconst a = **1**;\n```')).toEqual([{ type: 'code', lang: 'ts', text: 'const a = **1**;' }]);
    expect(parseMarkdown('```\nopen')).toEqual([{ type: 'code', lang: null, text: 'open' }]);
  });

  it('reads a table with its header', () => {
    const [table] = parseMarkdown('| file | why |\n|---|:--:|\n| `a.ts` | it |');
    expect(table).toMatchObject({
      type: 'table',
      header: [[{ text: 'file' }], [{ text: 'why' }]],
      rows: [[[{ type: 'code', text: 'a.ts' }], [{ text: 'it' }]]],
    });
  });

  it('reads a pipe line without a separator as a paragraph', () => {
    expect(parseMarkdown('a | b |')[0].type).toBe('paragraph');
  });
});
