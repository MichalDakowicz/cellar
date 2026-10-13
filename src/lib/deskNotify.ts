import { optionLabel } from './entryQuestions';

/**
 * Notifications that answer (docs/desk/screens.md, `PhoneNotify.dc.html`): one
 * per run, updated in place; approvals with up to three buttons; questions
 * with their first two options and "more".
 *
 * Pure: the in-app previews and, later, the real notifications (W13) build
 * the same note from the same run, approval or question — so what you see in
 * the preview is what the shade will show.
 */

/** Android shows three buttons on a notification and drops the rest. */
export const NOTE_ACTIONS_MAX = 3;

export type NoteAction = { id: string; label: string };

export type NoteView = {
  id: string;
  /** The small line by the app icon: "cellar · running · michu-pc". */
  head: string;
  title: string;
  body: string[];
  /** The first body line is a command or a path. */
  mono: boolean;
  /** 0–1 for a plan in progress; null with no plan. */
  progress: number | null;
  actions: NoteAction[];
};

const MORE: NoteAction = { id: 'more', label: 'more…' };

/** At most three buttons: past that, the first two and "more…". */
export function capActions(actions: readonly NoteAction[]): NoteAction[] {
  return actions.length <= NOTE_ACTIONS_MAX ? [...actions] : [...actions.slice(0, NOTE_ACTIONS_MAX - 1), MORE];
}

/** One note per run, rewritten as it moves: "plan 3 of 5", what it is doing. */
export function runNote(run: {
  id: string;
  title: string;
  host: string;
  doing: string | null;
  plan: { at: number; of: number } | null;
  stoppable: boolean;
}): NoteView {
  const title = run.plan ? `${run.title} · plan ${run.plan.at} of ${run.plan.of}` : run.title;
  return {
    id: `run:${run.id}`,
    head: `cellar · running · ${run.host}`,
    title,
    body: run.doing ? [run.doing] : [],
    mono: false,
    progress: run.plan && run.plan.of > 0 ? Math.min(1, run.plan.at / run.plan.of) : null,
    actions: capActions([...(run.stoppable ? [{ id: 'stop', label: 'stop' }] : []), { id: 'open', label: 'open' }]),
  };
}

/** A permission ask: deny, allow for the rest of the run, allow. */
export function approvalNote(ask: { id: string; agent: string; what: string; subject: string; where: string }): NoteView {
  return {
    id: `approval:${ask.id}`,
    head: 'cellar · waiting on you',
    title: `${ask.agent} wants to ${ask.what}`,
    body: [ask.subject, ask.where],
    mono: true,
    progress: null,
    actions: capActions([
      { id: 'deny', label: 'deny' },
      { id: 'always', label: 'allow for this run' },
      { id: 'allow', label: 'allow' },
    ]),
  };
}

/**
 * A question: its first two options as lettered lines and buttons, the rest
 * behind "more…", and free text as the inline reply.
 */
export function questionNote(ask: { id: string; agent: string | null; where: string; question: string; options: readonly string[] }): NoteView {
  const shown = ask.options.slice(0, 2);
  const rest = ask.options.length - shown.length;
  const lines = shown.map((option, index) => `${optionLabel(index)}  ${option}`);
  if (rest > 0) lines.push(`+${rest} more · or reply in your own words`);
  else if (ask.options.length === 0) lines.push('reply in your own words');
  return {
    id: `question:${ask.id}`,
    head: `cellar · ${ask.agent ?? 'an agent'} asks · ${ask.where}`,
    title: ask.question,
    body: lines,
    mono: false,
    progress: null,
    actions: [...shown.map((_, index) => ({ id: `option:${index}`, label: optionLabel(index) })), ...(rest > 0 || shown.length === 0 ? [MORE] : [])],
  };
}
