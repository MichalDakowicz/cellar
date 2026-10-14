import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseOrchestration, orchestrationSummary, type Orchestration, type OrchestrationAction, type OrchestrationView } from '@/lib/deskOrchestration';
import { providerUsage } from '@/lib/deskUsage';
import { scopedRules } from '@/lib/deskRecipes';
import type { HostDeps } from './api.ts';
import { DeskError } from './claudeRuns.ts';
import { git, repository } from './worktreeGit.ts';
import { startTask } from './startTask.ts';
import { toolPath } from './tools.ts';

type Stored = Orchestration & { owner: string; fingerprint: string };
type ActionReceipt = { owner: string; id: string; action: string; commandId: string; fingerprint: string; state: 'pending' | 'confirmed' | 'unknown' | 'failed'; error?: string };
const finished = (state: string) => ['done', 'failed', 'stopped'].includes(state);
/** Host-owned durable plans. Timer dispatches persisted starts; uncertain effects never replay. */
export class Orchestrations {
  private file: string; private rows: Stored[]; private actions: ActionReceipt[];
  private timer: ReturnType<typeof setInterval> | null = null; private pending: Promise<void> | null = null; private closing = false;
  private creating = false;
  constructor(dir: string, private deps: HostDeps, private now = Date.now, private probe = toolPath) {
    this.file = join(dir, 'orchestrations.json');
    const data = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : { rows: [], actions: [] };
    this.rows = data.rows; this.actions = data.actions;
    for (const row of this.rows) for (const m of row.members) if (m.state === 'starting') { m.state = 'unknown'; m.error = 'Host restarted during dispatch; recover the original start receipt.'; }
    for (const a of this.actions) if (a.state === 'pending') { a.state = 'unknown'; a.error = 'Host restarted during action. Inspect its original runs and worktrees.'; }
    this.save();
  }
  private save() { writeFileSync(this.file + '.tmp', JSON.stringify({ rows: this.rows, actions: this.actions })); renameSync(this.file + '.tmp', this.file); }
  private owner() { const owner = this.deps.account.current?.userId; if (!owner) throw new DeskError('Sign in on the PC.', 403); return owner; }
  private unchanged(owner: string) { if (this.owner() !== owner) throw new DeskError('Account changed.', 403); }
  start() { this.closing = false; this.timer = setInterval(() => void this.tick().catch((e) => console.error('Orchestration tick', e)), 5000); this.timer.unref(); }
  async close() { this.closing = true; if (this.timer) clearInterval(this.timer); await this.pending; }
  async create(raw: unknown) {
    const owner = this.owner();
    // Existing IDs are read before time validation, allowing recovery after a scheduled window.
    const id = (raw as { commandId?: unknown })?.commandId;
    const fingerprint = JSON.stringify(raw);
    const old = this.rows.find((r) => r.owner === owner && r.id === id);
    if (old) { if (old.fingerprint !== fingerprint) throw new DeskError('Command ID belongs to another orchestration.', 409); return { id: old.id }; }
    if (this.creating) throw new DeskError('Another plan is being saved. Retry this ID.', 409);
    this.creating = true;
    try {
      const request = parseOrchestration(raw, this.now());
      const projects = await this.deps.account.commandProjects();
      const selected = request.projectIds.map((id) => projects.find((p) => p.projectId === id));
      if (selected.some((p) => !p)) throw new DeskError('Every project needs an owned checkout.', 403);
      for (const agent of request.agents) if (!await this.probe(agent)) throw new DeskError(`${agent} is not installed.`, 409);
      const config = this.deps.automation?.read(); const context = config && await this.deps.account.ruleContext(config.rules.map((r) => r.entryId));
      const members: Orchestration['members'] = [];
      for (const p of selected) {
        const project = p!; const cwd = await repository(project.path); const baseCommit = await git(cwd, 'rev-parse', 'refs/heads/main');
        const ruleProject = context?.projects.find((p) => p.id === project.projectId);
        const rules = config && context && ruleProject ? scopedRules(config.rules, context.entries, ruleProject).join('\n') : '';
        for (const agent of request.agents) {
          const prompt = [request.prompt, rules && `Project rules:\n${rules}`, request.kind === 'night' && 'Night shift: work only inside this worktree. Do not deploy, publish, ship, install releases, access credentials or perform external writes. Ask for approval when needed; leave a concise morning summary.'].filter(Boolean).join('\n\n');
          if (prompt.length > 8000) throw new DeskError('Prompt plus project rules exceeds 8000 characters.');
          const start = { commandId: randomUUID(), projectId: project.projectId!, cwd, where: 'worktree' as const, mode: request.mode, entryIds: [], entryId: null, agent, name: `${request.kind} · ${request.prompt.split('\n')[0]}`.slice(0, 80), prompt };
          members.push({ projectId: project.projectId!, project: project.name, start, baseCommit, state: 'queued' });
        }
      }
      this.unchanged(owner);
      this.rows.push({ owner, fingerprint, id: request.commandId, kind: request.kind, prompt: request.prompt, createdAt: this.now(), startsAt: request.startsAt ?? this.now(), endsAt: request.endsAt ?? null, maxRuns: request.maxRuns ?? members.length, reservePercent: request.reservePercent ?? 20, members, stopped: false });
      this.save(); void this.tick().catch((e) => console.error('Orchestration dispatch', e)); return { id: request.commandId };
    } finally { this.creating = false; }
  }
  tick(): Promise<void> {
    if (this.pending) return this.pending;
    if (this.closing || !this.deps.account.current) return Promise.resolve();
    this.pending = this.dispatch().finally(() => { this.pending = null; }); return this.pending;
  }
  private async dispatch() {
    const owner = this.owner();
    for (const row of this.rows.filter((r) => r.owner === owner && !r.stopped && r.startsAt <= this.now())) {
      this.unchanged(owner); if (this.closing) return;
      for (const m of row.members.filter((m) => m.state === 'unknown')) {
        const receipt = this.deps.receipts?.get(owner, m.start.commandId!);
        if (receipt?.state === 'confirmed' && receipt.run) { m.runId = receipt.run.id; m.state = 'started'; m.error = undefined; this.save(); }
      }
      const runs = await this.deps.runs.list(); this.unchanged(owner);
      if (row.kind === 'night') {
        const ended = this.now() >= row.endsAt!;
        if (ended) {
          row.note = 'Window ended; unfinished work stays for review.';
          for (const m of row.members) {
            if (m.state === 'queued') { m.state = 'skipped'; m.error = 'Night window ended before dispatch.'; }
            const run = runs.find((r) => r.id === m.runId);
            if (run && !finished(run.state) && run.state !== 'unknown') { try { await this.deps.runs.stop(run.id); } catch (e) { m.error = String(e); } }
          }
          this.save(); continue;
        }
        if (this.rows.some((other) => other.owner === owner && other.kind === 'night' && other.id !== row.id && other.members.some((m) => m.state === 'starting' || m.state === 'unknown' || (m.runId && !finished(runs.find((r) => r.id === m.runId)?.state ?? 'unknown'))))) continue;
        if (row.members.some((m) => m.state === 'unknown' || m.state === 'starting' || (m.runId && !finished(runs.find((r) => r.id === m.runId)?.state ?? 'unknown')))) continue;
        let reserve = false;
        for (const m of row.members.filter((m) => m.runId)) {
          const session = this.deps.runs.runtime?.get(owner, m.runId!)?.session;
          if (session?.usage) { const usage = providerUsage(m.runId!, await session.usage()); if (usage.windows.some((w) => w.used >= 100 - row.reservePercent)) reserve = true; }
        }
        if (reserve || row.members.filter((m) => m.state !== 'queued' && m.state !== 'skipped').length >= row.maxRuns) { row.note = reserve ? 'Stopped dispatch to preserve the morning usage reserve.' : 'Night run cap reached; remaining work stays queued for review.'; this.save(); continue; }
      }
      for (const member of row.members.filter((m) => m.state === 'queued')) {
        if (this.closing || row.stopped || (row.endsAt && this.now() >= row.endsAt)) break;
        this.unchanged(owner); member.state = 'starting'; this.save();
        try {
          const run = await this.deps.receipts!.start(owner, member.start, () => startTask(this.deps, member.start, this.probe, { baseCommit: member.baseCommit, keep: true }));
          member.runId = run.id; member.state = 'started';
        } catch (e) {
          const receipt = this.deps.receipts?.get(owner, member.start.commandId!);
          member.state = receipt?.state === 'failed' ? 'failed' : 'unknown'; member.error = String(e);
        }
        this.save(); if (row.kind === 'night') break;
      }
    }
  }
  async list(): Promise<OrchestrationView[]> {
    const owner = this.owner(); const runs = await this.deps.runs.list(); const result: OrchestrationView[] = [];
    for (const row of this.rows.filter((r) => r.owner === owner).slice(-100).reverse()) {
      const members = await Promise.all(row.members.map(async (m) => {
        const run = runs.find((r) => r.id === m.runId) ?? null; let diff = 'not available'; let summary = ''; let usage = 'unavailable';
        if (run) {
          try { const path = await this.deps.worktrees!.searchPath(run.worktreeId!, m.projectId, run.cwd); diff = await git(path, 'diff', '--stat', m.baseCommit); if (!diff) diff = 'No tracked changes.'; } catch { diff = 'Worktree archived or unavailable.'; }
          try { summary = orchestrationSummary(this.deps.events?.store.snapshot(owner, run.id).items ?? [], await this.deps.runs.log(run.id)); } catch { summary = 'Transcript unavailable.'; }
          try { const session = this.deps.runs.runtime?.get(owner, run.id)?.session; if (session?.usage) { const u = providerUsage(run.id, await session.usage()); usage = u.windows.map((w) => `${w.label}: ${Math.round(w.used)}%`).join(' · ') || u.note || 'unavailable'; } } catch { usage = 'unavailable'; }
        }
        const jobs = this.deps.jobs?.list().filter((r) => r.parentRunId === run?.id) ?? [];
        return { projectId: m.projectId, project: m.project, agent: m.start.agent, baseCommit: m.baseCommit, run, state: m.state === 'started' ? run?.state ?? 'unknown' : m.state, error: m.error, disposition: m.disposition, diff, summary, checks: jobs.length ? jobs.map((j) => `${j.name}: ${j.state}`).join(' · ') : 'not run', usage, previews: this.deps.previews?.list().filter((p) => !!run && p.runId === run.id).map((p) => p.port).filter((p): p is number => typeof p === 'number') ?? [] };
      }));
      const { owner: _owner, fingerprint: _fingerprint, ...view } = row; result.push({ ...view, members, actions: this.actions.filter((a) => a.owner === owner && a.id === row.id).map(({ commandId, action, state, error }) => ({ commandId, action, state, error })) });
    }
    this.unchanged(owner); return result;
  }
  async act(raw: unknown, source: 'pc' | 'phone') {
    const owner = this.owner(); const v = raw as OrchestrationAction;
    if (!v || !/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v.commandId ?? '') || !['pick', 'keep', 'toss', 'stop', 'follow'].includes(v.action)) throw new DeskError('Invalid orchestration action.');
    const row = this.rows.find((r) => r.owner === owner && r.id === v.id); if (!row) throw new DeskError('Plan unavailable.', 404);
    const fingerprint = JSON.stringify(v); const old = this.actions.find((a) => a.owner === owner && a.commandId === v.commandId);
    if (old) { if (old.fingerprint !== fingerprint) throw new DeskError('Action ID already used.', 409); return { state: old.state, commandId: old.commandId, error: old.error }; }
    if (this.actions.some((a) => a.owner === owner && a.id === row.id && ['pending', 'unknown'].includes(a.state)) && v.action !== 'stop') throw new DeskError('Earlier plan action is pending or unknown. Inspect the original receipt and runs before taking further action.', 409);
    if (v.action === 'follow' && (typeof v.text !== 'string' || !v.text.trim() || v.text.length > 8000)) throw new DeskError('Enter a follow-up prompt.');
    if (v.action === 'pick' && (row.kind !== 'race' || row.picked || !row.members.some((m) => m.runId === v.runId))) throw new DeskError('Choose an unpicked race result.');
    if (['keep', 'toss'].includes(v.action) && (row.kind === 'race' || !row.members.some((m) => m.runId === v.runId))) throw new DeskError('Select a night or group result.');
    const receipt: ActionReceipt = { owner, id: row.id, action: v.action, commandId: v.commandId, fingerprint, state: 'pending' }; this.actions.push(receipt); this.save();
    try {
      if (v.action === 'stop') { row.stopped = true; for (const m of row.members) if (m.state === 'queued') m.state = 'skipped'; this.save(); }
      const runs = await this.deps.runs.list(); this.unchanged(owner);
      if (v.action === 'pick' && row.members.some((m) => !m.runId || !finished(runs.find((r) => r.id === m.runId)?.state ?? 'unknown') || this.deps.controls?.queue(m.runId).items.length)) throw new DeskError('Finish both runs and empty their queues before picking.', 409);
      if (['keep', 'toss'].includes(v.action)) {
        const member = row.members.find((m) => m.runId === v.runId)!; const run = runs.find((r) => r.id === v.runId);
        if (!run?.worktreeId || !finished(run.state) || this.deps.controls?.queue(run.id).items.length) throw new DeskError('Wait for a finished run with an empty queue.', 409);
        if (v.action === 'toss') await this.deps.runs.runtime?.releaseIdle(owner, run.id);
        await this.deps.worktrees!.retain(run.worktreeId, v.action === 'keep'); member.disposition = v.action === 'keep' ? 'kept' : 'tossed';
        if (v.action === 'toss') await this.deps.worktrees!.cleanup((r) => !!this.deps.runs.runtime?.has(r.id) || !!this.deps.controls?.queue(r.id).items.length);
      }
      for (const m of row.members) {
        const run = runs.find((r) => r.id === m.runId); if (!run) continue; this.unchanged(owner);
        if (v.action === 'stop' && !finished(run.state)) await this.deps.runs.stop(run.id);
        if (v.action === 'follow' && m.disposition !== 'tossed') { const control = await this.deps.controls!.run({ commandId: randomUUID(), action: 'send', runId: run.id, text: v.text, source }); if (control.state !== 'confirmed') throw new DeskError(control.error ?? 'Follow-up delivery is unconfirmed.', 409); }
        if (v.action === 'pick' && run.id !== v.runId) { await this.deps.runs.runtime?.releaseIdle(owner, run.id); await this.deps.worktrees!.retain(run.worktreeId!, false); }
      }
      if (v.action === 'pick') {
        row.picked = v.runId; row.retentionUntil = this.now() + 7 * 86400_000; this.save();
        await this.deps.worktrees!.cleanup((run) => !!this.deps.runs.runtime?.has(run.id) || !!this.deps.controls?.queue(run.id).items.length);
        row.note = 'Winner retained. Loser cleanup preserves Git recovery snapshots; unsafe folders remain for PC review. Chats retained at least 7 days.';
      }
      receipt.state = 'confirmed'; this.save(); return { state: receipt.state, commandId: receipt.commandId };
    } catch (e) { receipt.state = 'unknown'; receipt.error = String(e); this.save(); throw e; }
  }
  stopQueued() { const owner = this.owner(); for (const row of this.rows.filter((r) => r.owner === owner)) { row.stopped = true; for (const m of row.members) if (m.state === 'queued') m.state = 'skipped'; } this.save(); }
}
