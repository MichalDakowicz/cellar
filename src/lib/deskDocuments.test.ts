import { asciiDocMarkdown, chatFileRefs, documentType, readDocument } from './deskDocuments';
test('AsciiDoc headings, source and table render without evaluating macros', () => {
  const rendered = asciiDocMarkdown('= Guide\r\n\r\nNOTE: Careful\r\n\r\n[source,ts]\r\n----\r\nconst x = "*literal*";\r\n----\r\n\r\n|===\r\n|Name |Value\r\n|one |two\r\n|===\r\ninclude::secret[]');
  expect(rendered).toContain('# Guide'); expect(rendered).toContain('> **NOTE:** Careful');
  expect(rendered).toContain('```ts\nconst x = "*literal*";\n```'); expect(rendered).toContain('| Name  | Value |'); expect(rendered).toContain('`include::secret[]`');
});
test('chat references preserve filenames, reject network/active protocols and deduplicate', () => {
  expect(chatFileRefs('[Guide](<docs/my guide.adoc>) ![Shot](shot.png) `src/a.ts:42` [no](javascript:alert) [web](https://example.com/a.md) `src/a.ts:42`')).toEqual([{ path: 'docs/my guide.adoc', name: 'my guide.adoc' }, { path: 'shot.png', name: 'shot.png' }, { path: 'src/a.ts', name: 'a.ts' }]);
  expect(documentType('picture.svg')).toEqual(['text', 'text/plain']);
});
test('exact source survives unchanged while media rejects executable URL data', () => {
  const source = '\ufeff# Title\r\n\r\n**bold**\r\n';
  expect(readDocument({ name: 'a.md', path: 'a.md', kind: 'markdown', mime: 'text/markdown', bytes: 40, source }).source).toBe(source);
  expect(() => readDocument({ name: 'x.png', path: 'x.png', kind: 'image', mime: 'image/png', bytes: 1, url: 'data:image/png;base64,foo" onerror="bad' })).toThrow();
});
