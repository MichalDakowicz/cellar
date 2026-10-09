import { homedir } from 'node:os';
import { join } from 'node:path';

import type { DeskLogLine } from '@/lib/deskProtocol';

import { backgroundId, claudeProjectSlug, untrustedFolder, type ClaudeAgentRow } from './agents.ts';
import { readTail } from './logTail.ts';
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
    /** More for the phone to act on — `{ untrusted: folder }` when claude wants the folder trusted first. */
    readonly extra: Record<string, unknown> = {},
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
    throw new DeskError(`claude has not been trusted in ${cwd} yet`, 409, { untrusted: cwd });
  }
  throw new DeskError(said.trim().split(/\r?\n/).at(-1) || 'claude did not start', 502);
}

/**
 * Every session claude knows about, finished background ones included. Throws
 * when `claude agents` does not answer, rather than answering "none": an empty
 * list would read as every run having finished.
 */
export async function claudeRows(): Promise<ClaudeAgentRow[]> {
  const path = await toolPath('claude');
  if (!path) return [];
  const { stdout, code } = await runTool(path, ['agents', '--json', '--all'], { timeout: 20_000 });
  if (code !== 0) throw new DeskError('claude agents did not answer', 502);
  const rows = JSON.parse(stdout) as ClaudeAgentRow[];
  if (!Array.isArray(rows)) throw new DeskError('claude agents said something else', 502);
  return rows;
}

export async function stopClaude(id: string): Promise<void> {
  const { code, stderr } = await runTool(await claude(), ['stop', id], { timeout: 20_000 });
  if (code !== 0) throw new DeskError(stderr.trim() || 'claude would not stop it', 502);
}

export async function claudeLog(row: Pick<ClaudeAgentRow, 'cwd' | 'sessionId'>): Promise<DeskLogLine[]> {
  const file = join(homedir(), '.claude', 'projects', claudeProjectSlug(row.cwd), `${row.sessionId}.jsonl`);
  try {
    return tail(claudeTranscript(await readTail(file)));
  } catch {
    return [{ who: 'system', text: 'no transcript yet' }];
  }
}
