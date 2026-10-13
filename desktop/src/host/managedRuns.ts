import { appendFileSync } from 'node:fs';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import { startCodex, type ManagedSession } from './codexRuntime.ts';
import { startClaudeSdk } from './claudeRuntime.ts';
import { toolPath } from './tools.ts';
import { DeskError } from './claudeRuns.ts';
import type { TurnChanged } from './managedSession.ts';

export class ManagedRuns {
  private sessions = new Map<string, { owner: string; session: ManagedSession; start: DeskStart }>();
  private closing = false;
  private stopping = new Set<string>();
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(readonly approvals: Approvals) {}
  has(id: string) { return this.sessions.has(id); }
  get(owner: string, id: string) { const value = this.sessions.get(id); return !this.closing && !this.stopping.has(id) && value?.owner === owner ? value : null; }
  onIdle: (owner: string, id: string) => void = () => {};
  async start(start: DeskStart, id: string, owner: string, logFile: string, env: NodeJS.ProcessEnv, done: (code: number | null) => void) {
    if (this.closing) throw new DeskError('PC is shutting down; nothing started.', 409, { notStarted: true });
    const path = await toolPath(start.agent);
    if (!path) throw new DeskError(`${start.agent} is not installed on this PC.`, 409, { notStarted: true });
    const log = (row: unknown) => appendFileSync(logFile, JSON.stringify(row) + '\n');
    let ended = false; let lastCode: number | null | undefined;
    const turnChanged: TurnChanged = (code) => {
      lastCode = code; done(code as number | null); clearTimeout(this.idleTimers.get(id)); this.idleTimers.delete(id);
      if (code !== undefined) {
        queueMicrotask(() => this.onIdle(owner, id));
        const timer = setTimeout(() => { const value = this.get(owner, id); if (value && !value.session.busy()) void value.session.close(); }, 30 * 60_000);
        timer.unref(); this.idleTimers.set(id, timer);
      }
    };
    const finish = (code: number | null) => { ended = true; clearTimeout(this.idleTimers.get(id)); this.idleTimers.delete(id); this.sessions.delete(id); done(lastCode === undefined ? code : lastCode); };
    try {
      const session = await (start.agent === 'codex' ? startCodex : startClaudeSdk)(path, start, id, owner, this.approvals, env, log, finish, turnChanged);
      if (this.closing) { await session.close(); throw new DeskError('PC shut down during provider initialization; inspect the original run.', 409); }
      if (!ended) this.sessions.set(id, { owner, session, start });
    } catch (error) { log({ type: 'error', message: String(error) }); throw error; }
  }
  async stop(id: string) {
    const value = this.sessions.get(id);
    if (!value) throw new DeskError('Provider disconnected; stop this run at the PC.', 409);
    this.stopping.add(id);
    try { await value.session.stop(); } catch (error) { this.stopping.delete(id); throw error; }
  }
  private async closeSession(session: ManagedSession) {
    try { await session.stop(); } finally { await session.close(); }
  }
  async stopOwner(owner: string) {
    const values = [...this.sessions.entries()].filter(([, value]) => value.owner === owner);
    values.forEach(([id]) => this.stopping.add(id));
    await Promise.allSettled(values.map(([, value]) => this.closeSession(value.session)));
  }
  async close() { this.closing = true; await Promise.allSettled([...this.sessions.values()].map((value) => this.closeSession(value.session))); }
}
