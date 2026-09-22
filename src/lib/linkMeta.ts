import { oneLine } from '@/lib/dump';

/**
 * What a page says it is, read out of its own HTML.
 *
 * Pure and regex-based rather than a DOM parse, for the reason every other
 * `lib/` file is pure: it is the half worth testing, and there is no DOM in
 * React Native anyway. It only ever reads the head of a document — the caller
 * hands it the first few kilobytes — so a malformed body cannot break it.
 *
 * Open Graph first, because a page that bothered to set `og:title` set it to
 * the thing a human should read, while `<title>` is as likely to be
 * "Home | Some Company". Then `<title>`, then nothing, which is a valid answer:
 * an unknown link still renders as its host.
 */

export type LinkMeta = {
  /** What to call it. Null means nothing better than the host was found. */
  title: string | null;
  /** The site it belongs to — `og:site_name`, falling back to the host. */
  site: string | null;
  description: string | null;
};

export const EMPTY_META: LinkMeta = { title: null, site: null, description: null };

/** How much of a response is worth reading. A head is small; a page is not. */
export const META_BYTES = 64 * 1024;

function metaContent(html: string, property: string): string | null {
  // Both orders: `<meta property=... content=...>` and the reverse, because
  // real pages emit both and a one-directional pattern silently misses half.
  const escaped = property.replace(/[:]/g, '\\:');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
  ];
  for (const pattern of patterns) {
    const found = html.match(pattern);
    if (found?.[1]) return found[1];
  }
  return null;
}

/** The handful that actually appear in titles. Not a full entity table. */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#?\w+);/g, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);
}

function clean(value: string | null, cap: number): string | null {
  if (!value) return null;
  const text = oneLine(decodeEntities(value));
  if (!text) return null;
  return text.length > cap ? `${text.slice(0, cap - 1).trimEnd()}…` : text;
}

export function parseLinkMeta(html: string): LinkMeta {
  const title = metaContent(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const description = metaContent(html, 'og:description') ?? metaContent(html, 'description');

  return {
    // A row is one line and a card is three, so the caps are the shape of the
    // thing rather than an arbitrary limit — a 300 character "title" is a
    // paragraph that would push the thought itself off the screen.
    title: clean(title, 120),
    site: clean(metaContent(html, 'og:site_name'), 40),
    description: clean(description, 220),
  };
}

/** Nothing worth showing. A card with only a host on it is the host, twice. */
export function isEmptyMeta(meta: LinkMeta): boolean {
  return !meta.title && !meta.site && !meta.description;
}
