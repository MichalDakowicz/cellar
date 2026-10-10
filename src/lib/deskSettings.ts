import type { DeskAgent } from './deskProtocol';
import { DESK_MODES, type DeskMode } from './deskTask';

/**
 * The desk half of settings (docs/desk/screens.md, `DeskUsage`, `DeskRecipes`,
 * `DeskHosts`): the tables the screen draws, and the rule for which agent a
 * new task starts with.
 *
 * Pure, so the phone's settings and the desktop's read the same words.
 */

/** Your own keys (docs/desk/keys.md): ideas to start from, with their default. */
export const EXTRA_KEYS: { key: string; name: string; searches: string; example: string; on: boolean }[] = [
  { key: '!', name: 'snippets', searches: 'saved prompts from a notes folder', example: '!review-tone', on: true },
  { key: '~', name: 'past runs', searches: 'pull another run’s plan and diff in as context', example: '~desk-tab', on: true },
  { key: '^', name: 'git', searches: 'branches, worktrees, commits', example: '^wt/desk-tab', on: false },
  { key: '%', name: 'links', searches: 'bookmarks: consoles, docs, dashboards', example: '%firebase', on: false },
];

/** Where pings go, top to bottom; the first rule that fits wins (`DeskHosts.dc.html`). */
export const PING_RULES: { when: string; where: string }[] = [
  { when: 'quiet hours 23:00–07:00', where: 'only approvals and questions, to the phone' },
  { when: 'desktop app in use', where: 'the desk only' },
  { when: 'not answered on the desk in 2 min', where: 'the phone too' },
  { when: 'idle 5 min, locked, or away', where: 'the phone' },
];

/** What pings at all, and whether it does out of the box. */
export const PING_KINDS: { label: string; on: boolean }[] = [
  { label: 'approvals', on: true },
  { label: 'questions', on: true },
  { label: 'run finished', on: true },
  { label: 'checks failed', on: true },
  { label: 'plan ran out', on: true },
  { label: 'crash filed', on: true },
  { label: 'every turn', on: false },
];

/**
 * The night shift's settings (`DeskHosts.dc.html`, "night shift"), as the
 * defaults it will start from. Drawn until the night shift runs (W19).
 */
export const NIGHT_SHIFT: { label: string; value: string; tokens?: string[] }[] = [
  { label: 'window', value: '01:00 to 06:00' },
  { label: 'runs on', value: 'this pc, if awake' },
  { label: 'never at night', value: 'anything marked “ships”', tokens: ['$deploy', '$apk'] },
  { label: 'stops when', value: '20% of the week is left on the account it uses' },
  { label: 'digest', value: '07:30, to the phone' },
];

/** What an agent does with one kind of thought (`DeskRecipes.dc.html`). */
export type DeskRecipe = {
  agent: DeskAgent | 'default';
  mode: DeskMode;
  /** `/` skills it loads, and the word beside them ("your skill", "none"). */
  skills: string[];
  skillsNote: string;
  /** The template; `{entry}` `{lines}` `{project}` `{files}` are filled in. */
  prompt: string;
  /** `$` commands after it, and when ("when checks pass", "nothing"). */
  after: string[];
  afterNote: string;
  then: string;
};

/**
 * What every kind does until it has a recipe of its own (W15): your default
 * agent and mode, the line that picks the thought up, nothing after.
 */
export function defaultRecipe(agent: DeskAgent, mode: DeskMode): DeskRecipe {
  return {
    agent,
    mode,
    skills: [],
    skillsNote: 'none',
    prompt: 'pick up cellar entry {entry} in {project}',
    after: [],
    afterNote: 'nothing',
    then: 'the agent claims it, moves it to doing and writes what it did under it',
  };
}

/** When a plan runs out mid-run (`DeskUsage.dc.html`); "ask me" is the default. */
export const PLAN_OUT_POLICIES = ['ask me', 'next account', 'use the api key', 'hand to the other agent', 'wait for the reset'];

/** Usage limits and whether each is on out of the box. */
export const USAGE_LIMITS: { label: string; sub: string; on: boolean }[] = [
  { label: 'hold new runs at 90% of a 5-hour window', sub: 'running ones finish; new ones wait for the reset', on: true },
  { label: 'keep 20% of the week for daytime', sub: 'night shift and group runs stop before they eat into it', on: true },
  { label: 'ping my phone at 80%', sub: 'once per window, not per run', on: true },
  { label: 'show the meter in chat and on the desk tab', sub: 'context, 5-hour and week in one small pill', on: true },
];

/** A recipe's one-line summary: "claude · edits ok", or "project default · ask first". */
export function recipeLine(recipe: Pick<DeskRecipe, 'agent' | 'mode'>): string {
  const agent = recipe.agent === 'default' ? 'project default' : recipe.agent;
  const mode = DESK_MODES.find((candidate) => candidate.id === recipe.mode)?.label ?? recipe.mode;
  return `${agent} · ${mode}`;
}

/**
 * The agent a new task starts with: the one you set as default, when the pc
 * has it; otherwise the first the pc offers. Never one it cannot run.
 */
export function startingAgent(preferred: DeskAgent, offered: readonly DeskAgent[]): DeskAgent {
  return offered.includes(preferred) ? preferred : (offered[0] ?? preferred);
}
