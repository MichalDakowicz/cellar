import type { HostDeps } from './api.ts';

/** Remove finished workspaces after providers close, never between chat turns. */
export class WorktreeCleanup {
  private timer: ReturnType<typeof setInterval> | null = null;
  private pending: Promise<void> | null = null;
  private stopping = false;
  constructor(private readonly deps: HostDeps) {}
  start() {
    this.stopping = false;
    this.timer = setInterval(() => { void this.tick(); }, 30_000);
    this.timer.unref();
    void this.tick();
  }
  tick(): Promise<void> {
    if (this.stopping || !this.deps.account.current || !this.deps.worktrees) return Promise.resolve();
    if (this.pending) return this.pending;
    this.pending = this.deps.worktrees.cleanup((run) => this.stopping
      || !!this.deps.runs.runtime?.has(run.id)
      || !!this.deps.controls?.queue(run.id).items.length)
      .then((removed) => { if (removed.length) this.deps.events?.invalidate(); })
      .catch((error) => { console.error('Worktree cleanup deferred', error); })
      .finally(() => { this.pending = null; });
    return this.pending;
  }
  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.pending;
  }
}
