/**
 * What the phone and the pc say to each other, once they are paired.
 *
 * One vocabulary for three transports: the LAN (the phone talking to the pc
 * directly), the bridge (Cellar's own window inside the desktop app), and the
 * cellar itself (a row the pc picks up over realtime when the phone is not on
 * the same network). The shapes are the same on all three, so a run started
 * over one reads the same over the others.
 *
 * Pure: the desktop host imports this to check what it is sent, the app imports
 * it to build what it sends, and the two must never disagree about what a
 * valid start is.
 */

/** The agents a run can be. Which of them the pc actually has installed is the pc's to say. */
export type DeskAgent = 'claude' | 'codex' | 'agy';

export const DESK_AGENTS: readonly { id: DeskAgent; label: string }[] = [
  { id: 'claude', label: 'claude' },
  { id: 'codex', label: 'codex' },
  { id: 'agy', label: 'antigravity' },
];

export function isDeskAgent(value: unknown): value is DeskAgent {
  return DESK_AGENTS.some((agent) => agent.id === value);
}

export function agentLabel(agent: DeskAgent | 'job'): string {
  if (agent === 'job') return 'job';
  return DESK_AGENTS.find((candidate) => candidate.id === agent)?.label ?? agent;
}

/** A prompt is a thought plus whatever you typed around it, never a document. */
export const PROMPT_MAX = 8000;

export type DeskStart = {
  commandId?: string;
  projectId?: string;
  where?: 'main' | 'worktree';
  mode?: 'ask' | 'edits' | 'full';
  entryIds?: string[];
  agent: DeskAgent;
  prompt: string;
  /** The folder it runs in — must be a project's `repo_path`, which the pc checks. */
  cwd: string;
  /** What the run is called in lists; derived from the prompt when absent. */
  name: string | null;
  /** The thought it was started from, so the run can be shown on it. */
  entryId: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** A start as it arrived — JSON off the wire or a row out of the cellar — checked field by field. */
export function parseDeskStart(raw: unknown): Parsed<DeskStart> {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'nothing to start' };
  const body = raw as Record<string, unknown>;

  const agent = body.agent ?? 'claude';
  if (!isDeskAgent(agent)) return { ok: false, error: `unknown agent ${String(agent)}` };

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) return { ok: false, error: 'the prompt is empty' };
  if (prompt.length > PROMPT_MAX) return { ok: false, error: 'the prompt is too long' };

  const cwd = typeof body.cwd === 'string' ? body.cwd.trim() : '';
  if (!cwd) return { ok: false, error: 'no folder to run in' };

  const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : null;
  const entryId = typeof body.entryId === 'string' && UUID.test(body.entryId) ? body.entryId : null;
  if (body.commandId === undefined) return { ok: true, value: { agent, prompt, cwd, name, entryId } };
  if (typeof body.commandId !== 'string' || !UUID.test(body.commandId)) return { ok: false, error: 'invalid commandId' };
  if (typeof body.projectId !== 'string' || !UUID.test(body.projectId)) return { ok: false, error: 'pick a real project' };
  if (body.where !== 'main' && body.where !== 'worktree') return { ok: false, error: 'pick a checkout or worktree' };
  if (!['ask', 'edits', 'full'].includes(String(body.mode))) return { ok: false, error: 'pick an access mode' };
  if (!Array.isArray(body.entryIds) || body.entryIds.length > 20 || body.entryIds.some((id) => typeof id !== 'string' || !UUID.test(id)) || new Set(body.entryIds).size !== body.entryIds.length) {
    return { ok: false, error: 'attach up to 20 distinct entry ids' };
  }
  return { ok: true, value: { agent, prompt, cwd, name, entryId: body.entryIds[0] ?? null, commandId: body.commandId,
    projectId: body.projectId, where: body.where, mode: body.mode as DeskStart['mode'], entryIds: body.entryIds } };
}

/** The first line of the prompt, cut to something a list row can hold. */
export function runTitle(start: Pick<DeskStart, 'prompt' | 'name'>): string {
  if (start.name) return start.name;
  const first = start.prompt.split(/\r?\n/)[0].trim();
  return first.length > 60 ? `${first.slice(0, 59)}…` : first;
}

/**
 * Where a run is. `waiting` is the one that needs you — the agent stopped on
 * something it will not do without a person, which on a background run means
 * someone has to open it at the pc.
 */
export type DeskRunState = 'running' | 'waiting' | 'done' | 'failed' | 'stopped' | 'unknown';

export type DeskRun = {
  commandId?: string;
  entryIds?: string[];
  projectId?: string;
  mode?: DeskStart['mode'];
  where?: DeskStart['where'];
  id: string;
  agent: DeskAgent | 'job';
  name: string;
  cwd: string;
  startedAt: number;
  state: DeskRunState;
  entryId: string | null;
  /** `phone` when this desk started it; `pc` for a session someone opened at the pc. */
  origin: 'phone' | 'pc';
};

export const RUN_STATE_LABEL: Record<DeskRunState, string> = {
  running: 'running',
  waiting: 'needs you at the pc',
  done: 'done',
  failed: 'failed',
  stopped: 'stopped',
  unknown: 'status unknown',
};

export function isLiveRun(run: Pick<DeskRun, 'state'>): boolean {
  return run.state === 'running' || run.state === 'waiting';
}

/** Newest first, live ones above finished ones — what you look for is what is still going. */
export function sortRuns<T extends Pick<DeskRun, 'state' | 'startedAt'>>(runs: readonly T[]): T[] {
  return [...runs].sort(
    (a, b) => Number(isLiveRun(b)) - Number(isLiveRun(a)) || b.startedAt - a.startedAt,
  );
}

/** One line of what a run has said, already reduced to something a phone can show. */
export type DeskLogLine = { who: 'you' | 'agent' | 'tool' | 'system'; text: string };

/** A port something on the pc is listening on, and what that something is. */
export type DeskPort = { port: number; pid: number; process: string | null };

/** The newest built installable of one app. */
export type DeskApk = { app: string; file: string; version: string | null; size: number; builtAt: number };

/** What `GET /desk` answers. */
export type DeskInfo = {
  taskProtocol?: 2;
  id: string;
  name: string;
  version: string;
  agents: { id: DeskAgent; installed: boolean }[];
  /** Whether Cellar is signed in on the pc — without it the pc cannot check a folder. */
  signedIn: boolean;
};

/**
 * A request through the cellar older than this is not run. A start sent while
 * the pc was asleep must not fire hours later when it wakes, into whatever the
 * repo has become since.
 */
export const STALE_REQUEST_MS = 10 * 60_000;

export function isStaleRequest(createdAt: string, now: number): boolean {
  const at = Date.parse(createdAt);
  return !Number.isFinite(at) || now - at > STALE_REQUEST_MS;
}

/** How long a pc's heartbeat counts as "on". It beats every 30 s. */
export const DESK_SEEN_MS = 90_000;

export function isDeskSeen(seenAt: string | null | undefined, now: number): boolean {
  if (!seenAt) return false;
  const at = Date.parse(seenAt);
  return Number.isFinite(at) && now - at <= DESK_SEEN_MS;
}
