import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import type { ConversationPoint, DeskCheckpoint, CheckpointReceipt } from '@/lib/deskCheckpoints';
import type { HostDeps } from './api.ts';
import { keyScope } from './keyScope.ts';
import { snapshot, checkpointGit, restoreSnapshot } from './checkpointGit.ts';
import { DeskError } from './claudeRuns.ts';

type Row = DeskCheckpoint & { owner: string; cwd: string; ref: string; tree: string };
export class Checkpoints {
  private rows: Row[] = [];
  private receipts: Record<string, CheckpointReceipt> = {};
  private requests: Record<string, string> = {};
  private locked = new Set<string>();
  private file: string;
  constructor(dir: string, private deps: HostDeps) {
    this.file = join(dir, 'checkpoints.json');
    try { const saved = JSON.parse(readFileSync(this.file, 'utf8')); this.rows = saved.rows; this.receipts = saved.receipts; this.requests = saved.requests ?? {}; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  private save() { writeFileSync(this.file + '.tmp', JSON.stringify({ rows: this.rows, receipts: this.receipts, requests: this.requests })); renameSync(this.file + '.tmp', this.file); }
  async capture(owner: string, runId: string, cwd: string, point: ConversationPoint, label: string) {
    const git = await snapshot(cwd, createHash('sha256').update(owner).digest('hex').slice(0, 16) + '/' + runId);
    const row = { id: randomUUID(), runId, owner, cwd, point, label, at: Date.now(), ...git };
    this.rows.push(row); this.save(); return row;
  }
  private async scope(runId: string) {
    const owner = this.deps.account.current?.userId;
    const run = owner && this.deps.runs.ownedForSearch(runId, owner);
    if (!run) throw new DeskError('Checkpoint run is not owned by this account.', 403);
    return { run, ...(await keyScope(this.deps, { runId, projectId: run.projectId!, agent: run.agent, key: '@', query: '' })) };
  }
  async list(runId: string) {
    const { owner } = await this.scope(runId);
    return this.rows.filter((row) => row.owner === owner && row.runId === runId).map(({ id, at, point, label }) => ({ id, runId, at, point, label }));
  }
  receipt(raw: unknown) {
    const request = raw as import('@/lib/deskCheckpoints').CheckpointRequest;
    const owner = this.deps.account.current?.userId;
    if (!owner) throw new DeskError('Sign in on the PC.', 403);
    if (!request || typeof request.commandId !== 'string') throw new DeskError('Choose a rollback command.');
    const key = owner + ':' + request.commandId;
    const receipt = this.receipts[key];
    if (receipt && this.requests[key] !== JSON.stringify([request.runId, request.checkpointId, request.token])) throw new DeskError('Rollback command was reused.', 409);
    return receipt ?? null;
  }
  private async prepare(runId: string, id: string) {
    const scope = await this.scope(runId); const row = this.rows.find((row) => row.id === id && row.owner === scope.owner && row.runId === runId);
    if (!row || row.cwd !== scope.cwd) throw new DeskError('Checkpoint unavailable for this folder.', 404);
    const live = this.deps.runs.runtime?.get(scope.owner, runId);
    if (!live || live.session.busy() || this.deps.controls?.queue(runId).items.length) throw new DeskError('Wait for an idle connected run with an empty queue.', 409);
    if ([...await this.deps.runs.list(), ...(this.deps.jobs?.list() ?? [])].some((run) => run.id !== runId && run.cwd.toLowerCase() === scope.cwd.toLowerCase() && ['running', 'waiting', 'unknown'].includes(run.state))) throw new DeskError('Another run or job may be changing this checkout; rollback refused.', 409);
    const current = await snapshot(scope.cwd, 'reviews/' + runId);
    const point = live.session.point?.();
    if (!point || !live.session.restore || row.point.turns > point.turns) throw new DeskError('Provider cannot restore this checkpoint.', 409);
    const token = createHash('sha256').update(JSON.stringify([row.id, current.tree, point])).digest('hex');
    scope.unchanged(); return { ...scope, row, live, current, point, token };
  }
  async review(runId: string, id: string) {
    const { row, current, token } = await this.prepare(runId, id);
    const diff = await checkpointGit(row.cwd, ['diff', '--no-ext-diff', '--no-textconv', current.ref, row.ref, '--']);
    return { checkpoint: { id: row.id, runId, at: row.at, point: row.point, label: row.label }, token, diff: diff.slice(0, 100_000), truncated: diff.length > 100_000 };
  }
  async rollback(body: unknown) {
    const raw = body as { commandId?: string; runId?: string; checkpointId?: string; token?: string };
    if (!raw || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw.commandId ?? '') || typeof raw.runId !== 'string' || typeof raw.checkpointId !== 'string' || typeof raw.token !== 'string') throw new DeskError('Invalid checkpoint rollback.');
    const owner = this.deps.account.current?.userId; if (!owner) throw new DeskError('Sign in on the PC.', 403);
    const key = owner + ':' + raw.commandId;
    const fingerprint = JSON.stringify([raw.runId, raw.checkpointId, raw.token]);
    if (this.receipts[key]) { if (this.receipts[key].checkpointId !== raw.checkpointId || (this.requests[key] && this.requests[key] !== fingerprint)) throw new DeskError('Rollback command was reused.', 409); return this.receipts[key]; }
    if (this.locked.has(raw.runId)) throw new DeskError('Rollback already in progress.', 409);
    this.locked.add(raw.runId);
    try {
      const p = await this.prepare(raw.runId, raw.checkpointId);
      if (p.token !== raw.token) throw new DeskError('Files or conversation changed; review again.', 409);
      const diff = await checkpointGit(p.cwd, ['diff', '--no-ext-diff', '--no-textconv', p.current.ref, p.row.ref, '--']);
      if (diff.length > 100_000) throw new DeskError('Diff exceeds review limit; rollback refused.', 409);
      const receipt: CheckpointReceipt = { commandId: raw.commandId!, checkpointId: raw.checkpointId, state: 'unknown' };
      this.receipts[key] = receipt; this.requests[key] = fingerprint; this.save();
      try {
        await p.live.session.restore!(p.row.point, async () => {
          await restoreSnapshot(p.cwd, p.row.ref, p.current.ref);
          p.unchanged();
          await this.capture(owner, raw.runId!, p.cwd, p.live.session.point!(), 'rollback restored');
          receipt.state = 'applied'; this.save();
        });
      } catch (error) { receipt.state = 'unknown'; receipt.error = `Rollback incomplete; recovery ref ${p.current.ref}: ${String(error)}`; }
      this.save(); return receipt;
    } finally { this.locked.delete(raw.runId); }
  }
}
