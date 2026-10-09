import { execFile, spawn, type ChildProcess } from 'node:child_process';
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
  private records: RunRecord[];
  private readonly file: string;
  private readonly logs: string;
  private readonly children = new Map<string, ChildProcess>();
  /** What `claude agents` last said, for the poll where it fails to answer. */
  private lastClaude = new Map<string, DeskRunState>();

  constructor(dir: string) {
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
  }

  async start(start: DeskStart): Promise<DeskRun> {
    const plan = spawnPlan(start);
    const base = { agent: start.agent, name: runTitle(start), cwd: start.cwd, startedAt: Date.now(), entryId: start.entryId };

    if (plan.kind === 'background') {
      const id = await startClaude(plan.args, start.cwd);
      this.records.unshift({ id, ...base });
      this.save();
      return { id, ...base, state: 'running', origin: 'phone' };
    }

    const path = await toolPath(start.agent);
    if (!path) throw new DeskError(`${start.agent} is not installed on this pc`, 409);
    const id = randomBytes(4).toString('hex');
    const log = join(this.logs, `${id}.log`);
    const out = openSync(log, 'a');
    const child = spawn(path, plan.args, { cwd: start.cwd, detached: true, windowsHide: true, stdio: ['ignore', out, out] });
    closeSync(out);
    const record: RunRecord = { id, ...base, pid: child.pid, log, exit: undefined };
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

  private async ownState(record: RunRecord): Promise<DeskRunState> {
    if (record.stopped) return 'stopped';
    if (record.exit !== undefined) return record.exit === 0 ? 'done' : 'failed';
    if (this.children.has(record.id)) return 'running';
    const written = record.log ? await lastWrite(record.log) : null;
    return written !== null && Date.now() - written < QUIET_MS ? 'running' : 'done';
  }

  async list(): Promise<DeskRun[]> {
    let rows: ClaudeAgentRow[] | null = null;
    try {
      rows = await claudeRows();
      this.lastClaude = new Map(rows.map((row) => [rowId(row), claudeRunState(row)]));
    } catch {
      // `claude agents` did not answer this time; every claude run keeps the state it had.
    }

    const runs: DeskRun[] = [];
    for (const record of this.records) {
      const base = { id: record.id, agent: record.agent, name: record.name, cwd: record.cwd, startedAt: record.startedAt, entryId: record.entryId, origin: 'phone' as const };
      const state = record.agent === 'claude' ? (this.lastClaude.get(record.id) ?? (rows ? 'done' : 'running')) : await this.ownState(record);
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
    if (record.agent === 'claude') return stopClaude(id);
    const child = this.children.get(id);
    if (!child?.pid) throw new DeskError('it was started before cellar last restarted — stop it at the pc', 409);
    await kill(child.pid);
    record.stopped = true;
    this.save();
  }

  async log(id: string): Promise<DeskLogLine[]> {
    if (!RUN_ID.test(id)) throw new DeskError('no such run', 404);
    const record = this.records.find((candidate) => candidate.id === id);
    if (record?.log) {
      try {
        return tail(plainLog(await readTail(record.log)));
      } catch {
        return [{ who: 'system', text: 'nothing logged yet' }];
      }
    }
    const row = (await claudeRows()).find((candidate) => rowId(candidate) === id);
    if (!row) throw new DeskError('no such run', 404);
    return claudeLog(row);
  }
}

/** The whole tree: a CLI agent is a process with children, and killing the parent orphans them. */
function kill(pid: number): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
      return resolve();
    }
    execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => resolve());
  });
}
