import { docHref, docKind, docTitle, isDuplicateDoc, normalizeDocRef } from '@/lib/entryDocs';

const github = { repoUrl: 'https://github.com/MichalDakowicz/cellar' };

describe('docKind', () => {
  it('reads a link as a link', () => {
    expect(docKind('https://expo.dev/changelog')).toBe('url');
    expect(docKind('www.example.com/a')).toBe('url');
  });

  it('reads anything else as a path', () => {
    expect(docKind('docs/OVERVIEW.md')).toBe('path');
    expect(docKind('C:\\ping\\cellar\\PING.md')).toBe('path');
    expect(docKind('README.md')).toBe('path');
  });
});

describe('normalizeDocRef', () => {
  it('takes off whitespace and a pasted pair of quotes, nothing else', () => {
    expect(normalizeDocRef('  "docs/Plan.md" ')).toBe('docs/Plan.md');
    expect(normalizeDocRef('src\\lib\\dump.ts')).toBe('src\\lib\\dump.ts');
  });
});

describe('docHref', () => {
  it('opens a link as itself, with the scheme a www link implied', () => {
    expect(docHref('https://a.dev/x', null)).toBe('https://a.dev/x');
    expect(docHref('www.a.dev', null)).toBe('https://www.a.dev');
  });

  it('opens a path as the file on github when the project lives there', () => {
    expect(docHref('docs/shared-database.md', github)).toBe(
      'https://github.com/MichalDakowicz/cellar/blob/HEAD/docs/shared-database.md',
    );
    expect(docHref('.\\src\\lib\\dump.ts', { repoUrl: 'git@github.com:you/cellar.git' })).toBe(
      'https://github.com/you/cellar/blob/HEAD/src/lib/dump.ts',
    );
  });

  it('has nowhere to open a path without a github remote', () => {
    expect(docHref('docs/a.md', null)).toBeNull();
    expect(docHref('docs/a.md', { repoUrl: 'https://gitlab.com/you/cellar' })).toBeNull();
  });
});

describe('docTitle', () => {
  it('prefers the label, then the host, then the file name', () => {
    expect(docTitle({ ref: 'https://www.expo.dev/x', label: 'expo notes' })).toBe('expo notes');
    expect(docTitle({ ref: 'https://www.expo.dev/x', label: null })).toBe('expo.dev');
    expect(docTitle({ ref: 'docs\\OVERVIEW.md', label: '  ' })).toBe('OVERVIEW.md');
  });
});

describe('isDuplicateDoc', () => {
  it('treats the same ref twice as one doc, whatever the case or quotes', () => {
    expect(isDuplicateDoc('"Docs/A.md"', [{ ref: 'docs/a.md' }])).toBe(true);
    expect(isDuplicateDoc('docs/b.md', [{ ref: 'docs/a.md' }])).toBe(false);
  });
});
