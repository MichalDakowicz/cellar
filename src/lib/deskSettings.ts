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
export const EXTRA_KEYS: { key: string; name: string; example: string; on: boolean }[] = [
  { key: '!', name: 'snippets', example: '!review-tone', on: true },
  { key: '~', name: 'past runs', example: '~desk-tab', on: true },
  { key: '^', name: 'git', example: '^wt/desk-tab', on: false },
  { key: '%', name: 'links', example: '%firebase', on: false },
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

/** A recipe's one-line summary: "claude · edits ok", or "project default · ask first". */
export function recipeLine(recipe: { agent: DeskAgent | 'default'; mode: DeskMode }): string {
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
