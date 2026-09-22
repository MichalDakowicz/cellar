/**
 * Finding the links inside a one-line thought.
 *
 * Pure, and it has to be: a thought, a line of yours and a line from an agent
 * are three different components, and before this they each rendered a bare
 * `Text`. A parser per component is three parsers that drift, so there is one
 * here and one renderer over it (`components/cellar/LinkedText`).
 *
 * The cellar is a mind dump — a link in it arrived as part of a sentence
 * someone typed in a hurry, so the matching is deliberately conservative: an
 * explicit scheme, or a `www.` that could not be anything else. Bare domains
 * are not matched, because `node.js`, `e.g.` and `v1.2` all look like one and a
 * thought that turns half its own words blue is worse than a url you have to
 * copy by hand.
 */

const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>()[\]{}]+/gi;

/** Punctuation that ends the sentence rather than the url. */
const TRAILING = /[.,;:!?'"»)\]}]+$/;

export type LinkSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

/** `www.x.com` is a link and not a URL, so it gets the scheme it implied. */
export function hrefOf(match: string): string {
  return /^https?:\/\//i.test(match) ? match : `https://${match}`;
}

/**
 * The host, without the `www.` and without the path — what a link is called
 * when nothing better is known about it yet.
 *
 * Hand-cut rather than `new URL()`: this runs per row in a virtualized list,
 * and a URL a user typed by hand is not guaranteed to parse. A string that
 * defeats it falls back to itself, which still reads.
 */
export function linkHost(href: string): string {
  const withoutScheme = href.replace(/^https?:\/\//i, '');
  const host = withoutScheme.split(/[/?#]/)[0] ?? withoutScheme;
  return host.replace(/^www\./i, '') || href;
}

/**
 * The line, cut into what is text and what is a link.
 *
 * Returns a single text segment when there is nothing to link, so the caller
 * can render the result unconditionally rather than branching on it.
 */
export function splitLinks(text: string): LinkSegment[] {
  const out: LinkSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK_RE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    // Trailing punctuation belongs to the sentence. Trimming it can empty the
    // match entirely ("www." at the end of a line), which is not a link.
    const value = raw.replace(TRAILING, '');
    if (!value || !/[a-z0-9]/i.test(linkHost(hrefOf(value)))) continue;

    if (start > cursor) out.push({ type: 'text', value: text.slice(cursor, start) });
    out.push({ type: 'link', value, href: hrefOf(value) });
    cursor = start + value.length;
  }

  if (cursor < text.length) out.push({ type: 'text', value: text.slice(cursor) });
  return out.length > 0 ? out : [{ type: 'text', value: text }];
}

/** Every distinct link in a run of lines, in the order they appear. */
export function collectLinks(texts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const text of texts) {
    for (const segment of splitLinks(text)) {
      if (segment.type !== 'link' || seen.has(segment.href)) continue;
      seen.add(segment.href);
      out.push(segment.href);
    }
  }
  return out;
}

export function hasLink(text: string): boolean {
  return splitLinks(text).some((segment) => segment.type === 'link');
}
