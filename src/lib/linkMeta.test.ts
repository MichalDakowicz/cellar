import { decodeEntities, headOf, isEmptyMeta, parseLinkMeta } from '@/lib/linkMeta';

describe('parseLinkMeta', () => {
  it('prefers open graph over the title tag', () => {
    const html = `
      <title>Home | Some Company</title>
      <meta property="og:title" content="The thing you actually wanted">
      <meta property="og:site_name" content="Some Company">
      <meta property="og:description" content="What it is about.">
    `;
    expect(parseLinkMeta(html)).toEqual({
      title: 'The thing you actually wanted',
      site: 'Some Company',
      description: 'What it is about.',
    });
  });

  it('falls back to the title tag when there is no open graph', () => {
    expect(parseLinkMeta('<title>Just a page</title>').title).toBe('Just a page');
  });

  // Real pages emit both attribute orders; one pattern silently misses half.
  it('reads a meta tag with content before the property', () => {
    expect(parseLinkMeta('<meta content="Backwards" property="og:title">').title).toBe('Backwards');
  });

  it('falls back to the plain description meta', () => {
    expect(parseLinkMeta('<meta name="description" content="plain">').description).toBe('plain');
  });

  it('collapses a title that wraps in the source to one line', () => {
    expect(parseLinkMeta('<title>\n  two\n  lines\n</title>').title).toBe('two lines');
  });

  it('decodes the entities that actually turn up in titles', () => {
    expect(parseLinkMeta('<title>Cats &amp; Dogs</title>').title).toBe('Cats & Dogs');
  });

  it('truncates a description that is really a paragraph', () => {
    const long = 'x'.repeat(400);
    const { description } = parseLinkMeta(`<meta name="description" content="${long}">`);
    expect(description).toHaveLength(220);
    expect(description?.endsWith('…')).toBe(true);
  });

  it('finds nothing in a page that says nothing', () => {
    const meta = parseLinkMeta('<html><body>hello</body></html>');
    expect(meta).toEqual({ title: null, site: null, description: null });
    expect(isEmptyMeta(meta)).toBe(true);
  });

  it('treats an empty title as nothing rather than as a blank title', () => {
    expect(parseLinkMeta('<title>   </title>').title).toBeNull();
  });
});

describe('decodeEntities', () => {
  it('leaves an entity it does not know alone rather than mangling it', () => {
    expect(decodeEntities('a &frac12; b')).toBe('a &frac12; b');
    expect(decodeEntities('a &amp; b')).toBe('a & b');
  });
});

describe('headOf', () => {
  it('stops at the closing head tag, so the body is never scanned', () => {
    expect(headOf('<head><title>a</title></head><body>b</body>')).toBe('<head><title>a</title>');
  });

  it('hands back the whole document when there is no closing head tag', () => {
    expect(headOf('<title>a</title>')).toBe('<title>a</title>');
  });
});

/**
 * The bug this feature shipped with, pinned.
 *
 * A document's head is not near its front — youtube.com puts `og:title` at
 * byte 707,923 — so a parser handed a 64KB prefix found nothing, cached a
 * failure, and left the link reading as its host forever.
 */
describe('a head that is a long way in', () => {
  const far = `<html><head>${'<script>x</script>'.repeat(5000)}<title>Found anyway</title></head><body>b</body></html>`;

  it('finds a title past where a 64KB read would have stopped', () => {
    expect(far.search(/<title/i)).toBeGreaterThan(64 * 1024);
    expect(parseLinkMeta(far).title).toBe('Found anyway');
  });
});
