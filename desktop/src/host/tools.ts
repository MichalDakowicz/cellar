import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { DESK_AGENTS, type DeskAgent } from '@/lib/deskProtocol';

const run = promisify(execFile);

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

/** Run a tool to completion and hand back what it printed. Never through a shell. */
export async function runTool(
  path: string,
  args: string[],
  options: { cwd?: string; timeout?: number } = {},
): Promise<{ stdout: string; stderr: string; code: number }> {
  try {
    const { stdout, stderr } = await run(path, args, {
      cwd: options.cwd,
      timeout: options.timeout ?? 60_000,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string; code?: number | string };
    return {
      stdout: failed.stdout ?? '',
      stderr: failed.stderr ?? String(error),
      code: typeof failed.code === 'number' ? failed.code : 1,
    };
  }
}
