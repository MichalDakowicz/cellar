import { appendFileSync } from 'node:fs';
import type { DeskStart } from '@/lib/deskProtocol';
import type { Approvals } from './approvals.ts';
import { startCodex, type ManagedSession } from './codexRuntime.ts';
import { startClaudeSdk } from './claudeRuntime.ts';
import { toolPath } from './tools.ts';
import { DeskError } from './claudeRuns.ts';

export class ManagedRuns {
  private sessions = new Map<string, { owner: string; session: ManagedSession }>();
  private closing = false;
  constructor(readonly approvals: Approvals) {}
  has(id: string) { return this.sessions.has(id); }
  async start(start: DeskStart, id: string, owner: string, logFile: string, env: NodeJS.ProcessEnv, done: (code: number | null) => void) {
    if (this.closing) throw new DeskError('PC is shutting down; nothing started.', 409, { notStarted: true });
    const path = await toolPath(start.agent);
    if (!path) throw new DeskError(`${start.agent} is not installed on this PC.`, 409, { notStarted: true });
    const log = (row: unknown) => appendFileSync(logFile, JSON.stringify(row) + '\n');
    let ended = false;
    const finish = (code: number | null) => { ended = true; this.sessions.delete(id); done(code); };
    try {
      const session = await (start.agent === 'codex' ? startCodex : startClaudeSdk)(path, start, id, owner, this.approvals, env, log, finish);
      if (this.closing) { await session.close(); throw new DeskError('PC shut down during provider initialization; inspect the original run.', 409); }
      if (!ended) this.sessions.set(id, { owner, session });
    } catch (error) { log({ type: 'error', message: String(error) }); throw error; }
  }
  async stop(id: string) {
    const value = this.sessions.get(id);
    if (!value) throw new DeskError('Provider disconnected; stop this run at the PC.', 409);
    await value.session.stop();
  }
  private async closeSession(session: ManagedSession) {
    try { await session.stop(); } finally { await session.close(); }
  }
  async stopOwner(owner: string) { await Promise.allSettled([...this.sessions.values()].filter((value) => value.owner === owner).map((value) => this.closeSession(value.session))); }
  async close() { this.closing = true; await Promise.allSettled([...this.sessions.values()].map((value) => this.closeSession(value.session))); }
}
