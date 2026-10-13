import type { Kind } from '@/types/cellar';

/**
 * The later desk screens (docs/desk/screens.md): share into cellar, race,
 * night shift, group run. The few rules they have, pure and tested, so the
 * wiring tasks (W17, W19) inherit them rather than rewrite them.
 */

/**
 * The kind a shared thing most likely is, from its words: something broken is
 * a glitch, a question asks, a link is research, the rest is an idea. A guess
 * the share sheet shows pre-picked — one tap changes it.
 */
export function guessKind(text: string): Kind {
  const said = text.toLowerCase();
  if (/(crash|broken|does ?n[o']t|doesnt|error|fails?|wrong|bug|nothing happens|stuck)/.test(said)) return 'glitch';
  if (/\?\s*$/.test(said.trim())) return 'question';
  if (/https?:\/\//.test(said)) return 'research';
  return 'idea';
}

type RaceRun = {
  agent: string;
  checks: string;
  added: number;
  removed: number;
  files: number;
  took: string;
  usage: string;
  approach: string;
};

/** The comparison under a race: one row per measure, one column per run. */
export function raceRows(runs: readonly RaceRun[]): { label: string; values: string[] }[] {
  return [
    { label: 'checks', values: runs.map((run) => run.checks) },
    { label: 'changed', values: runs.map((run) => `+${run.added} −${run.removed} · ${run.files} files`) },
    { label: 'took', values: runs.map((run) => run.took) },
    { label: 'usage', values: runs.map((run) => run.usage) },
    { label: 'approach', values: runs.map((run) => run.approach) },
  ];
}

/** "4 runs · 1 needs you · 1 failed" — the night in one line. */
export function nightLine(runs: readonly { state: 'passed' | 'waiting' | 'failed' }[]): string {
  const parts = [runs.length === 1 ? '1 run' : `${runs.length} runs`];
  const waiting = runs.filter((run) => run.state === 'waiting').length;
  const failed = runs.filter((run) => run.state === 'failed').length;
  if (waiting) parts.push(`${waiting} ${waiting === 1 ? 'needs' : 'need'} you`);
  if (failed) parts.push(`${failed} failed`);
  return parts.join(' · ');
}

/** What a group run's projects are up to, counted: "1 done · 1 doing · 1 waiting". */
export function groupLine(projects: readonly { state: 'done' | 'running' | 'waiting' | 'stopped' }[]): string {
  const words: [string, string][] = [
    ['done', 'done'],
    ['running', 'doing'],
    ['waiting', 'waiting on you'],
    ['stopped', 'skipped'],
  ];
  return words
    .map(([state, word]) => [projects.filter((project) => project.state === state).length, word] as const)
    .filter(([count]) => count > 0)
    .map(([count, word]) => `${count} ${word}`)
    .join(' · ');
}
