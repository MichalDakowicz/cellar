import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { request } from 'node:http';
import { CHECK_COMMANDS, parsePreviewAction, type ManagedPreview, type PreviewAction } from '@/lib/deskManagedPreview';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { keyScope } from './keyScope.ts';
import { PreviewStore } from './previewStore.ts';

async function freePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function answering(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = request({ host: '127.0.0.1', port, path: '/', timeout: 800 }, (res) => { res.resume(); resolve(true); });
    req.on('error', () => resolve(false)); req.on('timeout', () => req.destroy()); req.end();
  });
}

/** Only known dev servers accept allocated ports. Never silently fall back to another port. */
export function serverArgs(script: string, port: number): string[] {
  if (/\bvite\b/.test(script)) return ['--host', '127.0.0.1', '--port', String(port), '--strictPort'];
  if (/\bnext\s+dev\b/.test(script)) return ['--hostname', '127.0.0.1', '--port', String(port)];
  if (/\bexpo\s+start\b/.test(script)) return ['--host', 'lan', '--port', String(port)];
  if (/\breact-scripts\s+start\b/.test(script)) return [];
  throw new DeskError('Managed preview supports Vite, Next dev, Expo start or react-scripts start. Configure a dev script.', 409, { notStarted: true });
}

export class Previews {
  readonly store: PreviewStore;
  private readonly locks = new Map<string, Promise<unknown>>();
  constructor(dir: string, private readonly deps: HostDeps) { this.store = new PreviewStore(dir); }
  private owner() {
    const owner = this.deps.account.current?.userId;
    if (!owner) throw new DeskError('Sign in on the PC for managed previews.', 409);
    return owner;
  }
  list(): ManagedPreview[] {
    const owner = this.owner();
    return this.store.previews.filter((p) => p.owner === owner).map(({ owner: _owner, ...row }) => {
      const job = this.deps.jobs?.list().find((r) => r.id === row.jobId);
      const state = job?.state;
      return { ...row, state: state === 'running' ? row.state : state === 'stopped' ? 'stopped' : state === 'failed' || state === 'done' ? 'failed' : 'unknown' };
    });
  }
  opened(port: number) {
    const row = this.store.previews.find((p) => p.owner === this.deps.account.current?.userId && p.port === port && p.state === 'live');
    if (row) { row.openedAt = Date.now(); this.store.save(); }
  }
  receipt(id: string) { return this.store.receipt(this.owner(), id); }
  act(raw: unknown) {
    let action: PreviewAction;
    try { action = parsePreviewAction(raw); } catch { throw new DeskError('Invalid preview action.'); }
    const owner = this.owner();
    return this.store.act(owner, action, async () => {
      const run = this.deps.runs.ownedForSearch(action.runId, owner);
      if (!run) throw new DeskError('Select an owned agent run.', 403, { notStarted: true });
      const scope = await keyScope(this.deps, { projectId: action.projectId, runId: run.id, agent: run.agent, key: '@', query: '' }).catch((error) => {
        throw new DeskError(String(error), error instanceof DeskError ? error.status : 409, { notStarted: true });
      });
      const key = `${owner}:${scope.cwd}`;
      const prior = this.locks.get(key) ?? Promise.resolve();
      const work = prior.catch(() => {}).then(async () => {
        scope.unchanged();
        return this.execute(owner, action, scope.cwd, run.worktreeId, scope.unchanged);
      });
      this.locks.set(key, work);
      try { return await work; } finally { if (this.locks.get(key) === work) this.locks.delete(key); }
    });
  }
  private async execute(owner: string, action: PreviewAction, cwd: string, worktreeId: string | undefined, unchanged: () => void): Promise<ManagedPreview> {
    const jobs = this.deps.jobs!;
    const commands = this.deps.commands!;
    let row = this.store.previews.find((p) => p.owner === owner && p.cwd === cwd);
    if (action.action === 'start') {
      if (row && jobs.list().some((j) => j.id === row!.jobId && j.state === 'running')) return { ...row };
      if (row?.state === 'unknown' && await answering(row.port)) throw new DeskError('Previous preview still answers after restart. Stop it at the PC before starting another.', 409, { notStarted: true });
      const scripts = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')).scripts ?? {};
      const command = typeof scripts.dev === 'string' ? 'dev' : 'start';
      const port = await freePort();
      const args = serverArgs(String(scripts[command] ?? ''), port);
      const plan = await commands.plan(action.projectId, command, cwd);
      if (plan.steps.length !== 1 || plan.steps[0].runner !== 'npm' || plan.steps[0].task !== command) throw new DeskError('Preview dev command must be one npm script.', 409, { notStarted: true });
      unchanged();
      const job = await jobs.start({ ...plan, args, env: { PORT: String(port), BROWSER: 'none' } }, command, action.runId);
      const value = { id: randomUUID(), projectId: action.projectId, runId: action.runId, cwd, worktreeId, port, jobId: job.id,
        state: 'starting' as const, openedAt: null, checks: [] };
      if (row) Object.assign(row, value); else { row = { ...value, owner }; this.store.previews.push(row); }
      this.store.save();
      for (let i = 0; i < 100; i++) {
        unchanged();
        if (jobs.list().find((j) => j.id === job.id)?.state !== 'running') break;
        if (await answering(port)) { row.state = 'live'; this.store.save(); return { ...row }; }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      row.state = 'failed'; this.store.save();
      if (jobs.list().some((j) => j.id === job.id && j.state === 'running')) await jobs.stop(job.id);
      throw new DeskError('Dev server did not answer on its allocated port. Open the job log.', 409);
    }
    if (!row) throw new DeskError('Start this run’s preview first.', 409, { notStarted: true });
    if (action.action === 'stop') { await jobs.stop(row.jobId); row.state = 'stopped'; }
    if (action.action === 'checks') {
      if (row.checks.some((check) => jobs.list().some((j) => j.id === check.jobId && j.state === 'running'))) throw new DeskError('Checks already running.', 409, { notStarted: true });
      const plans = [];
      for (const command of CHECK_COMMANDS) {
        try { plans.push({ command, plan: await commands.plan(action.projectId, command, cwd) }); }
        catch (error) { if (!(error instanceof DeskError && error.status === 404)) throw error; }
      }
      if (!plans.length) throw new DeskError('Project has no check, typecheck, lint or test commands.', 409, { notStarted: true });
      row.checks = []; this.store.save();
      for (const { command, plan } of plans) {
        unchanged(); const job = await jobs.start({ ...plan, env: { CI: 'true' } }, command, action.runId);
        row.checks.push({ command, jobId: job.id }); this.store.save();
      }
    }
    if (action.action === 'deploy') {
      if (!row.openedAt && action.confirmUnopened !== true) throw new DeskError('Preview was never opened. Confirm deploy without previewing.', 409, { notStarted: true });
      if (row.deployJobId && jobs.list().some((j) => j.id === row!.deployJobId && j.state === 'running')) throw new DeskError('Deploy already running.', 409, { notStarted: true });
      const plan = await commands.plan(action.projectId, 'deploy', cwd); unchanged();
      row.deployJobId = (await jobs.start(plan, 'deploy', action.runId)).id;
    }
    this.store.save(); return { ...row };
  }
  async close(owner?: string) {
    for (const row of this.store.previews.filter((r) => !owner || r.owner === owner)) {
      if (this.deps.jobs?.list().some((j) => j.id === row.jobId && j.state === 'running')) {
        await this.deps.jobs.stop(row.jobId); row.state = 'stopped'; this.store.save();
      }
    }
  }
}
