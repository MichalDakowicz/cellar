/**
 * How a paired phone proves it holds the pc's key without ever sending it.
 *
 * The LAN is plain HTTP — the pc has no certificate a phone could trust — so a
 * bearer key would cross the Wi-Fi in the clear, and anyone able to watch it
 * would hold the pc. Instead every request carries an HMAC-SHA256 of what it
 * is (method, path, a timestamp, a nonce, the body's hash) under the key. The
 * pc recomputes it; the key itself never leaves either device. The timestamp
 * and nonce make a captured request worthless a minute later, or a second time.
 *
 * Pure, with SHA-256 handed in: the phone has it from expo-crypto, the pc from
 * node, and this file must run in both — the two sides must agree on every byte
 * of the string that is signed, so there is exactly one place that builds it.
 */

export type Sha256 = (data: Uint8Array) => Promise<Uint8Array>;

/** How far a request's clock may be from the pc's. Phones and pcs sync over NTP; a minute is generous. */
export const SIGN_WINDOW_MS = 60_000;

const BLOCK = 64;

export function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function hex(bytes: Uint8Array): string {
  let out = '';
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0');
  return out;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

/** RFC 2104 over an injected SHA-256. */
export async function hmacSha256(key: Uint8Array, message: Uint8Array, sha256: Sha256): Promise<Uint8Array> {
  const block = new Uint8Array(BLOCK);
  block.set(key.length > BLOCK ? await sha256(key) : key);
  const inner = new Uint8Array(BLOCK);
  const outer = new Uint8Array(BLOCK);
  for (let i = 0; i < BLOCK; i += 1) {
    inner[i] = block[i] ^ 0x36;
    outer[i] = block[i] ^ 0x5c;
  }
  return sha256(concat(outer, await sha256(concat(inner, message))));
}

/** The exact string both sides sign. */
export function signingString(method: string, path: string, ts: number, nonce: string, bodyHash: string): string {
  return `${method.toUpperCase()}\n${path}\n${ts}\n${nonce}\n${bodyHash}`;
}

export type DeskAuth = { ts: number; nonce: string; sig: string };

export function deskAuthHeader(auth: DeskAuth): string {
  return `Desk ${auth.ts}.${auth.nonce}.${auth.sig}`;
}

export function parseDeskAuth(header: string | null | undefined): DeskAuth | null {
  const match = /^Desk (\d{10,16})\.([0-9a-f]{16,64})\.([0-9a-f]{64})$/.exec(header?.trim() ?? '');
  return match ? { ts: Number(match[1]), nonce: match[2], sig: match[3] } : null;
}

/** Sign one request — what the phone puts in `Authorization`. */
export async function signDeskRequest(input: {
  key: string;
  method: string;
  path: string;
  body: string;
  ts: number;
  nonce: string;
  sha256: Sha256;
}): Promise<string> {
  const bodyHash = hex(await input.sha256(utf8(input.body)));
  const sig = hex(
    await hmacSha256(utf8(input.key), utf8(signingString(input.method, input.path, input.ts, input.nonce, bodyHash)), input.sha256),
  );
  return deskAuthHeader({ ts: input.ts, nonce: input.nonce, sig });
}
