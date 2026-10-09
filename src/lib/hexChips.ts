/**
 * Hex codes paint themselves (docs/desk/keys.md, "#").
 *
 * `#` followed by 3, 6 or 8 hex digits is a colour, and is drawn as a chip
 * filled with it. Anything else after a `#` stays text — `#later`, `#12`,
 * `#ggg` — with no popup and nothing to dismiss. Agents get the plain code; the
 * chip is only how it is drawn.
 *
 * Pure, so the renderer (`components/cellar/LinkedText`) and anything that
 * later reads colours out of an agent's reply cut text the same way.
 */

// Not after a word character, `#` or `&` (an html entity, a `##` heading), and
// not followed by one: `#fff` is a colour, `#ffff` and `#fffz` are not.
const HEX_RE = /(?<![\w#&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})(?![\w])/gi;

export type HexSegment = { type: 'text'; value: string } | { type: 'hex'; value: string; ink: string };

/** The ground a translucent chip sits on — the app's near-black background. */
const GROUND = [10, 10, 10] as const;

const DARK_INK = '#0a0a0a';
const LIGHT_INK = '#fafafa';

/** `#abc` → [170, 187, 204, 1]; null when it is not a code. */
export function parseHex(code: string): [number, number, number, number] | null {
  const digits = code.replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(digits)) return null;
  const full = digits.length === 3 ? digits.replace(/./g, (d) => d + d) : digits;
  const byte = (at: number) => parseInt(full.slice(at, at + 2), 16);
  return [byte(0), byte(2), byte(4), full.length === 8 ? byte(6) / 255 : 1];
}

function luminance([r, g, b]: readonly number[]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Dark or light text, whichever reads on the colour. A translucent code is
 * judged as it will actually look: blended over the ground it sits on.
 */
export function inkFor(code: string): string {
  const rgba = parseHex(code);
  if (!rgba) return LIGHT_INK;
  const [r, g, b, a] = rgba;
  const seen = [r, g, b].map((c, i) => c * a + GROUND[i] * (1 - a));
  const fill = luminance(seen);
  return contrast(fill, luminance([10, 10, 10])) >= contrast(fill, luminance([250, 250, 250])) ? DARK_INK : LIGHT_INK;
}

/** The text cut into plain runs and colour codes; one text segment when there are none. */
export function splitHex(text: string): HexSegment[] {
  const out: HexSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(HEX_RE)) {
    const start = match.index ?? 0;
    if (start > cursor) out.push({ type: 'text', value: text.slice(cursor, start) });
    out.push({ type: 'hex', value: match[0], ink: inkFor(match[0]) });
    cursor = start + match[0].length;
  }

  if (cursor < text.length || out.length === 0) out.push({ type: 'text', value: text.slice(cursor) });
  return out;
}
