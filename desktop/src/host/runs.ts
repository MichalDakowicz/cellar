import { homedir } from 'node:os';
import type { EventSource } from './eventIngest.ts';
import { claudeProjectSlug } from './agents.ts';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DeskAgent, DeskLogLine, DeskRun, DeskRunState, DeskStart } from '@/lib/deskProtocol';
import { runTitle, sortRuns } from '@/lib/deskProtocol';

import { claudeRunState, spawnPlan, type ClaudeAgentRow } from './agents.ts';
import { claudeLog, claudeRows, DeskError, startClaude, stopClaude } from './claudeRuns.ts';
import { lastWrite, readTail } from './logTail.ts';
import { toolPath } from './tools.ts';
import { plainLog, tail } from './transcript.ts';
import { worktreeEnv } from './worktreeEnv.ts';
import type { ManagedRuns } from './managedRuns.ts';
import { stopJobProcess } from './jobProcess.ts';

/**
 * Every run this pc started for a phone, and the ones someone opened at the pc.
 *
 * The record is a small JSON file, because a run outlives this app — a claude
 * background session by design, a codex run because it is spawned detached — and
 * the phone should still see it after the window was closed and reopened.
 *
 * Only a process this app spawned in this lifetime is ever killed. A pid read
 * back from the file after a restart may belong to anything by now; a run like
 * that is judged by whether its log is still growing, and stopping it is left to
 * the pc.
 */

type RunRecord = {
  runtime?: true;
  prompt?: string;
  format?: 'codex' | 'claude';
  worktreeId?: string;
  branch?: string;
  owner?: string | null;
  commandId?: string;
  entryIds?: string[];
  projectId?: string;
  mode?: DeskStart['mode'];
  where?: DeskStart['where'];
  id: string;
  agent: DeskAgent;
  name: string;
  cwd: string;
  startedAt: number;
  entryId: string | null;
  pid?: number;
  log?: string;
  exit?: number | null;
  stopped?: boolean;
};

const KEEP = 60;
const PC_RUN_MS = 24 * 60 * 60_000;
/** A log silent this long, from a run this app no longer holds, is taken as finished. */
const QUIET_MS = 2 * 60_000;
const RUN_ID = /^[0-9a-f]{6,16}$/;

const rowId = (row: ClaudeAgentRow) => row.id ?? row.sessionId.slice(0, 8);

export class Runs {
  private latestClaude: ClaudeAgentRow[] = [];
  private records: RunRecord[];
  private readonly file: string;
  private readonly logs: string;
  private readonly children = new Map<string, ChildProcess>();
  runtime?: ManagedRuns;
  onChange: () => void = () => {};
  constructor(dir: string, private readonly readClaude = claudeRows, private readonly owner: () => string | null = () => null) {
    this.file = join(dir, 'runs.json');
    this.logs = join(dir, 'runs');
    mkdirSync(this.logs, { recursive: true });
    try {
      this.records = JSON.parse(readFileSync(this.file, 'utf8')) as RunRecord[];
    } catch {
      this.records = [];
    }
  }

  /** Written aside and renamed over, so a crash mid-write never leaves half a file to be read as none. */
  private save(): void {
    this.records = this.records.sort((a, b) => b.startedAt - a.startedAt).slice(0, KEEP);
    writeFileSync(`${this.file}.tmp`, `${JSON.stringify(this.records, null, 2)}\n`);
    renameSync(`${this.file}.tmp`, this.file);
    this.onChange();
  }

  async start(start: DeskStart & { branch?: string }): Promise<DeskRun> {
    const plan = spawnPlan(start);
    const base = { prompt: start.prompt, ...(start.agent !== 'agy' ? { format: start.agent } : {}), agent: start.agent, name: runTitle(start), cwd: start.cwd, startedAt: Date.now(), entryId: start.entryId,
      ...(start.commandId ? { commandId: start.commandId, entryIds: start.entryIds, projectId: start.projectId, mode: start.mode, where: start.where,
        worktreeId: start.worktreeId, branch: start.branch } : {}) };

    if (plan.kind === 'background') {
      const id = await startClaude(plan.args, start.cwd);
      this.records.unshift({ id, ...base, owner: this.owner() });
      this.save();
      return { id, ...base, state: 'running', origin: 'phone' };
    }

    const path = await toolPath(start.agent);
    if (!path) throw new DeskError(`${start.agent} is not installed on this pc`, 409, { notStarted: true });
    const id = randomBytes(4).toString('hex');
    const log = join(this.logs, `${id}.log`);
    const env = start.where === 'worktree' && start.worktreeId ? worktreeEnv(start.cwd, process.env) : process.env;
    if (this.runtime && start.commandId && start.agent !== 'agy') {
      const owner = this.owner(); if (!owner) throw new DeskError('Sign in on the PC.', 409, { notStarted: true });
      const record: RunRecord = { id, ...base, owner, log, runtime: true };
      this.records.unshift(record); this.save();
      await this.runtime.start(start, id, owner, log, env, (code) => { record.exit = code; this.save(); });
      return { id, ...base, state: record.exit === 0 ? 'done' : record.exit === null ? 'unknown' : record.exit !== undefined ? 'failed' : 'running', origin: 'phone' };
    }
    const out = openSync(log, 'a');
    const child = spawn(path, plan.args, { cwd: start.cwd, env, detached: true, windowsHide: true, stdio: ['ignore', out, out] });
    closeSync(out);
    await new Promise<void>((resolve, reject) => {
      child.once('spawn', resolve);
      child.once('error', (error) => reject(new DeskError(`Could not spawn ${start.agent}: ${error.message}`, 409, { notStarted: true })));
    });
    const record: RunRecord = { id, ...base, owner: this.owner(), pid: child.pid, log, exit: undefined };
    this.children.set(id, child);
    const ended = (code: number | null) => {
      this.children.delete(id);
      record.exit = code;
      this.save();
    };
    child.on('exit', (code) => ended(code ?? null));
    child.on('error', (error) => {
      writeFileSync(log, `could not start: ${error.message}\n`, { flag: 'a' });
      ended(-1);
    });
    child.unref();
    this.records.unshift(record);
    this.save();
    return { id, ...base, state: 'running', origin: 'phone' };
  }

  eventSources(runs: DeskRun[]): EventSource[] {
    return runs.filter((run) => run.agent !== 'job').map((run) => {
      const record = this.records.find((row) => row.id === run.id);
      const claude = this.latestClaude.find((row) => rowId(row) === run.id);
      const path = record?.log ?? (claude ? join(homedir(), '.claude', 'projects', claudeProjectSlug(claude.cwd), claude.sessionId + '.jsonl') : null);
      return { run, path, format: record?.log ? record.format ?? 'plain' : 'claude', prompt: record?.prompt };
    });
  }

  private async ownState(record: RunRecord): Promise<DeskRunState> {
    if (record.stopped) return 'stopped';
    const live = record.runtime && record.owner ? this.runtime?.get(record.owner, record.id) : null;
    if (live?.session.busy()) return this.runtime!.approvals.waiting(record.owner!, record.id) ? 'waiting' : 'running';
    if (record.runtime && record.exit === null) return 'unknown';
    if (record.exit !== undefined) {
      if (record.exit !== 0) return 'failed';
      if (record.format && record.log) {
        const raw = await readTail(record.log);
        for (const line of raw.split(/\r?\n/)) {
          try { const row = JSON.parse(line); if (row.type === 'turn.failed' || (row.type === 'result' && (row.is_error || row.permission_denials?.length))) return 'failed'; } catch { /* diagnostic output */ }
        }
      }
      return 'done';
    }
    if (record.runtime) return this.runtime?.has(record.id)
      ? this.runtime.approvals.waiting(record.owner!, record.id) ? 'waiting' : 'running' : 'unknown';
    if (this.children.has(record.id)) return 'running';
    const written = record.log ? await lastWrite(record.log) : null;
    return written !== null && Date.now() - written < QUIET_MS ? 'running' : 'unknown';
  }

  async list(): Promise<DeskRun[]> {
    // A failed poll must reach the phone as unavailable, not fresh cached totals.
    const rows = await this.readClaude();
    this.latestClaude = rows;
    const claudeStates = new Map(rows.map((row) => [rowId(row), claudeRunState(row)]));

    const runs: DeskRun[] = [];
    for (const record of this.records) {
      if (record.owner !== undefined && record.owner !== this.owner()) continue;
      const base = { id: record.id, agent: record.agent, name: record.name, cwd: record.cwd, startedAt: record.startedAt, entryId: record.entryId, origin: 'phone' as const,
        ...(record.commandId ? { commandId: record.commandId, projectId: record.projectId, entryIds: record.entryIds, mode: record.mode, where: record.where,
          worktreeId: record.worktreeId, branch: record.branch } : {}) };
      const state = record.agent === 'claude' && !record.log ? (claudeStates.get(record.id) ?? 'unknown') : await this.ownState(record);
      runs.push({ ...base, state });
    }

    // Sessions opened at the pc, for a phone that wants to know what the pc is
    // busy with. A background one blocked for days is not "busy" — after a day
    // it is left to `claude agents` at the pc.
    const mine = new Set(this.records.map((record) => record.id));
    for (const row of rows ?? []) {
      const id = rowId(row);
      if (mine.has(id)) continue;
      const state = claudeRunState(row);
      if (state === 'done' || state === 'failed' || state === 'stopped') continue;
      if (row.kind !== 'interactive' && Date.now() - row.startedAt > PC_RUN_MS) continue;
      runs.push({ id, agent: 'claude', name: row.name ?? 'claude', cwd: row.cwd, startedAt: row.startedAt, state, entryId: null, origin: 'pc' });
    }
    return sortRuns(runs);
  }

  /** Only what this desk started: a session someone opened at the pc is theirs to stop. */
  async stop(id: string): Promise<void> {
    const record = RUN_ID.test(id) ? this.records.find((candidate) => candidate.id === id) : undefined;
    if (!record) throw new DeskError('that run was not started from cellar', 403);
    if (record.owner !== undefined && record.owner !== this.owner()) throw new DeskError('no such run for this account', 404);
    if (record.agent === 'claude' && !record.log) return stopClaude(id);
    if (record.runtime) {
      if (!this.runtime) throw new DeskError('Provider callback unavailable; stop it at the PC.', 409);
      await this.runtime.stop(id); record.stopped = true; this.save(); return;
    }
    const child = this.children.get(id);
    if (!child?.pid) throw new DeskError('it was started before cellar last restarted — stop it at the pc', 409);
    await stopJobProcess(child);
    record.stopped = true;
    this.save();
  }

  async log(id: string): Promise<DeskLogLine[]> {
    if (!RUN_ID.test(id)) throw new DeskError('no such run', 404);
    const record = this.records.find((candidate) => candidate.id === id);
    if (record?.owner !== undefined && record.owner !== this.owner()) throw new DeskError('no such run for this account', 404);
    if (record?.log) {
      try {
        return tail(plainLog(await readTail(record.log)));
      } catch {
        return [{ who: 'system', text: 'nothing logged yet' }];
      }
    }
    const row = (await this.readClaude()).find((candidate) => rowId(candidate) === id);
    if (!row) throw new DeskError('no such run', 404);
    return claudeLog(row);
  }
}
