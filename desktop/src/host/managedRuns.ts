import { appendFileSync } from 'node:fs';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import { startCodex, type ManagedSession } from './codexRuntime.ts';
import { startClaudeSdk } from './claudeRuntime.ts';
import { toolPath } from './tools.ts';
import { DeskError } from './claudeRuns.ts';
import type { TurnChanged } from './managedSession.ts';
import type { Checkpoints } from './checkpoints.ts';

export class ManagedRuns {
  private sessions = new Map<string, { owner: string; session: ManagedSession; start: DeskStart }>();
  private closing = false;
  private stopping = new Set<string>();
  private idleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  constructor(readonly approvals: Approvals) {}
  checkpoints?: Checkpoints;
  afterTurn: (owner: string, runId: string, start: DeskStart) => Promise<void> = async () => {};
  has(id: string) { return this.sessions.has(id); }
  get(owner: string, id: string) { const value = this.sessions.get(id); return !this.closing && !this.stopping.has(id) && value?.owner === owner ? value : null; }
  onIdle: (owner: string, id: string) => void = () => {};
  async start(start: DeskStart, id: string, owner: string, logFile: string, env: NodeJS.ProcessEnv, done: (code: number | null) => void) {
    if (this.closing) throw new DeskError('PC is shutting down; nothing started.', 409, { notStarted: true });
    const path = await toolPath(start.agent);
    if (!path) throw new DeskError(`${start.agent} is not installed on this PC.`, 409, { notStarted: true });
    const secrets = [env.OPENAI_API_KEY, env.ANTHROPIC_API_KEY, env.CLAUDE_CODE_OAUTH_TOKEN].filter((value): value is string => !!value);
    const log = (row: unknown) => { let text = JSON.stringify(row); for (const secret of secrets) text = text.split(secret).join('[redacted]'); appendFileSync(logFile, text + '\n'); };
    log({ type: 'diagnostic', message: `Provider executable: ${path}` });
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
      let capture = Promise.resolve(); let pendingCompletion: number | null | undefined; let boundaryBusy = false; let exclusive = false; let maintenanceFailed = false;
      const changed: TurnChanged = (code, maintenance = false) => {
        if (maintenance) { turnChanged(code); return; }
        if (code === undefined) { turnChanged(code); return; }
        const value = this.sessions.get(id);
        if (!value) { pendingCompletion = code; return; }
        boundaryBusy = true;
        if (value?.session.point && this.checkpoints) capture = capture.catch(() => {}).then(async () => { await this.checkpoints!.capture(owner, id, start.cwd, value.session.point!(), 'turn complete'); });
        void capture.then(async () => { if (code === 0 && start.afterCommands?.length) await this.afterTurn(owner, id, start); boundaryBusy = false; turnChanged(code); }).catch((error) => { boundaryBusy = false; log({ type: 'error', message: `Turn follow-up failed: ${String(error)}` }); capture = Promise.resolve(); turnChanged(code); });
      };
      try { await this.checkpoints?.capture(owner, id, start.cwd, { turns: 0 }, 'before first turn'); }
      catch (error) { log({ type: 'diagnostic', message: `Initial checkpoint unavailable: ${String(error)}` }); }
      const session = await (start.agent === 'codex' ? startCodex : startClaudeSdk)(path, start, id, owner, this.approvals, env, log, finish, changed);
      const send = session.send;
      const busy = session.busy; const rollback = session.rollback;
      session.busy = () => maintenanceFailed || exclusive || boundaryBusy || busy();
      session.send = async (...args) => {
        await capture;
        if (maintenanceFailed || exclusive || busy()) throw new Error('Run is busy restoring or processing another turn.');
        exclusive = true;
        try { if (session.point && this.checkpoints) await this.checkpoints.capture(owner, id, start.cwd, session.point(), 'before next turn'); await send(...args); }
        finally { exclusive = false; }
      };
      if (rollback) session.rollback = async (point) => { await capture; if (exclusive || boundaryBusy || busy()) throw new Error('Wait for idle run.'); exclusive = true; try { await rollback(point); } finally { exclusive = false; } };
      if (rollback) session.restore = async (point, files) => {
        await capture; if (maintenanceFailed || exclusive || boundaryBusy || busy()) throw new Error('Wait for idle run.'); exclusive = true;
        try { await rollback(point); await files(); log({ type: 'cellar.rollback', id: `${Date.now()}`, turns: point.turns, text: `Restored files and provider conversation to turn ${point.turns}. Earlier displayed messages after that turn are retained history, not active provider context.` }); }
        catch (error) { maintenanceFailed = true; throw error; }
        finally { exclusive = false; if (!maintenanceFailed) queueMicrotask(() => this.onIdle(owner, id)); }
      };
      if (this.closing) { await session.close(); throw new DeskError('PC shut down during provider initialization; inspect the original run.', 409); }
      if (!ended) { this.sessions.set(id, { owner, session, start }); if (pendingCompletion !== undefined) changed(pendingCompletion); }
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
