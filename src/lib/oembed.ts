import { clean, CAPS, EMPTY_META, type LinkMeta } from '@/lib/linkMeta';
import { linkHost } from '@/lib/links';

/**
 * Asking a site what its own link is called, for the handful that will say.
 *
 * Scraping the page is the general answer and it stays the general answer. It
 * fails on one specific shape: a site that serves a consent wall to a fetch
 * from outside the EU serves *a real page with real open graph tags on it*, and
 * they describe the wall. youtube.com comes back as "Zanim przejdziesz do
 * YouTube", which is a correct read of the document it was handed and the wrong
 * answer to the question.
 *
 * oEmbed is the site's own published endpoint for "what is this url", it sits
 * in front of the wall, and it answers in JSON. The cost is that it is per-site
 * — there is no discovery here, because discovery means fetching the page
 * first, which is the thing that does not work.
 *
 * Pure: the endpoint is built here and the response is parsed here, and the
 * fetch itself belongs to `hooks/useLinkPreview` like the scrape does.
 */

type Provider = {
  /** Matched against the link's host, exactly or as a parent of it. */
  host: string;
  endpoint: string;
  /** What to call the site when the response does not name itself. */
  site: string;
};

/**
 * Only sites that publish an endpoint and that a cellar actually collects.
 *
 * A registry of every oEmbed provider exists and is not worth carrying: this
 * list is here because those four hosts are the ones whose scrape is wrong, and
 * every other link on earth is still served by the general path.
 */
const PROVIDERS: Provider[] = [
  { host: 'youtube.com', endpoint: 'https://www.youtube.com/oembed', site: 'YouTube' },
  { host: 'youtu.be', endpoint: 'https://www.youtube.com/oembed', site: 'YouTube' },
  { host: 'vimeo.com', endpoint: 'https://vimeo.com/api/oembed.json', site: 'Vimeo' },
  { host: 'twitter.com', endpoint: 'https://publish.twitter.com/oembed', site: 'X' },
  { host: 'x.com', endpoint: 'https://publish.twitter.com/oembed', site: 'X' },
  { host: 'spotify.com', endpoint: 'https://open.spotify.com/oembed', site: 'Spotify' },
];

export type OembedTarget = { url: string; site: string };

/**
 * The endpoint to ask about this link, or null for the overwhelming majority
 * of links, which go the normal way.
 *
 * The host has to match exactly or as a parent — `m.youtube.com` is YouTube,
 * `notyoutube.com` is not. A bare `endsWith` gets that wrong in the direction
 * that hands a stranger's url to Google, which is the same boundary bug
 * `lib/repoLink` documents about matching a checkout path.
 */
export function oembedFor(href: string): OembedTarget | null {
  const host = linkHost(href).toLowerCase();
  const provider = PROVIDERS.find((candidate) => host === candidate.host || host.endsWith(`.${candidate.host}`));
  if (!provider) return null;

  return {
    url: `${provider.endpoint}?format=json&url=${encodeURIComponent(href)}`,
    site: provider.site,
  };
}

function field(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * An oEmbed response, in the shape the rest of the app already renders.
 *
 * `author_name` becomes the description because on all four of these it is the
 * second thing worth knowing — the channel, the poster, the artist — and oEmbed
 * carries no description field at all. A card with a title and a channel on it
 * beats the same card with the wall's blurb on it.
 */
export function parseOembed(payload: unknown, fallbackSite: string): LinkMeta {
  if (!payload || typeof payload !== 'object') return EMPTY_META;
  const data = payload as Record<string, unknown>;

  return {
    title: clean(field(data.title), CAPS.title),
    site: clean(field(data.provider_name), CAPS.site) ?? fallbackSite,
    description: clean(field(data.author_name), CAPS.description),
  };
}
