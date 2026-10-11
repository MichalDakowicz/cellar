import type { DeskLogLine } from './deskProtocol';

/**
 * A run's chat, as the run screen draws it (docs/desk/screens.md, "run chat").
 *
 * Your messages are bubbles, the agent's words are plain text, and tool steps
 * fold into one tile per stretch — a run that read twelve files is one row
 * saying so, not twelve rows to scroll past on a phone. Pure, so the phone and
 * the desktop chat fold a run the same way.
 */

export type ChatItem =
  | { kind: 'you'; text: string }
  | { kind: 'agent'; text: string }
  | { kind: 'tools'; steps: string[] }
  | { kind: 'note'; text: string };

export function chatItems(lines: readonly DeskLogLine[]): ChatItem[] {
  const out: ChatItem[] = [];
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    const last = out[out.length - 1];
    if (line.who === 'tool') {
      if (last?.kind === 'tools') last.steps.push(text);
      else out.push({ kind: 'tools', steps: [text] });
    } else if (line.who === 'you') out.push({ kind: 'you', text });
    else if (line.who === 'agent') out.push({ kind: 'agent', text });
    else out.push({ kind: 'note', text });
  }
  return out;
}

/** "read 4 files" when every step is a read, else "6 steps". What the folded tile says. */
export function toolsSummary(steps: readonly string[]): string {
  const reads = steps.filter((step) => /^(read|view|open)\b/i.test(step)).length;
  if (reads === steps.length) return `read ${steps.length} ${steps.length === 1 ? 'file' : 'files'}`;
  return `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`;
}

export type StepKind = 'read' | 'command' | 'edit' | 'other';

/** One row of a steps tile (`Run.dc.html`): its glyph, its words, and the raw steps under it. */
export type StepRow = { kind: StepKind; label: string; mono: boolean; steps: string[] };

function stepKind(step: string): StepKind {
  if (/^(read|view|open|glob|grep|ls)\b/i.test(step)) return 'read';
  if (/^(bash|run|shell|exec|command)\b/i.test(step)) return 'command';
  if (/^(edit|write|multiedit|create|patch|apply)\b/i.test(step)) return 'edit';
  return 'other';
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A stretch of steps as the board folds it: reads in a row become "read 4
 * files", each command is its own row in mono, edits in a row become "edited
 * 2 files"; anything else keeps its words.
 */
export function stepRows(steps: readonly string[]): StepRow[] {
  const rows: StepRow[] = [];
  for (const step of steps) {
    const kind = stepKind(step);
    const last = rows[rows.length - 1];
    if ((kind === 'read' || kind === 'edit') && last?.kind === kind) {
      last.steps.push(step);
      last.label = kind === 'read' ? `read ${plural(last.steps.length, 'file', 'files')}` : `edited ${plural(last.steps.length, 'file', 'files')}`;
      continue;
    }
    if (kind === 'read') rows.push({ kind, label: 'read 1 file', mono: false, steps: [step] });
    else if (kind === 'edit') rows.push({ kind, label: 'edited 1 file', mono: false, steps: [step] });
    else if (kind === 'command') rows.push({ kind, label: step.replace(/^\S+\s+/, '').replace(/^[—–-]\s*/, ''), mono: true, steps: [step] });
    else rows.push({ kind, label: step, mono: false, steps: [step] });
  }
  return rows;
}

/** Something the agent will not do without you, pinned above the composer until answered. */
export type DeskApproval = {
  /** "run a command", "edit a file", … */
  what: string;
  /** The command or file, in mono. */
  subject: string;
  /** Where and what it changes — "in .worktrees/desk-tab · changes package.json". */
  effect: string;
  /** The "for the rest of this run" offer, worded for what is asked. */
  always: string | null;
};
