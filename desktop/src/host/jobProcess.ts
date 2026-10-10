import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import type { DeskCommandStep } from '@/lib/deskCommands';

import { DeskError } from './claudeRuns.ts';
import type { CommandPlan } from './commands.ts';

const exec = promisify(execFile);

async function npmCli(): Promise<string> {
  const { stdout } = await exec(process.platform === 'win32' ? 'where' : 'which', [process.platform === 'win32' ? 'npm.cmd' : 'npm'], { windowsHide: true });
  for (const path of stdout.trim().split(/\r?\n/)) {
    const candidate = join(dirname(path), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (existsSync(candidate)) return candidate;
  }
  if (process.platform !== 'win32' && stdout.trim()) return stdout.trim().split('\n')[0];
  throw new DeskError('npm CLI is not installed on this pc', 409);
}

export async function launchJobStep(plan: CommandPlan, step: DeskCommandStep, output: (chunk: Buffer) => void): Promise<ChildProcess> {
  let executable: string;
  let args: string[];
  let cwd = plan.cwd;
  if (step.runner === 'npm') {
    const cli = await npmCli();
    executable = process.execPath;
    args = [cli, 'run', step.task, '--'];
  } else {
    if (!plan.gradle) throw new DeskError('no Gradle wrapper', 409);
    cwd = plan.gradle;
    if (process.platform === 'win32') {
      // Windows batch files require cmd. Only a checked local wrapper path and
      // a validated task name enter this line; no prompt or extra args do.
      if (/[&|<>^%!"\r\n]/.test(cwd)) throw new DeskError('this Gradle folder cannot be safely passed to cmd', 409);
      executable = process.env.ComSpec ?? 'cmd.exe';
      args = ['/d', '/s', '/c', `""${join(cwd, 'gradlew.bat')}" ${step.task} --console=plain"`];
    } else {
      executable = join(cwd, 'gradlew');
      args = [step.task, '--console=plain'];
    }
  }
  // DETACHED_PROCESS makes Windows Java drop inherited output handles and
  // silently exit. POSIX still needs a process group for stopping the tree.
  const child = spawn(executable, args, { cwd, detached: process.platform !== 'win32', windowsHide: true,
    windowsVerbatimArguments: step.runner === 'gradle' && process.platform === 'win32',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', output);
  child.stderr!.on('data', output);
  await new Promise<void>((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
  child.unref();
  return child;
}

export async function stopJobProcess(child: ChildProcess): Promise<void> {
  if (!child.pid || child.exitCode !== null) return;
  const exited = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeskError('stop requested; process has not confirmed exit yet', 409)), 5000);
    child.once('close', () => { clearTimeout(timer); resolve(); });
  });
  const killed = process.platform === 'win32'
    ? exec('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true })
    : Promise.resolve().then(() => process.kill(-child.pid!, 'SIGTERM'));
  await Promise.all([killed, exited]);
}
