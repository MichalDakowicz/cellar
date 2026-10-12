import type { DeskApk, DeskInfo, DeskLogLine, DeskPort, DeskRun, DeskStart } from '@/lib/deskProtocol';
import { readDeskRuns } from '@/lib/deskRunSnapshot';
import type { DeskCommandDefinition, DeskJobStart, DeskProjectCommands } from '@/lib/deskCommands';

import { readDeskReceipt, type DeskReceipt } from '@/lib/deskReceipt';
import { readApprovalReceipt, type ApprovalAnswer, type ApprovalReceipt } from '@/lib/deskApprovals';
import { readProjectWorktrees, type WorktreeAction, type WorktreeRequest } from '@/lib/deskWorktrees';
import { readWorktreeReceipt, readWorktreeReview } from './deskWorktreeReply';
import { readControlReceipt, readRunQueue, type RunControl, type ControlReceipt } from '@/lib/deskDispatch';


export type DeskTransport = (method: 'GET' | 'POST', path: string, body?: unknown) => Promise<unknown>;
export class DeskUnreachable extends Error {}

/** A question gets a few seconds; a start waits for the agent to come up, which for `claude --bg` is several. */

/**
 * The pc said no, and said why. `untrusted` is the folder claude wants trusted
 * before it will start there — the one refusal the phone can do something about.
 */
export class DeskRefusal extends Error {
  constructor(
    message: string,
    readonly untrusted: string | null,
    readonly receipt: DeskReceipt | null = null,
  ) {
    super(message);
  }
}

export function refusal(status: number, body: unknown): Error {
  const said = body as { error?: unknown; untrusted?: unknown; receipt?: DeskReceipt } | null;
  return new DeskRefusal(
    typeof said?.error === 'string' ? said.error : `the pc answered ${status}`,
    typeof said?.untrusted === 'string' ? said.untrusted : null,
    said?.receipt ?? null,
  );
}


export type TicketFor = { kind: 'view'; port: number } | { kind: 'screen' } | { kind: 'apk'; app: string };

export function deskCalls(send: DeskTransport, local = false) {
  return {
    control: async (request: RunControl) => readControlReceipt(((await send('POST', '/run-controls', request)) as { receipt: unknown }).receipt, request),
    controlReceipt: async (request: RunControl): Promise<ControlReceipt | null> => {
      const row = ((await send('GET', `/run-controls/${encodeURIComponent(request.commandId)}`)) as { receipt: unknown }).receipt;
      return row === null ? null : readControlReceipt(row, request);
    },
    queue: async (runId: string) => readRunQueue(((await send('GET', `/runs/${encodeURIComponent(runId)}/queue`)) as { queue: unknown }).queue, runId),
    answerApproval: async (answer: ApprovalAnswer) => readApprovalReceipt(((await send('POST', '/approval-answers', answer)) as { receipt: unknown }).receipt, answer),
    approvalReceipt: async (answer: ApprovalAnswer): Promise<ApprovalReceipt | null> => {
      const row = ((await send('GET', `/approval-answers/${encodeURIComponent(answer.commandId)}`)) as { receipt: unknown }).receipt;
      return row === null ? null : readApprovalReceipt(row, answer);
    },
    eventTicket: async () => {
      const body = await send('POST', '/event-ticket', { local }) as { url?: unknown };
      if (typeof body?.url !== 'string' || !/^ws:\/\/[^/]+\/events\/[A-Za-z0-9_-]{16,}$/.test(body.url)) throw new Error('Invalid PC stream ticket.');
      return body.url;
    },
    info: async () => (await send('GET', '/desk')) as DeskInfo,
    runs: async () => {
      const body = (await send('GET', '/runs')) as { runs?: unknown } | null;
      const runs = readDeskRuns(body?.runs);
      if (!runs) throw new Error('the pc did not return a valid run list');
      return runs;
    },
    start: async (start: DeskStart) => {
      const raw = ((await send('POST', '/runs', start)) as { run: unknown }).run;
      const runs = readDeskRuns([raw]); if (!runs) throw new Error('PC did not confirm a valid run.'); return runs[0];
    },
    receipt: async (id: string) => readDeskReceipt(((await send('GET', `/requests/${encodeURIComponent(id)}`)) as { receipt: unknown }).receipt, id),
    commands: async () => ((await send('GET', '/commands')) as { projects: DeskProjectCommands[] }).projects,
    worktrees: async () => readProjectWorktrees(((await send('GET', '/worktrees')) as { projects?: unknown })?.projects),
    reviewWorktree: async (id: string, action: WorktreeAction) => readWorktreeReview(((await send('POST', `/worktrees/${encodeURIComponent(id)}/review`, { action })) as { review: unknown }).review, id, action),
    actWorktree: async (request: WorktreeRequest) => readWorktreeReceipt(((await send('POST', `/worktrees/${encodeURIComponent(request.worktreeId)}`, request)) as { receipt: unknown }).receipt, request.commandId, request),
    worktreeReceipt: async (id: string) => {
      const raw = ((await send('GET', `/worktree-requests/${encodeURIComponent(id)}`)) as { receipt: unknown }).receipt;
      return raw === null ? null : readWorktreeReceipt(raw, id);
    },
    job: async (request: DeskJobStart) => ((await send('POST', '/commands', request)) as { run: DeskRun }).run,
    saveCommands: async (projectId: string, commands: DeskCommandDefinition[]) => void (await send('POST', `/commands/${encodeURIComponent(projectId)}/settings`, { commands })),
    stop: async (id: string) => void (await send('POST', `/runs/${encodeURIComponent(id)}/stop`)),
    log: async (id: string) => ((await send('GET', `/runs/${encodeURIComponent(id)}/log`)) as { lines: DeskLogLine[] }).lines,
    ports: async () => ((await send('GET', '/ports')) as { ports: DeskPort[] }).ports,
    apks: async () => ((await send('GET', '/apks')) as { apks: DeskApk[] }).apks,
    ticket: async (what: TicketFor) => ((await send('POST', '/tickets', what)) as { url: string }).url,
    trust: async (cwd: string) => ((await send('POST', '/trust', { cwd })) as { trusted: string }).trusted,
  };
}

export type DeskCalls = ReturnType<typeof deskCalls>;
