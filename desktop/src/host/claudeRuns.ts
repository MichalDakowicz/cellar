import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { DeskLogLine } from '@/lib/deskProtocol';

import { backgroundId, claudeProjectSlug, untrustedFolder, type ClaudeAgentRow } from './agents.ts';
import { runTool, toolPath } from './tools.ts';
import { claudeTranscript, tail } from './transcript.ts';

/**
 * Claude keeps its own background sessions — `claude --bg` hands one to its
 * background service and returns — so this side never holds a process. It asks
 * `claude agents` what exists and reads the transcript claude already writes.
 * That is also why a run started from the phone is in `claude agents` at the
 * pc, and `claude attach <id>` opens it there.
 */

export class DeskError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function claude(): Promise<string> {
  const path = await toolPath('claude');
  if (!path) throw new DeskError('claude is not installed on this pc', 409);
  return path;
}

export async function startClaude(args: string[], cwd: string): Promise<string> {
  const { stdout, stderr } = await runTool(await claude(), args, { cwd, timeout: 90_000 });
  const id = backgroundId(stdout);
  if (id) return id;
  const said = `${stdout}\n${stderr}`;
  if (untrustedFolder(said)) {
    throw new DeskError(`claude has never been opened in ${cwd} — open it there once and accept the trust prompt`, 409);
  }
  throw new DeskError(said.trim().split(/\r?\n/).at(-1) || 'claude did not start', 502);
}

/** Every session claude knows about, finished background ones included. */
export async function claudeRows(): Promise<ClaudeAgentRow[]> {
  const path = await toolPath('claude');
  if (!path) return [];
  const { stdout } = await runTool(path, ['agents', '--json', '--all'], { timeout: 20_000 });
  try {
    const rows = JSON.parse(stdout) as ClaudeAgentRow[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function stopClaude(id: string): Promise<void> {
  const { code, stderr } = await runTool(await claude(), ['stop', id], { timeout: 20_000 });
  if (code !== 0) throw new DeskError(stderr.trim() || 'claude would not stop it', 502);
}

export async function claudeLog(row: Pick<ClaudeAgentRow, 'cwd' | 'sessionId'>): Promise<DeskLogLine[]> {
  const file = join(homedir(), '.claude', 'projects', claudeProjectSlug(row.cwd), `${row.sessionId}.jsonl`);
  try {
    return tail(claudeTranscript(await readFile(file, 'utf8')));
  } catch {
    return [{ who: 'system', text: 'no transcript yet' }];
  }
}
