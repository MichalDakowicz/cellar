import type { DeskPort } from '@/lib/deskProtocol';

import { runTool } from './tools.ts';

/**
 * What is listening on this pc that a phone might want to look at: a dev
 * server, an `expo start --web`, a preview build.
 *
 * Windows only, read from `netstat` and `tasklist` — no native module, and both
 * ship with every Windows install. Ports under 1024 and the system's own
 * listeners are left out: nobody opens the RPC endpoint mapper on a phone.
 */

const LOCAL = /^(?:127\.0\.0\.1|0\.0\.0\.0|\[::\]|\[::1\]):(\d+)$/;

const SYSTEM = new Set(
  ['system', 'svchost.exe', 'lsass.exe', 'wininit.exe', 'services.exe', 'spoolsv.exe', 'jhi_service.exe', 'mdnsresponder.exe'].map(
    (name) => name.toLowerCase(),
  ),
);

/** `netstat -ano -p TCP` (and its TCPv6 twin) → port → pid, listening sockets only. */
export function parseNetstat(text: string): Map<number, number> {
  const out = new Map<number, number>();
  for (const line of text.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5 || !/^TCP/i.test(cols[0]) || cols[3] !== 'LISTENING') continue;
    const match = LOCAL.exec(cols[1]);
    if (!match) continue;
    const port = Number(match[1]);
    const pid = Number(cols[4]);
    if (port < 1024 || !Number.isInteger(pid)) continue;
    if (!out.has(port)) out.set(port, pid);
  }
  return out;
}

/** `tasklist /FO CSV /NH` → pid → image name. */
export function parseTasklist(text: string): Map<number, string> {
  const out = new Map<number, string>();
  for (const line of text.split(/\r?\n/)) {
    const cols = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    if (cols.length < 2) continue;
    const pid = Number(cols[1]);
    if (Number.isInteger(pid)) out.set(pid, cols[0]);
  }
  return out;
}

export function listeningPorts(
  sockets: Map<number, number>,
  names: Map<number, string>,
  hidden: ReadonlySet<number>,
): DeskPort[] {
  const ports: DeskPort[] = [];
  for (const [port, pid] of sockets) {
    if (hidden.has(port)) continue;
    const process = names.get(pid) ?? null;
    if (process && SYSTEM.has(process.toLowerCase())) continue;
    ports.push({ port, pid, process });
  }
  return ports.sort((a, b) => a.port - b.port);
}

export async function readPorts(hidden: ReadonlySet<number>): Promise<DeskPort[]> {
  if (process.platform !== 'win32') return [];
  const [v4, v6, tasks] = await Promise.all([
    runTool('netstat', ['-ano', '-p', 'TCP'], { timeout: 10_000 }),
    runTool('netstat', ['-ano', '-p', 'TCPv6'], { timeout: 10_000 }),
    runTool('tasklist', ['/FO', 'CSV', '/NH'], { timeout: 10_000 }),
  ]);
  return listeningPorts(parseNetstat(`${v4.stdout}\n${v6.stdout}`), parseTasklist(tasks.stdout), hidden);
}
