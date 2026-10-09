import type { Server } from 'node:http';
import { appendFileSync, statSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';

import { deskPairUrl, type DeskPair } from '@/lib/deskPair';

import { Account, type DeskSession } from './account.ts';
import { handle, type ApiRequest, type ApiResponse, type HostDeps } from './api.ts';
import { CellarFallback } from './fallback.ts';
import { lanServer, listen } from './http.ts';
import { loadIdentity, rotateKey, saveIdentity, type Identity } from './identity.ts';
import { pickLanAddress } from './network.ts';
import { Proxies } from './proxy.ts';
import { Runs } from './runs.ts';
import { ScreenFeed, type FrameSource } from './screen.ts';
import { Tickets } from './tickets.ts';

/**
 * The pc side, put together: one identity, one run list, one LAN server, one
 * cellar fallback. Electron's main process owns one of these; nothing in here
 * imports Electron, so the whole of it runs (and is tested) under plain node.
 */

const LOG_MAX = 512 * 1024;

/**
 * `desk.log` in the app's data folder: one line per LAN request. Started over
 * when it passes half a megabyte — it is for "what just happened", not history.
 */
function requestLog(file: string): (line: string) => void {
  try {
    if (statSync(file).size > LOG_MAX) writeFileSync(file, '');
  } catch {
    // Not there yet.
  }
  return (line) => {
    try {
      appendFileSync(file, `${new Date().toISOString()} ${line}
`);
    } catch {
      // A log that cannot be written must never break a request.
    }
  };
}

export type HostOptions = {
  dataDir: string;
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  frames: FrameSource | null;
};

export type Pairing = { url: string; pair: DeskPair } | { url: null; reason: string };

export class DeskHost {
  /** What desk.json holds. The port actually bound can differ for this run — see `start`. */
  private identity: Identity;
  private boundPort: number | null = null;
  private server: Server | null = null;
  readonly account: Account;
  readonly deps: HostDeps;
  readonly fallback: CellarFallback;

  constructor(private readonly options: HostOptions) {
    this.identity = loadIdentity(options.dataDir);
    this.account = new Account(options.supabaseUrl, options.supabaseAnonKey);
    const tickets = new Tickets();
    this.deps = {
      identity: () => (this.boundPort ? { ...this.identity, port: this.boundPort } : this.identity),
      account: this.account,
      runs: new Runs(options.dataDir),
      tickets,
      proxies: new Proxies(tickets),
      lanHost: () => pickLanAddress(networkInterfaces()),
      version: options.version,
    };
    this.fallback = new CellarFallback(this.deps);
  }

  /** Start listening. Resolves with the port actually bound, which may be one of the ten after the configured one. */
  async start(): Promise<number> {
    this.server = lanServer(
      this.deps,
      this.options.frames ? new ScreenFeed(this.options.frames) : null,
      requestLog(join(this.options.dataDir, 'desk.log')),
    );
    const port = await listen(this.server, this.identity.port);
    // Held for this run only. Saved, a port taken once by something else would
    // become the pc's address for good, and every paired phone would lose it.
    this.boundPort = port;
    return port;
  }

  stop(): void {
    this.fallback.stop();
    this.server?.close();
  }

  /** The window's way in. Same answers as the LAN, without the key — the window is this pc. */
  request(req: ApiRequest): Promise<ApiResponse> {
    return handle(this.deps, req);
  }

  setSession(session: DeskSession | null): void {
    this.account.setSession(session);
  }

  /** What the QR code on the pc says. Only ever handed to this pc's own window, never served. */
  pairing(): Pairing {
    const host = this.deps.lanHost();
    if (!host) return { url: null, reason: 'this pc is not on a network a phone can reach' };
    const identity = this.deps.identity();
    const pair: DeskPair = { id: identity.id, name: identity.name, host, port: identity.port, key: identity.key };
    return { url: deskPairUrl(pair), pair };
  }

  /** Forget every paired phone, and every page or screen a phone has open. */
  forgetPhones(): void {
    this.identity = rotateKey(this.options.dataDir, this.identity);
    this.deps.tickets.clear();
  }

  rename(name: string): void {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!clean) return;
    this.identity = { ...this.identity, name: clean };
    saveIdentity(this.options.dataDir, this.identity);
  }
}
