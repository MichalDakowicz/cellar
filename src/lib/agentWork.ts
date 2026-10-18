import { oneLine } from '@/lib/dump';
import type { Entry, EntryLine, EntryState, Kind } from '@/types/cellar';

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
 *   open → claim → doing → work → done | dropped → (reopen) → open
 *                       ↘ ask → blocked → (you answer) → open
 *
 * Where the asking happens depends on how much work is on the table, and that
 * is the one rule an agent has to get right — see `ASK_WHERE`.
 */

/** Only an untouched, unarchived thought can be picked up. */
export function canClaim(entry: Pick<Entry, 'state' | 'archived'>): boolean {
  return entry.state === 'open' && !entry.archived;
}

/**
 * Putting a claim back is for a claim. Anything else sent back to open through
 * the unclaim door is a reopen nobody asked for — a done thought quietly
 * undone, or a question dropped on the floor.
 */
export function canUnclaim(entry: Pick<Entry, 'state'>): boolean {
  return entry.state === 'doing';
}

/**
 * What bringing a thought back writes, or why it cannot come back.
 *
 * Settled is the case: done or dropped goes back to open with nobody's name on
 * it, so it can be claimed again. Archived comes back out too, and lands open if
 * it had been settled before it was put away — an archived thought that was
 * still open or waiting comes back exactly as it was.
 *
 * The three refusals each have a better tool, and naming it is the point: a
 * blocked thought is answered, not reopened; a claimed one is someone's work;
 * an open one is already there.
 */
export type ReopenPlan =
  | { ok: true; patch: { state: EntryState; agent: string | null; archived: false } }
  | { ok: false; why: string };

const SETTLED: EntryState[] = ['done', 'dropped'];

export function reopenPlan(entry: Pick<Entry, 'state' | 'archived' | 'agent'>): ReopenPlan {
  const settled = SETTLED.includes(entry.state);
  if (settled) return { ok: true, patch: { state: 'open', agent: null, archived: false } };
  if (entry.archived) return { ok: true, patch: { state: entry.state, agent: entry.agent, archived: false } };

  if (entry.state === 'blocked') {
    return { ok: false, why: 'it is blocked on a question — answer it with cellar_answer_question instead' };
  }
  if (entry.state === 'doing') {
    return {
      ok: false,
      why: `it is being worked${entry.agent ? ` by ${entry.agent}` : ''} — cellar_unclaim_entry puts a claim back`,
    };
  }
  return { ok: false, why: 'it is already open' };
}

/** What is stalled on an answer from you. Newest first — it is a reply queue. */
export function waitingOnYou<T extends Pick<Entry, 'state' | 'archived' | 'createdAt'>>(entries: T[]): T[] {
  return entries
    .filter((entry) => entry.state === 'blocked' && !entry.archived)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Which agent has this thought right now, for its badge. `agent` is also set on
 * a thought an agent dumped, so it names the claimer only while the thought is
 * being worked or waiting on the answer to an agent's question.
 */
export function claimedBy(entry: Pick<Entry, 'state' | 'agent'>): string | null {
  return entry.state === 'doing' || entry.state === 'blocked' ? entry.agent : null;
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
 * A kind describes the work, not whether permission is needed. Ask only when
 * the entry and repo leave a material decision unresolved; see `askRule`.
 */
export type KindWork = {
  kind: Kind;
  /** One line, handed to the agent as the job. */
  brief: string;
};

export const KIND_WORK: KindWork[] = [
  {
    kind: 'idea',
    brief:
      'work out the intended change from the entry, its follow-ups and the repo, then build it; ask only when a material decision cannot reasonably be inferred',
  },
  {
    kind: 'removal',
    brief:
      'something should go. find every place it touches and remove the requested scope; ask only when scope is materially unclear or a destructive action lacks authorization',
  },
  {
    kind: 'glitch',
    brief: 'something is broken. reproduce it, fix it, cover it with a test, and report the cause in one line',
  },
  {
    kind: 'question',
    brief: 'answer it from the repo. the answer goes back as a line — do not change code to answer a question',
  },
  {
    kind: 'research',
    brief: 'find out and report back compactly. no code changes unless the entry asks for them',
  },
  {
    kind: 'copy',
    brief: 'write the string. match the voice already in the surrounding UI rather than inventing a register',
  },
  {
    kind: 'design',
    brief:
      'a design problem — layout, hierarchy, what a screen should feel like. general design work; only reach for a design system if this project actually has one',
  },
];

const BY_KIND = new Map(KIND_WORK.map((work) => [work.kind, work]));

export function kindWork(kind: Kind): KindWork {
  return BY_KIND.get(kind) ?? BY_KIND.get('idea')!;
}

/** One asking rule for every kind, handed over in each brief. */
export function askRule(): string {
  return 'ask only when necessary: read the entry, its follow-ups and the repo first; proceed when intent is clear or a reasonable, reversible default fits, and report meaningful assumptions; ask only for unresolved ambiguity that materially changes the work, essential missing information, or a destructive action without existing authorization; an idea or removal label alone never requires a question';
}

/**
 * Where to ask, which is not the same question as whether to.
 *
 * One task in front of you means the user is sitting there: asking in the chat
 * costs them a sentence and costs you nothing, and routing it through the
 * cellar would stall the only thing they asked for behind a notification.
 *
 * Several tasks means they have gone away. Then the question goes on the entry,
 * which blocks that one thought and *only* that one — everything else on the
 * list is still work you can do, and by the time it is done the answer may
 * already be there. What must not happen is holding the question in your head
 * until the end: a session that dies mid-batch takes it with it, and nothing
 * ever reached their inbox to say something was waiting.
 *
 * Handed over verbatim on every claim, because this is exactly the decision a
 * model gets wrong in the direction of interrupting.
 */
export const ASK_WHERE = [
  'one task in this session: ask in the chat. the user is right there, and a blocked entry would stall the only thing they asked for',
  'several tasks: cellar_ask on the entry, then move to the next one — ask as soon as you know, never at the end, or a session that dies takes the question with it',
  'as each thought finishes, and before you stop: cellar_check_answers — an answer that arrived is yours to pick back up',
  'still unanswered when the work runs out: ask that same question in the chat, then write the answer back with cellar_answer_question so the entry keeps the pair',
].join('\n           ');

/**
 * Whether the phone is fair game, as the line `cellar_orient` prints.
 *
 * Read off the user's own switch (`cellar_settings.agent_device`), so the
 * answer is given once, in the app, and every agent hears it — instead of each
 * session stopping to ask "may I install this on your phone" or, worse, not
 * asking. Unknown reads as no: a failed read must never be a yes.
 */
export function deviceRule(allowed: boolean | null): string {
  return allowed
    ? 'yes — you may install the app on their phone over adb, launch it and drive it to test your change, without asking first'
    : 'no — do not install on or drive their phone; if only a device test would settle it, say so and ask in the chat';
}
