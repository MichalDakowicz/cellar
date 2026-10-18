import { RunEvents } from './runEvents.ts';
import { Approvals } from './approvals.ts';
import { ManagedRuns } from './managedRuns.ts';
import { ControlStore } from './controlStore.ts';
import { Dispatch } from './dispatch.ts';
import { Controls } from './controls.ts';
import { dispatchCommand } from './dispatchCommand.ts';
import type { Server } from 'node:http';
import { appendFileSync, statSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { generateWorktreeName } from './worktreeName.ts';

import { deskPairUrl, type DeskPair } from '@/lib/deskPair';

import { Account, type DeskSession } from './account.ts';
import { handle, type ApiRequest, type ApiResponse, type HostDeps } from './api.ts';
import { CellarFallback } from './fallback.ts';
import { lanServer, listen } from './http.ts';
import { loadIdentity, rotateKey, saveIdentity, type Identity } from './identity.ts';
import { pickLanAddress, pickTailnetAddress } from './network.ts';
import { Proxies } from './proxy.ts';
import { Runs } from './runs.ts';
import { Commands } from './commands.ts';
import { Jobs } from './jobs.ts';
import { Previews } from './previews.ts';
import { HostNotifications, type DeskActivity } from './notifications.ts';
import { Receipts } from './receipts.ts';
import { Worktrees } from './worktrees.ts';
import { ScreenFeed, type FrameSource } from './screen.ts';
import { Tickets } from './tickets.ts';
import { Checkpoints } from './checkpoints.ts';
import { Automation } from './automation.ts';
import { ProviderAccounts, type SecretVault } from './providerAccounts.ts';
import { WorktreeCleanup } from './worktreeCleanup.ts';
import { ScreenControl, type ScreenAdapter } from './screenControl.ts';
import { Phones } from './phones.ts';
import { Orchestrations } from './orchestrations.ts';

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
  phoneServerFile?: string;
  screenAdapter?: ScreenAdapter;
  vault?: SecretVault;
  activity?: () => DeskActivity;
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
  private stopping: Promise<void> | null = null;
  readonly account: Account;
  readonly deps: HostDeps;
  readonly fallback: CellarFallback;
  private readonly cleanup: WorktreeCleanup;

  constructor(private readonly options: HostOptions) {
    this.identity = loadIdentity(options.dataDir);
    this.account = new Account(options.supabaseUrl, options.supabaseAnonKey);
    const tickets = new Tickets();
    this.deps = {
      phoneServerFile: options.phoneServerFile,
      identity: () => (this.boundPort ? { ...this.identity, port: this.boundPort } : this.identity),
      account: this.account,
      runs: new Runs(options.dataDir, undefined, () => this.account.current?.userId ?? null),
      commands: new Commands(options.dataDir, this.account),
      jobs: new Jobs(options.dataDir, () => this.account.current?.userId ?? null),
      receipts: new Receipts(options.dataDir),
      tickets,
      proxies: new Proxies(tickets, (port) => this.deps.previews?.opened(port)),
      lanHost: () => pickLanAddress(networkInterfaces()),
      version: options.version,
    };
    this.deps.worktrees = new Worktrees(options.dataDir, this.account, async () => [...await this.deps.runs.list(), ...this.deps.jobs!.list()],
      join(this.identity.workspace, '.cellar-worktrees'), async (start) => {
        const context = start.entryIds?.length ? await this.account.ruleContext(start.entryIds) : null;
        return generateWorktreeName({ ...start, prompt: context ? `${start.prompt}\nAttached thoughts: ${JSON.stringify(context.entries)}` : start.prompt },
          this.deps.providerAccounts!.environment(start, randomBytes(8).toString('hex'), process.env));
      });
    if (options.screenAdapter) this.deps.screenControl = new ScreenControl(options.dataDir, () => ({ owner: this.account.current?.userId ?? null, key: this.identity.key }), options.screenAdapter);
    this.deps.phones = new Phones(this.deps);
    this.deps.previews = new Previews(options.dataDir, this.deps);
    this.deps.notifications = new HostNotifications(this.deps, options.activity ?? (() => ({ idleSeconds: 300, locked: true })));
    this.deps.events = new RunEvents(options.dataDir, this.deps);
    const changed = () => { this.deps.events!.invalidate(); if (this.boundPort && !this.stopping) void this.cleanup.tick(); };
    this.deps.runs.onChange = changed;
    this.deps.jobs!.onChange = changed;
    this.deps.approvals = new Approvals(join(options.dataDir, 'approvals.sqlite'), (owner, rows) => this.deps.events!.store.approvals(owner, rows));
    this.deps.runs.runtime = new ManagedRuns(this.deps.approvals);
    this.deps.checkpoints = new Checkpoints(options.dataDir, this.deps);
    this.deps.automation = new Automation(options.dataDir, this.deps);
    this.deps.providerAccounts = new ProviderAccounts(options.dataDir, () => this.account.current?.userId ?? null, options.vault);
    this.deps.runs.environment = (start, runId, base) => ({ ...this.deps.providerAccounts!.environment(start, runId, base), ...this.deps.phones!.environment(this.account.current!.userId, runId, this.deps.identity().port) });
    this.deps.runs.runtime.checkpoints = this.deps.checkpoints;
    this.deps.runs.runtime.afterTurn = async (owner, runId, start) => {
      if (this.account.current?.userId !== owner || !start.projectId) throw new Error('Account changed before recipe commands.');
      const plans = await Promise.all((start.afterCommands ?? []).map((command) => this.deps.commands!.plan(start.projectId!, command, start.cwd)));
      if (plans.length) await this.deps.jobs!.start({ ...plans[0], steps: plans.flatMap((p) => p.steps) }, 'recipe-after', runId);
    };
    this.deps.controls = new Controls(this.deps, new Dispatch(new ControlStore(join(options.dataDir, 'controls.sqlite')), this.deps.runs.runtime, (item, start) => dispatchCommand(this.deps, item, start)));
    this.fallback = new CellarFallback(this.deps);
    this.cleanup = new WorktreeCleanup(this.deps);
    this.deps.orchestrations = new Orchestrations(options.dataDir, this.deps);
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
    this.deps.events!.start();
    this.deps.notifications?.start();
    this.cleanup.start();
    this.deps.orchestrations?.start();
    return port;
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.fallback.stop();
    this.deps.screenControl?.revoke();
    this.deps.phones?.reset();
    this.deps.notifications?.stop();
    this.server?.close();
    this.stopping = (async () => {
      await this.deps.orchestrations?.close();
      await this.cleanup.stop();
      // Providers must release callbacks while the event store can still publish expiry.
      await this.deps.runs.runtime?.close();
      await this.deps.previews?.close();
      this.deps.proxies.close();
      await this.deps.events?.stop();
      this.deps.approvals?.close();
      this.deps.controls?.dispatch.store.close();
    })();
    return this.stopping;
  }

  /** The window's way in. Same answers as the LAN, without the key — the window is this pc. */
  request(req: ApiRequest): Promise<ApiResponse> {
    if (this.stopping) return Promise.resolve({ status: 503, body: { error: 'PC is shutting down; no new commands accepted.' } });
    return handle(this.deps, { ...req, source: 'pc' });
  }

  setSession(session: DeskSession | null): void {
    const previous = this.account.current?.userId;
    if (previous !== session?.userId) { this.deps.screenControl?.revoke(); this.deps.phones?.reset(); this.deps.tickets.clear(); }
    if (previous && previous !== session?.userId) void this.deps.runs.runtime?.stopOwner(previous);
    if (previous && previous !== session?.userId) void this.deps.jobs?.stopOwner(previous).catch((error) => console.error('Jobs could not stop after account change', error));
    this.account.setSession(session);
    if (this.boundPort && !this.stopping) void this.cleanup.tick();
  }

  /** What the QR code on the pc says. Only ever handed to this pc's own window, never served. */
  pairing(network: 'lan' | 'tailnet' = 'lan'): Pairing {
    const host = network === 'tailnet' ? pickTailnetAddress(networkInterfaces()) : this.deps.lanHost();
    if (!host) return { url: null, reason: 'this pc is not on a network a phone can reach' };
    const identity = this.deps.identity();
    const pair: DeskPair = { id: identity.id, name: identity.name, host, port: identity.port, key: identity.key };
    return { url: deskPairUrl(pair), pair };
  }

  /** Forget every paired phone, and every page or screen a phone has open. */
  forgetPhones(): void {
    this.deps.screenControl?.forget();
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
