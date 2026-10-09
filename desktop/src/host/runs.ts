import { randomBytes } from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { DeskAgent, DeskLogLine, DeskRun, DeskStart } from '@/lib/deskProtocol';
import { runTitle, sortRuns } from '@/lib/deskProtocol';

import { claudeRunState, spawnPlan } from './agents.ts';
import { claudeLog, claudeRows, DeskError, startClaude, stopClaude } from './claudeRuns.ts';
import { toolPath } from './tools.ts';
import { plainLog, tail } from './transcript.ts';

/**
 * Every run this pc started for a phone, and the ones someone opened at the pc.
 *
 * The record is a small JSON file, because a run outlives this app — a claude
 * background session by design, a codex run because it is spawned detached — and
 * the phone should still see it after the window was closed and reopened.
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

export class Runs {
  private records: RunRecord[];
  private readonly file: string;
  private readonly logs: string;

  constructor(private readonly dir: string) {
    this.file = join(dir, 'runs.json');
    this.logs = join(dir, 'runs');
    mkdirSync(this.logs, { recursive: true });
    try {
      this.records = JSON.parse(readFileSync(this.file, 'utf8')) as RunRecord[];
    } catch {
      this.records = [];
    }
  }

  private save(): void {
    this.records = this.records.sort((a, b) => b.startedAt - a.startedAt).slice(0, KEEP);
    writeFileSync(this.file, `${JSON.stringify(this.records, null, 2)}\n`);
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
    const child = spawn(path, plan.args, {
      cwd: start.cwd,
      detached: true,
      windowsHide: true,
      stdio: ['ignore', out, out],
    });
    closeSync(out);
    const record: RunRecord = { id, ...base, pid: child.pid, log, exit: undefined };
    child.on('exit', (code) => {
      record.exit = code ?? null;
      this.save();
    });
    child.on('error', (error) => {
      record.exit = -1;
      writeFileSync(log, `could not start: ${error.message}\n`, { flag: 'a' });
      this.save();
    });
    child.unref();
    this.records.unshift(record);
    this.save();
    return { id, ...base, state: 'running', origin: 'phone' };
  }

  async list(): Promise<DeskRun[]> {
    const rows = await claudeRows();
    const byId = new Map(rows.map((row) => [row.id ?? row.sessionId.slice(0, 8), row]));
    const mine = new Set(this.records.map((record) => record.id));

    const runs: DeskRun[] = this.records.map((record) => {
      const base = { id: record.id, agent: record.agent, name: record.name, cwd: record.cwd, startedAt: record.startedAt, entryId: record.entryId, origin: 'phone' as const };
      if (record.agent === 'claude') {
        const row = byId.get(record.id);
        return { ...base, state: row ? claudeRunState(row) : 'done' };
      }
      if (record.stopped) return { ...base, state: 'stopped' };
      if (record.exit === undefined) return { ...base, state: alive(record.pid) ? 'running' : 'done' };
      return { ...base, state: record.exit === 0 ? 'done' : 'failed' };
    });

    // Sessions opened at the pc, for a phone that wants to know what the pc is
    // busy with. A background one blocked for days is not "busy" — after a day
    // it is left to `claude agents` at the pc.
    for (const [id, row] of byId) {
      if (mine.has(id)) continue;
      const state = claudeRunState(row);
      if (state === 'done' || state === 'failed' || state === 'stopped') continue;
      if (row.kind !== 'interactive' && Date.now() - row.startedAt > PC_RUN_MS) continue;
      runs.push({ id, agent: 'claude', name: row.name ?? 'claude', cwd: row.cwd, startedAt: row.startedAt, state, entryId: null, origin: 'pc' });
    }
    return sortRuns(runs);
  }

  async stop(id: string): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record || record.agent === 'claude') return stopClaude(id);
    if (record.pid && alive(record.pid)) await kill(record.pid);
    record.stopped = true;
    this.save();
  }

  async log(id: string): Promise<DeskLogLine[]> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (record?.log) {
      try {
        return tail(plainLog(await readFile(record.log, 'utf8')));
      } catch {
        return [{ who: 'system', text: 'nothing logged yet' }];
      }
    }
    const row = (await claudeRows()).find((candidate) => (candidate.id ?? candidate.sessionId.slice(0, 8)) === id);
    if (!row) throw new DeskError('no such run', 404);
    return claudeLog(row);
  }
}

function alive(pid: number | undefined): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
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
