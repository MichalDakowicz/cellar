import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';

import { DESK_AGENTS, type DeskAgent } from '@/lib/deskProtocol';

const run = promisify(execFile);
const OUTPUT_MAX = 16 * 1024 * 1024;

/**
 * Where each agent's executable is, found once.
 *
 * Only a real `.exe` counts. A `.cmd` shim (an npm-installed CLI) can only be
 * run through `cmd.exe`, and a prompt from another device passed through a
 * shell is a command line someone else wrote — so a shim-only agent is reported
 * as not installed rather than run that way.
 */

const found = new Map<DeskAgent, string | null>();

async function locate(name: string): Promise<string | null> {
  const finder = process.platform === 'win32' ? 'where' : 'which';
  try {
    const { stdout } = await run(finder, [name], { windowsHide: true, timeout: 5000 });
    const paths = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (process.platform !== 'win32') return paths[0] ?? null;
    return paths.find((path) => /\.exe$/i.test(path)) ?? null;
  } catch {
    return null;
  }
}

export async function toolPath(agent: DeskAgent): Promise<string | null> {
  if (!found.has(agent)) found.set(agent, await locate(agent));
  return found.get(agent) ?? null;
}

export async function installedAgents(): Promise<{ id: DeskAgent; installed: boolean }[]> {
  return Promise.all(DESK_AGENTS.map(async ({ id }) => ({ id, installed: (await toolPath(id)) !== null })));
}

/**
 * Run a tool to completion and hand back what it printed. Never through a
 * shell, and never with a stdin: `claude` reads a piped stdin as more prompt
 * and waits for it to close, so a child whose stdin is an open pipe — what
 * `execFile` gives it — hangs until the timeout instead of starting.
 */
export function runTool(
  path: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const child = spawn(path, args, { cwd: options.cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    let size = 0;
    const keep = (into: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size <= OUTPUT_MAX) into.push(chunk);
    };
    child.stdout.on('data', keep(out));
    child.stderr.on('data', keep(err));
    const timer = setTimeout(() => child.kill(), options.timeout ?? 60_000);
    const finish = (code: number, extra = '') => {
      clearTimeout(timer);
      resolve({
        stdout: Buffer.concat(out).toString('utf8'),
        stderr: Buffer.concat(err).toString('utf8') + extra,
        code,
      });
    };
    child.on('error', (error) => finish(1, error.message));
    child.on('close', (code) => finish(code ?? 1));
  });
}
