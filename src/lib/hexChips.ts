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

function toHsl([r, g, b]: readonly number[]): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [h / 6, s, l];
}

function fromHsl([h, s, l]: readonly number[]): [number, number, number] {
  if (s === 0) return [l, l, l].map((c) => Math.round(c * 255)) as [number, number, number];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((c) => Math.round(c * 255)) as [number, number, number];
}

/**
 * The code a step lighter (`step` > 0) or darker, by lightness, keeping its hue
 * and its alpha. Written back the way it was typed: upper or lower case, and a
 * short `#abc` comes back long, since a nudge rarely lands on a short one.
 */
export function nudgeHex(code: string, step: number): string {
  const rgba = parseHex(code);
  if (!rgba) return code;
  const [h, s, l] = toHsl(rgba);
  const rgb = fromHsl([h, s, Math.min(1, Math.max(0, l + step))]);
  const digits = code.replace(/^#/, '');
  const alpha = digits.length === 8 ? digits.slice(6) : '';
  const out = `${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}${alpha}`;
  return `#${/[A-F]/.test(digits) ? out.toUpperCase() : out.toLowerCase()}`;
}
