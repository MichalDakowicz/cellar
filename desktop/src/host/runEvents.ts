import { join } from 'node:path';
import type { HostDeps } from './api.ts';
import { hostRuns } from './api.ts';
import { EventStore } from './eventStore.ts';
import { ingestSource, type EventSource } from './eventIngest.ts';

/** Host ingests files; clients never need to poll them. Failed reads are stream errors. */
export class RunEvents {
  readonly store: EventStore;
  error: string | null = null;
  private sources: EventSource[] = [];
  private owner: string | null = null;
  private nextCatalog = 0;
  private pending: Promise<void> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(dir: string, private readonly deps: HostDeps) { this.store = new EventStore(join(dir, 'events.sqlite')); }
  start() { this.timer = setInterval(() => { void this.refresh(); }, 400); this.timer.unref(); }
  async stop() { if (this.timer) clearInterval(this.timer); await this.pending; this.store.close(); }
  refresh(): Promise<void> {
    if (this.pending) return this.pending;
    this.pending = this.update().finally(() => { this.pending = null; });
    return this.pending;
  }
  private async update(): Promise<void> {
    const owner = this.deps.account.current?.userId ?? null;
    if (!owner) { this.owner = null; this.sources = []; this.error = 'Sign in on the PC to read run events.'; return; }
    if (owner !== this.owner) { this.owner = owner; this.sources = []; this.nextCatalog = 0; }
    try {
      if (Date.now() >= this.nextCatalog) {
        const runs = await hostRuns(this.deps);
        if (this.deps.account.current?.userId !== owner) return;
        // PC sessions are external processes. Expose only folders belonging to this account.
        const visible = [];
        for (const run of runs) if (run.origin === 'phone' || await this.deps.account.allows(run.cwd)) visible.push(run);
        if (this.deps.account.current?.userId !== owner) return;
        this.store.catalog(owner, visible);
        this.sources = [...this.deps.runs.eventSources(visible), ...(this.deps.jobs?.eventSources() ?? [])];
        this.nextCatalog = Date.now() + 3000;
      }
      for (const source of this.sources) {
        if (this.deps.account.current?.userId !== owner) return;
        await ingestSource(this.store, owner, source);
      }
      this.error = null;
    } catch (error) { this.error = error instanceof Error ? error.message : String(error); this.nextCatalog = 0; }
  }
}
