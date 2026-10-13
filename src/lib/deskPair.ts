/**
 * How a phone learns where the pc is, and the one secret it carries back.
 *
 * The pc shows a QR code; the phone reads it once and keeps what it says. The
 * code is an ordinary `http://` link to the pc itself rather than a custom
 * scheme, because the phone's own camera app opens a web link and shows a
 * `cellar://` one as text — so the code works whether it is read by Cellar's
 * scanner or by whatever camera is to hand. The page it opens hands the same
 * values on to Cellar.
 *
 * The secret rides in the **fragment**, which a browser never sends. Opening
 * the link fetches a page from the pc without the key ever crossing the network
 * in a request; only the script on that page reads it, to build the app link.
 *
 * Pure and free of `URL`: React Native's implementation has no `searchParams`,
 * and the desktop host imports this file too. The two must agree on every
 * character of the format, so there is exactly one parser.
 */

/** Where the pc listens unless something else already has it. */
export const DESK_PORT = 47821;

/** The deep link route the pairing page opens Cellar on. */
export const DESK_PAIR_ROUTE = 'desk-pair';

export type DeskPair = {
  /** The pc's own id — stable for the life of its install, unrelated to the account. */
  id: string;
  /** What the pc calls itself; shown, never trusted. */
  name: string;
  /** A LAN address. Rewritten later if the pc reports that it moved. */
  host: string;
  port: number;
  /** The bearer secret every LAN request carries. */
  key: string;
};

const ID = /^[0-9a-f]{8,32}$/;
const KEY = /^[A-Za-z0-9_-]{32,128}$/;
const HOSTNAME = /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*$/;
const NAME_MAX = 40;

/**
 * Somewhere on a home network: a private or link-local IPv4 address (and the
 * 100.64/10 range Tailscale hands out), or a `.local` name. Anything else is
 * refused. A pairing is a place this phone will send prompts and its key's
 * signatures to over plain HTTP, and a link that points it at a public address
 * is not a pc on your desk.
 */
export function isDeskHost(host: string): boolean {
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const [a, b] = ipv4.slice(1, 3).map(Number);
    if (!ipv4.slice(1).every((part) => Number(part) <= 255)) return false;
    return (
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  return HOSTNAME.test(host) && host.toLowerCase().endsWith('.local');
}

function cleanName(raw: string | undefined): string {
  const name = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  return name || 'pc';
}

/** The values, checked — null when any of them is not something this format can carry. */
export function deskPair(raw: {
  id?: string;
  name?: string;
  host?: string;
  port?: string | number;
  key?: string;
}): DeskPair | null {
  const port = typeof raw.port === 'number' ? raw.port : Number(raw.port);
  if (!raw.id || !ID.test(raw.id)) return null;
  if (!raw.key || !KEY.test(raw.key)) return null;
  if (!raw.host || !isDeskHost(raw.host)) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { id: raw.id, name: cleanName(raw.name), host: raw.host, port, key: raw.key };
}

function params(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of query.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const name = eq < 0 ? part : part.slice(0, eq);
    const value = eq < 0 ? '' : part.slice(eq + 1);
    try {
      out[decodeURIComponent(name)] = decodeURIComponent(value.replace(/\+/g, ' '));
    } catch {
      // A malformed escape is a code this format did not write; skip the pair.
    }
  }
  return out;
}

function encode(values: Record<string, string | number>): string {
  return Object.entries(values)
    .map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/** What the QR code says: a link to the pc, the secret in the fragment. */
export function deskPairUrl(pair: DeskPair): string {
  return `http://${pair.host}:${pair.port}/pair#${encode({ d: pair.id, k: pair.key, n: pair.name })}`;
}

/** The deep link the pairing page opens — every value in the query, since it never leaves the phone. */
export function deskAppLink(pair: DeskPair, scheme = 'cellar'): string {
  return `${scheme}://${DESK_PAIR_ROUTE}?${encode({
    h: pair.host,
    p: pair.port,
    d: pair.id,
    k: pair.key,
    n: pair.name,
  })}`;
}

/**
 * Either form back into a pairing: the `http://host:port/pair#…` link the QR
 * code carries, or the `cellar://desk-pair?…` link the page opens. Anything else
 * — a sign-in code, a poster, a typo — is null, so a scanner can tell "not
 * ours" from "ours and broken" without guessing.
 */
export function parseDeskPair(text: string): DeskPair | null {
  const trimmed = text.trim();

  const web = /^http:\/\/([^/:#?]+):(\d{1,5})\/pair\/?#(.*)$/i.exec(trimmed);
  if (web) {
    const values = params(web[3]);
    return deskPair({ host: web[1], port: web[2], id: values.d, key: values.k, name: values.n });
  }

  const app = /^[a-z][a-z0-9+.-]*:\/\/\/?desk-pair\/?\?(.*)$/i.exec(trimmed);
  if (app) {
    const values = params(app[1]);
    return deskPair({ host: values.h, port: values.p, id: values.d, key: values.k, name: values.n });
  }

  return null;
}

/** The same values out of an already-split query, for a route handed its params by the router. */
export function deskPairFromParams(values: Record<string, string | string[] | undefined>): DeskPair | null {
  const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  return deskPair({
    host: one(values.h),
    port: one(values.p),
    id: one(values.d),
    key: one(values.k),
    name: one(values.n),
  });
}
