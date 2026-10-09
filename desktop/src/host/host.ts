import type { Server } from 'node:http';
import { networkInterfaces } from 'node:os';

import { deskPairUrl, type DeskPair } from '@/lib/deskPair';

import { Account, type DeskSession } from './account.ts';
import { handle, type ApiRequest, type ApiResponse, type HostDeps } from './api.ts';
import { CellarFallback } from './fallback.ts';
import { lanServer, listen } from './http.ts';
import { loadIdentity, rotateKey, saveIdentity, type Identity } from './identity.ts';
import { pickLanAddress } from './network.ts';
import { Proxies } from './proxy.ts';
import { Runs } from './runs.ts';
import type { FrameSource } from './screen.ts';
import { Tickets } from './tickets.ts';

/**
 * The pc side, put together: one identity, one run list, one LAN server, one
 * cellar fallback. Electron's main process owns one of these; nothing in here
 * imports Electron, so the whole of it runs (and is tested) under plain node.
 */

export type HostOptions = {
  dataDir: string;
  version: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  frames: FrameSource | null;
};

export type Pairing = { url: string; pair: DeskPair } | { url: null; reason: string };

export class DeskHost {
  private identity: Identity;
  private server: Server | null = null;
  readonly account: Account;
  readonly deps: HostDeps;
  readonly fallback: CellarFallback;

  constructor(private readonly options: HostOptions) {
    this.identity = loadIdentity(options.dataDir);
    this.account = new Account(options.supabaseUrl, options.supabaseAnonKey);
    const tickets = new Tickets();
    this.deps = {
      identity: () => this.identity,
      account: this.account,
      runs: new Runs(options.dataDir),
      tickets,
      proxies: new Proxies(tickets),
      lanHost: () => pickLanAddress(networkInterfaces()),
      version: options.version,
    };
    this.fallback = new CellarFallback(this.deps);
  }

  /** Start listening. Resolves with the port actually bound, which may be one of the ten after the saved one. */
  async start(): Promise<number> {
    this.server = lanServer(this.deps, this.options.frames);
    const port = await listen(this.server, this.identity.port);
    if (port !== this.identity.port) {
      this.identity = { ...this.identity, port };
      saveIdentity(this.options.dataDir, this.identity);
    }
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
    const pair: DeskPair = {
      id: this.identity.id,
      name: this.identity.name,
      host,
      port: this.identity.port,
      key: this.identity.key,
    };
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
