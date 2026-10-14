import * as Crypto from 'expo-crypto';
import type { DeskPair } from '@/lib/deskPair';
import { hex, signDeskRequest, type Sha256 } from '@/lib/deskSign';
import { DeskUnreachable, refusal, type DeskTransport } from '@/lib/deskCalls';
export { deskCalls, DeskRefusal, DeskUnreachable, type DeskCalls, type TicketFor } from '@/lib/deskCalls';

const ASK_TIMEOUT_MS = 6000;
const START_TIMEOUT_MS = 120_000;

// A copy into a fresh ArrayBuffer: expo-crypto's types want an ArrayBuffer-backed view, never a shared one.
const sha256: Sha256 = async (data) =>
  new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new Uint8Array(data)));

/**
 * How far this phone's clock is from each pc's, learned from a refusal. A
 * signature carries a timestamp the pc accepts within a minute; a phone whose
 * clock has drifted further would be refused forever, so the pc says what time
 * it is when it refuses and the request is signed again against that.
 */
const clockOffset = new Map<string, number>();

type Answer = { status: number; body: unknown };

async function signedFetch(pair: DeskPair, method: string, path: string, text: string): Promise<Answer> {
  const authorization = await signDeskRequest({
    key: pair.key,
    method,
    path,
    body: text,
    ts: Date.now() + (clockOffset.get(pair.id) ?? 0),
    nonce: hex(Crypto.getRandomBytes(16)),
    sha256,
  });
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    method === 'POST' && (path === '/runs' || path === '/screen-access' || path === '/preview-actions' || path.startsWith('/worktrees/')) ? START_TIMEOUT_MS : ASK_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`http://${pair.host}:${pair.port}${path}`, {
      method,
      headers: { authorization, ...(text ? { 'content-type': 'application/json' } : {}) },
      body: text || undefined,
      signal: controller.signal,
    });
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') throw new Error('invalid host response');
    return { status: response.status, body };
  } catch {
    throw new DeskUnreachable(`${pair.name} is not answering on this network`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The LAN is plain HTTP, so the key is never sent: each request carries an
 * HMAC of itself under the key, a timestamp and a one-use nonce
 * (`src/lib/deskSign.ts`). What crosses the Wi-Fi is worthless a minute later.
 */
export function lanTransport(pair: DeskPair): DeskTransport {
  return async (method, path, body) => {
    const text = body === undefined ? '' : JSON.stringify(body);
    let answer = await signedFetch(pair, method, path, text);
    if (answer.status === 401) {
      const pcNow = (answer.body as { now?: unknown } | null)?.now;
      const offset = typeof pcNow === 'number' ? pcNow - Date.now() : 0;
      if (Math.abs(offset) > 30_000) {
        clockOffset.set(pair.id, offset);
        answer = await signedFetch(pair, method, path, text);
      }
    }
    if (answer.status === 401) throw new Error(`${pair.name} refused the request signature — retry or check pairing`);
    if (answer.status < 200 || answer.status >= 300) throw refusal(answer.status, answer.body);
    return answer.body;
  };
}

