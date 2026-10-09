import type { DeskPair } from '@/lib/deskPair';
import type { DeskApk, DeskInfo, DeskLogLine, DeskPort, DeskRun, DeskStart } from '@/lib/deskProtocol';

import type { DeskBridge } from './bridge';

/**
 * The pc's API, over whichever wire reaches it: the LAN with the paired key,
 * or the desktop window's bridge. Both answer the same paths with the same
 * bodies, so everything above this file is written once.
 */

export type DeskTransport = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;

/** The pc did not answer at all — off, asleep, or on another network. Not the same as a refusal. */
export class DeskUnreachable extends Error {}

const LAN_TIMEOUT_MS = 4000;

function refusal(status: number, body: unknown): Error {
  const said = (body as { error?: unknown } | null)?.error;
  return new Error(typeof said === 'string' ? said : `the pc answered ${status}`);
}

export function lanTransport(pair: DeskPair): DeskTransport {
  return async (method, path, body) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LAN_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`http://${pair.host}:${pair.port}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${pair.key}`,
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new DeskUnreachable(`${pair.name} is not answering on this network`);
    } finally {
      clearTimeout(timer);
    }
    const answer: unknown = await response.json().catch(() => null);
    if (response.status === 401) throw new Error(`${pair.name} no longer knows this phone — pair it again`);
    if (!response.ok) throw refusal(response.status, answer);
    return answer;
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
