import { collectLinks, hasLink, hrefOf, linkHost, splitLinks } from '@/lib/links';

const links = (text: string) =>
  splitLinks(text)
    .filter((segment) => segment.type === 'link')
    .map((segment) => segment.href);

describe('splitLinks', () => {
  it('finds an http url in the middle of a sentence', () => {
    expect(splitLinks('read https://example.com/docs first')).toEqual([
      { type: 'text', value: 'read ' },
      { type: 'link', value: 'https://example.com/docs', href: 'https://example.com/docs' },
      { type: 'text', value: ' first' },
    ]);
  });

  it('gives a bare www the scheme it implied', () => {
    expect(links('www.example.com')).toEqual(['https://www.example.com']);
  });

  it('leaves the full stop with the sentence, not the url', () => {
    expect(links('see https://example.com/docs.')).toEqual(['https://example.com/docs']);
    expect(links('see https://example.com/a), then')).toEqual(['https://example.com/a']);
  });

  it('finds several in one line', () => {
    expect(links('https://a.com and https://b.com')).toEqual(['https://a.com', 'https://b.com']);
  });

  // The thing that would make a wall of thoughts turn half its own words blue.
  it('does not match a bare domain, a version or an abbreviation', () => {
    expect(links('node.js is fine, e.g. v1.2 too')).toEqual([]);
    expect(links('rewrite it in rust.')).toEqual([]);
  });

  it('returns the whole line as text when there is nothing to link', () => {
    expect(splitLinks('a plain thought')).toEqual([{ type: 'text', value: 'a plain thought' }]);
  });

  it('never loses any of the original text', () => {
    const text = 'before https://example.com/x after https://b.io done';
    const rebuilt = splitLinks(text)
      .map((segment) => segment.value)
      .join('');
    expect(rebuilt).toBe(text);
  });
});

describe('linkHost', () => {
  it('is the host without the scheme, the www or the path', () => {
    expect(linkHost('https://www.example.com/a/b?c=d#e')).toBe('example.com');
  });

  it('survives something that is not really a url', () => {
    expect(linkHost('https://')).toBe('https://');
  });
});

describe('hrefOf', () => {
  it('leaves an explicit scheme alone and adds one to a bare www', () => {
    expect(hrefOf('http://a.com')).toBe('http://a.com');
    expect(hrefOf('www.a.com')).toBe('https://www.a.com');
  });
});

describe('collectLinks', () => {
  it('walks every line, in order, without repeating one', () => {
    expect(collectLinks(['https://a.com here', 'and https://b.com', 'https://a.com again'])).toEqual([
      'https://a.com',
      'https://b.com',
    ]);
  });

  it('is empty for lines with nothing in them', () => {
    expect(collectLinks(['a thought', ''])).toEqual([]);
  });
});

describe('hasLink', () => {
  it('answers without the caller having to walk the segments', () => {
    expect(hasLink('see https://a.com')).toBe(true);
    expect(hasLink('see nothing')).toBe(false);
  });
});
