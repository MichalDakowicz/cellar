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

/**
 * A guard against a pathological response, not a budget.
 *
 * It was 64KB, on the assumption that a document's head is near its front. It
 * is not: youtube.com puts `og:title` at byte 707,923, so a 64KB read found
 * nothing, cached a failure, and the link stayed as its host forever. Anything
 * that caps this below a megabyte is choosing which sites are allowed to work.
 */
export const META_BYTES = 2 * 1024 * 1024;

/**
 * The part of the document the tags are in.
 *
 * `</head>` when there is one — which bounds the regex work to the head however
 * big the body is — and the whole thing when there is not, because a page with
 * no closing head tag still has a title somewhere in it.
 */
export function headOf(html: string): string {
  const end = html.search(/<\/head\s*>/i);
  return end === -1 ? html : html.slice(0, end);
}

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

/**
 * How long each field is allowed to be, which is the shape of the thing it
 * lands in rather than an arbitrary limit: a row is one line and a card is
 * three, so a 300 character "title" is a paragraph that would push the thought
 * itself off the screen.
 *
 * Exported because oEmbed fills the same three fields from a different source
 * (`lib/oembed`), and two places deciding how long a title may be is two places
 * that drift.
 */
export const CAPS = { title: 120, site: 40, description: 220 } as const;

export function clean(value: string | null, cap: number): string | null {
  if (!value) return null;
  const text = oneLine(decodeEntities(value));
  if (!text) return null;
  return text.length > cap ? `${text.slice(0, cap - 1).trimEnd()}…` : text;
}

export function parseLinkMeta(document: string): LinkMeta {
  const html = headOf(document);
  const title = metaContent(html, 'og:title') ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? null;
  const description = metaContent(html, 'og:description') ?? metaContent(html, 'description');

  return {
    title: clean(title, CAPS.title),
    site: clean(metaContent(html, 'og:site_name'), CAPS.site),
    description: clean(description, CAPS.description),
  };
}

/** Nothing worth showing. A card with only a host on it is the host, twice. */
export function isEmptyMeta(meta: LinkMeta): boolean {
  return !meta.title && !meta.site && !meta.description;
}
