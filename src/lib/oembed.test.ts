import { oembedFor, parseOembed } from '@/lib/oembed';

describe('oembedFor', () => {
  it('sends a youtube watch url to youtube', () => {
    const target = oembedFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(target?.url).toContain('https://www.youtube.com/oembed');
    expect(target?.site).toBe('YouTube');
  });

  it('takes the short form and the subdomains as the same provider', () => {
    for (const href of [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
    ]) {
      expect(oembedFor(href)?.site).toBe('YouTube');
    }
  });

  // The boundary, not a plain endsWith — matching loosely would hand a
  // stranger's url to Google, the same bug lib/repoLink guards on paths.
  it('does not take a host that merely ends in a provider name', () => {
    expect(oembedFor('https://notyoutube.com/watch?v=1')).toBeNull();
    expect(oembedFor('https://evil-x.com/status/1')).toBeNull();
  });

  it('leaves every other link to the normal path', () => {
    expect(oembedFor('https://example.com/a-post')).toBeNull();
    expect(oembedFor('https://github.com/MichalDakowicz/cellar')).toBeNull();
  });

  it('encodes the url it is asking about, so a query survives', () => {
    const target = oembedFor('https://vimeo.com/76979871?share=copy');
    expect(target?.url).toContain(`url=${encodeURIComponent('https://vimeo.com/76979871?share=copy')}`);
    expect(target?.url).toContain('format=json');
  });

  it('reads x.com and twitter.com as one provider, on the one endpoint', () => {
    const renamed = oembedFor('https://x.com/a/status/1');
    const original = oembedFor('https://twitter.com/a/status/1');
    expect(renamed?.site).toBe('X');
    expect(original?.site).toBe('X');
    expect(renamed?.url.startsWith('https://publish.twitter.com/oembed')).toBe(true);
    expect(original?.url.startsWith('https://publish.twitter.com/oembed')).toBe(true);
  });

  it('matches open.spotify.com through its parent', () => {
    expect(oembedFor('https://open.spotify.com/track/abc')?.site).toBe('Spotify');
  });
});

describe('parseOembed', () => {
  it('reads the title, the provider and the author', () => {
    const meta = parseOembed(
      { title: 'Never Gonna Give You Up', provider_name: 'YouTube', author_name: 'Rick Astley' },
      'YouTube',
    );
    expect(meta).toEqual({
      title: 'Never Gonna Give You Up',
      site: 'YouTube',
      description: 'Rick Astley',
    });
  });

  it('falls back to the provider we asked when the response does not name itself', () => {
    expect(parseOembed({ title: 'a clip' }, 'Vimeo').site).toBe('Vimeo');
  });

  it('decodes the entities a title arrives with', () => {
    expect(parseOembed({ title: 'Tom &amp; Jerry' }, 'YouTube').title).toBe('Tom & Jerry');
  });

  it('caps a title at the same length the scraped path uses', () => {
    const meta = parseOembed({ title: 'x'.repeat(400) }, 'YouTube');
    expect(meta.title).toHaveLength(120);
    expect(meta.title?.endsWith('…')).toBe(true);
  });

  it('gives nothing back for a body that is not an object', () => {
    expect(parseOembed(null, 'YouTube').title).toBeNull();
    expect(parseOembed('<!doctype html>', 'YouTube').title).toBeNull();
  });

  it('ignores a field that is present but blank', () => {
    expect(parseOembed({ title: '   ', author_name: '' }, 'YouTube').title).toBeNull();
  });

  // x.com's oEmbed is real and carries no title — the tweet is an html
  // blockquote and author_name is the only plain field. The caller keys on the
  // title for exactly this reason, so an X link still goes to the scrape rather
  // than landing a card with a name on it and no title.
  it('reports no title for an x.com response, which has none to give', () => {
    const meta = parseOembed(
      {
        author_name: 'Pathfinder Sports',
        author_url: 'https://x.com/pathfinderSport',
        html: '<blockquote class="twitter-tweet"><p>a tweet</p></blockquote>',
        provider_name: 'Twitter',
      },
      'X',
    );
    expect(meta.title).toBeNull();
    expect(meta.description).toBe('Pathfinder Sports');
  });

  // Spotify answers with a title and a provider and no author at all, which is
  // a complete answer — the description simply stays empty.
  it('takes a response with no author as complete', () => {
    const meta = parseOembed({ title: 'Never Gonna Give You Up', provider_name: 'Spotify' }, 'Spotify');
    expect(meta.title).toBe('Never Gonna Give You Up');
    expect(meta.description).toBeNull();
  });
});
