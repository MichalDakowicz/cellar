import * as Crypto from 'expo-crypto';

import type { DeskPair } from '@/lib/deskPair';
import type { DeskApk, DeskInfo, DeskLogLine, DeskPort, DeskRun, DeskStart } from '@/lib/deskProtocol';
import { hex, signDeskRequest, type Sha256 } from '@/lib/deskSign';

import type { DeskBridge } from './bridge';

/**
 * The pc's API, over whichever wire reaches it: the LAN, signed with the
 * paired key, or the desktop window's bridge. Both answer the same paths with the same
 * bodies, so everything above this file is written once.
 */

export type DeskTransport = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;

/** The pc did not answer at all — off, asleep, or on another network. Not the same as a refusal. */
export class DeskUnreachable extends Error {}

/** A question gets a few seconds; a start waits for the agent to come up, which for `claude --bg` is several. */
const ASK_TIMEOUT_MS = 6000;
const START_TIMEOUT_MS = 120_000;

function refusal(status: number, body: unknown): Error {
  const said = (body as { error?: unknown } | null)?.error;
  return new Error(typeof said === 'string' ? said : `the pc answered ${status}`);
}

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
    method === 'POST' && path === '/runs' ? START_TIMEOUT_MS : ASK_TIMEOUT_MS,
  );
  try {
    const response = await fetch(`http://${pair.host}:${pair.port}${path}`, {
      method,
      headers: { authorization, ...(text ? { 'content-type': 'application/json' } : {}) },
      body: text || undefined,
      signal: controller.signal,
    });
    return { status: response.status, body: await response.json().catch(() => null) };
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
    if (answer.status === 401) throw new Error(`${pair.name} no longer knows this phone — pair it again`);
    if (answer.status < 200 || answer.status >= 300) throw refusal(answer.status, answer.body);
    return answer.body;
  };
}

export function bridgeTransport(bridge: DeskBridge): DeskTransport {
  return async (method, path, body) => {
    const { status, body: answer } = await bridge.request(method, path, body);
    if (status < 200 || status >= 300) throw refusal(status, answer);
    return answer;
  };
}

export type TicketFor = { kind: 'view'; port: number } | { kind: 'screen' } | { kind: 'apk'; app: string };

export function deskCalls(send: DeskTransport) {
  return {
    info: async () => (await send('GET', '/desk')) as DeskInfo,
    runs: async () => ((await send('GET', '/runs')) as { runs: DeskRun[] }).runs,
    start: async (start: DeskStart) => ((await send('POST', '/runs', start)) as { run: DeskRun }).run,
    stop: async (id: string) => void (await send('POST', `/runs/${encodeURIComponent(id)}/stop`)),
    log: async (id: string) => ((await send('GET', `/runs/${encodeURIComponent(id)}/log`)) as { lines: DeskLogLine[] }).lines,
    ports: async () => ((await send('GET', '/ports')) as { ports: DeskPort[] }).ports,
    apks: async () => ((await send('GET', '/apks')) as { apks: DeskApk[] }).apks,
    ticket: async (what: TicketFor) => ((await send('POST', '/tickets', what)) as { url: string }).url,
  };
}

export type DeskCalls = ReturnType<typeof deskCalls>;
