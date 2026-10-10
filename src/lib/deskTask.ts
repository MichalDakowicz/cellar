/**
 * A new task for the pc — what the new-task screen asks and what it sends
 * (docs/desk/screens.md, "new task").
 *
 * Pure: the phone's new-task screen and the desktop's capture bar build the
 * same task from the same choices, and must agree about when it can be sent.
 */

/** How much the agent may do without asking. Three words, the same on every agent. */
export type DeskMode = 'ask' | 'edits' | 'full';

export const DESK_MODES: { id: DeskMode; label: string; hint: string }[] = [
  { id: 'ask', label: 'ask first', hint: 'every command and file edit pings your phone first' },
  { id: 'edits', label: 'edits ok', hint: 'edits go ahead; commands and installs ping your phone first' },
  { id: 'full', label: 'full access', hint: 'nothing pings you — it runs to the end in its own worktree' },
];

export const DEFAULT_MODE: DeskMode = 'edits';

export function modeHint(mode: DeskMode): string {
  return (DESK_MODES.find((candidate) => candidate.id === mode) ?? DESK_MODES[1]).hint;
}

/** Where it works: the project's own checkout, or a fresh worktree off main. */
export type DeskWhere = 'main' | 'worktree';

/**
 * The prompt the agent gets: the attached thoughts' pick-up lines first, so the
 * agent claims them before it reads what you said about them, then your words.
 */
export function taskPrompt(typed: string, pickUps: readonly string[]): string {
  const said = typed.trim();
  return [...pickUps.map((line) => line.trim()).filter(Boolean), said].filter(Boolean).join('\n\n');
}

/**
 * Why the task cannot be sent yet, in words for the button's footnote; null
 * when it can. In the order you would fix them: say something, pick where,
 * then whatever the pc itself is up to.
 */
export function taskBlocker(input: {
  prompt: string;
  hasFolder: boolean;
  canStart: boolean;
  host: string;
  busy: boolean;
}): string | null {
  if (!input.prompt.trim()) return 'say what it should do';
  if (!input.hasFolder) return 'pick the project it works in';
  if (!input.canStart) return `${input.host} is off, asleep or away`;
  if (input.busy) return `asking ${input.host}…`;
  return null;
}

/** Several thoughts handed off together: one run picks them all up, or one run each. */
export type DeskSplit = 'one' | 'each';

/**
 * What a send starts: one prompt and the thought it is bound to, per run.
 *
 * One run over several thoughts gets the line that picks them all up and is
 * bound to the first — the pc follows one entry per run, and the agent claims
 * the rest from the line. One run each gets each thought's own line.
 */
export function taskStarts(input: {
  typed: string;
  picks: readonly { entryId: string; line: string }[];
  /** The single line that picks up every thought at once. */
  together: string;
  split: DeskSplit;
}): { prompt: string; entryId: string | null }[] {
  const { typed, picks, together, split } = input;
  if (picks.length === 0) return [{ prompt: taskPrompt(typed, []), entryId: null }];
  if (picks.length === 1) return [{ prompt: taskPrompt(typed, [picks[0].line]), entryId: picks[0].entryId }];
  if (split === 'one') return [{ prompt: taskPrompt(typed, [together]), entryId: picks[0].entryId }];
  return picks.map((pick) => ({ prompt: taskPrompt(typed, [pick.line]), entryId: pick.entryId }));
}
