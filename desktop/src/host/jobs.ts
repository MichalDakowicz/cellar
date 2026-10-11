import type { EventSource } from './eventIngest.ts';
import type { ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { DeskLogLine, DeskRun } from '@/lib/deskProtocol';

import { DeskError } from './claudeRuns.ts';
import type { CommandPlan } from './commands.ts';
import { launchJobStep, stopJobProcess } from './jobProcess.ts';
import { readTail } from './logTail.ts';
import { plainLog, tail } from './transcript.ts';

type Job = { run: DeskRun; owner: string; log: string };

export class Jobs {
  private readonly file: string;
  private readonly dir: string;
  private readonly jobs: Job[];
  private readonly active = new Map<string, { child: ChildProcess; stopping: boolean }>();
  constructor(dir: string, private readonly owner: () => string | null) {
    this.file = join(dir, 'jobs.json');
    this.dir = join(dir, 'jobs');
    mkdirSync(this.dir, { recursive: true });
    this.jobs = existsSync(this.file) ? JSON.parse(readFileSync(this.file, 'utf8')) : [];
    for (const job of this.jobs) if (job.run.state === 'running') job.run.state = 'unknown';
    this.save();
  }

  private save(): void {
    writeFileSync(`${this.file}.tmp`, JSON.stringify(this.jobs));
    renameSync(`${this.file}.tmp`, this.file);
  }

  list(): DeskRun[] { return this.jobs.filter((job) => job.owner === this.owner()).map((job) => ({ ...job.run })); }
  eventSources(): EventSource[] { return this.jobs.filter((job) => job.owner === this.owner()).map((job) => ({ run: { ...job.run }, path: job.log, format: 'plain' })); }
  has(id: string): boolean { return this.list().some((run) => run.id === id); }
  private get(id: string): Job {
    const job = this.jobs.find((candidate) => candidate.run.id === id && candidate.owner === this.owner());
    if (!job) throw new DeskError('no such job for this account', 404);
    return job;
  }

  async start(plan: CommandPlan, command: string): Promise<DeskRun> {
    const owner = this.owner();
    if (!owner) throw new DeskError('sign in on the pc first', 409);
    const id = `j${randomBytes(8).toString('hex')}`;
    const run: DeskRun = { id, agent: 'job', name: `$${command}`, cwd: plan.cwd, startedAt: Date.now(), state: 'running', origin: 'phone', entryId: null };
    const job = { run, owner, log: join(this.dir, `${id}.log`) };
    this.jobs.push(job);
    this.save();
    // The first process must really spawn before the host acknowledges a start.
    const first = await this.launch(job, plan, 0);
    void this.follow(job, plan, 0, first);
    return { ...run };
  }

  private async launch(job: Job, plan: CommandPlan, at: number): Promise<ChildProcess> {
    const step = plan.steps[at];
    appendFileSync(job.log, `\n$ ${step.runner} ${step.task}\n`);
    try {
      const child = await launchJobStep(plan, step, (chunk) => appendFileSync(job.log, chunk));
      this.active.set(job.run.id, { child, stopping: false });
      return child;
    } catch (error) {
      job.run.state = 'failed';
      appendFileSync(job.log, `could not start: ${String(error)}\n`);
      this.save();
      throw error;
    }
  }

  private async follow(job: Job, plan: CommandPlan, at: number, child: ChildProcess): Promise<void> {
    const code = await new Promise<number | null>((resolve) => child.once('close', resolve));
    const stopping = this.active.get(job.run.id)?.stopping;
    this.active.delete(job.run.id);
    appendFileSync(job.log, `\nexit ${code ?? 'signal'}\n`);
    if (!stopping && code === 0 && at + 1 < plan.steps.length) {
      try { return await this.follow(job, plan, at + 1, await this.launch(job, plan, at + 1)); }
      catch { return; } // launch recorded the failure and its log.
    }
    job.run.state = stopping ? 'stopped' : code === 0 ? 'done' : 'failed';
    this.save();
  }

  async stop(id: string): Promise<void> {
    this.get(id);
    const active = this.active.get(id);
    if (!active) throw new DeskError('job process is not held by this host — check it at the pc', 409);
    active.stopping = true;
    try { await stopJobProcess(active.child); }
    catch (error) { active.stopping = false; throw error; }
  }

  async log(id: string): Promise<DeskLogLine[]> {
    const job = this.get(id);
    const lines = tail(plainLog(await readTail(job.log)));
    if (job.run.state === 'unknown') lines.push({ who: 'system', text: 'host restarted before recording exit — job result is unknown; check at the pc' });
    return lines;
  }
}
