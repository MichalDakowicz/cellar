import { oneLine } from '@/lib/dump';
import type { Entry, EntryLine, Kind } from '@/types/cellar';

/**
 * The rules an agent works a cellar entry under.
 *
 * They live here rather than in the MCP server because they are the contract
 * between the two halves: the app renders what an agent wrote and the agent
 * writes what the app can render, and a second copy of "what a glitch means"
 * would drift within a week. No React, no client — the server imports this file
 * directly (`mcp/`).
 *
 * The shape of the loop, and it is deliberately short:
 *
 *   open → claim → doing → work → done | dropped
 *                       ↘ ask → blocked → (you answer) → open
 */

/** Only an untouched, unarchived thought can be picked up. */
export function canClaim(entry: Pick<Entry, 'state' | 'archived'>): boolean {
  return entry.state === 'open' && !entry.archived;
}

/** What is stalled on an answer from you. Newest first — it is a reply queue. */
export function waitingOnYou<T extends Pick<Entry, 'state' | 'archived' | 'createdAt'>>(entries: T[]): T[] {
  return entries
    .filter((entry) => entry.state === 'blocked' && !entry.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** What an agent currently has its hands on. */
export function inProgress<T extends Pick<Entry, 'state' | 'archived' | 'agent'>>(entries: T[]): T[] {
  return entries.filter((entry) => entry.state === 'doing' && entry.agent !== null && !entry.archived);
}

/**
 * An entry's thread, cut into the two readings it actually has.
 *
 * Not interleaved. Your lines are the thought developing and an agent's are a
 * report against it, and a single chronological list makes a wall of one-liners
 * where you cannot tell which is which at a glance — the exact failure the
 * `source` column was added to prevent.
 */
export function splitThread<T extends Pick<EntryLine, 'source'>>(lines: T[]): { yours: T[]; agent: T[] } {
  return {
    yours: lines.filter((line) => line.source !== 'agent'),
    agent: lines.filter((line) => line.source === 'agent'),
  };
}

/**
 * An agent's line, held to the same shape as a dumped one.
 *
 * One line, always — `oneLine` is the capture rule the field itself uses, so a
 * report that arrives as a paragraph collapses rather than turning an entry
 * into a document. The cap is a hard stop for the same reason: this app's whole
 * readability comes from every row being one line long, and a model asked to be
 * terse will occasionally write an essay anyway.
 */
export const AGENT_LINE_MAX = 240;

export function agentLine(text: string): string {
  const collapsed = oneLine(text);
  if (collapsed.length <= AGENT_LINE_MAX) return collapsed;
  return `${collapsed.slice(0, AGENT_LINE_MAX - 1).trimEnd()}…`;
}

/**
 * How a line has to read.
 *
 * Handed to the agent verbatim on every claim, because the alternative is
 * result lines in assistant voice — "I've successfully implemented the
 * requested changes" — sitting under thoughts written as "nav island jumps on
 * keyboard open". One of those two voices makes the list unreadable.
 */
export const LINE_VOICE = [
  'lowercase, one line, no full stop',
  'say what changed or what you found, not that you did it',
  'no markdown, no code fences, no bullet characters',
  'name the file or the surface when it is the useful part',
  'match the voice of the entry you are answering — it is a mind dump, not a report',
].join('; ');

/**
 * What each kind asks of an agent.
 *
 * `ask` is the important column. Two kinds must never be guessed at: an idea is
 * a direction rather than a spec, and a removal destroys something. For both,
 * stopping to ask is the correct outcome, not a failure to complete.
 */
export type KindWork = {
  kind: Kind;
  /** One line, handed to the agent as the job. */
  brief: string;
  /** Stop and ask rather than proceed on an assumption. */
  ask: 'always' | 'when-unclear';
};

export const KIND_WORK: KindWork[] = [
  {
    kind: 'idea',
    brief:
      'a direction, not a spec. work out what it would actually mean, then ask before building it — the thought is one line and the decisions behind it were never written down',
    ask: 'always',
  },
  {
    kind: 'removal',
    brief:
      'something should go. find every place it touches, say what goes with it, and ask before deleting anything — this is the one kind that destroys work',
    ask: 'always',
  },
  {
    kind: 'glitch',
    brief: 'something is broken. reproduce it, fix it, cover it with a test, and report the cause in one line',
    ask: 'when-unclear',
  },
  {
    kind: 'question',
    brief: 'answer it from the repo. the answer goes back as a line — do not change code to answer a question',
    ask: 'when-unclear',
  },
  {
    kind: 'research',
    brief: 'find out and report back compactly. no code changes unless the entry asks for them',
    ask: 'when-unclear',
  },
  {
    kind: 'copy',
    brief: 'write the string. match the voice already in the surrounding UI rather than inventing a register',
    ask: 'when-unclear',
  },
  {
    kind: 'design',
    brief:
      'a design problem — layout, hierarchy, what a screen should feel like. general design work; only reach for a design system if this project actually has one',
    ask: 'when-unclear',
  },
];

const BY_KIND = new Map(KIND_WORK.map((work) => [work.kind, work]));

export function kindWork(kind: Kind): KindWork {
  return BY_KIND.get(kind) ?? BY_KIND.get('idea')!;
}

/** The sentence that goes in the brief when a kind must not be guessed at. */
export function askRule(kind: Kind): string {
  return kindWork(kind).ask === 'always'
    ? 'ask before you act. put the question on the entry with cellar_ask and stop — a blocked entry waiting on an answer is the right result here, not a half-built guess'
    : 'if the entry is ambiguous enough that two readings would produce different work, ask with cellar_ask instead of picking one';
}
