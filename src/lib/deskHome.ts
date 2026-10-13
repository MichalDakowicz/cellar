import { countToday } from './relTime';

/**
 * The desktop's home (docs/desk/screens.md, `DeskHome.dc.html`): the capture
 * bar's two returns and the "today" figures.
 *
 * Pure: the wide desk tab and the desktop window read the same keys and count
 * the same day.
 */

/** Enter files the thought; shift+enter hands it to an agent; anything else is typing. */
export function captureReturn(modifiers: { shift: boolean }): 'file' | 'handoff' {
  return modifiers.shift ? 'handoff' : 'file';
}

export type DeskFigure = { label: string; value: string };

/**
 * Today, in counts that are facts: thoughts dumped in the last day, runs the
 * phone or this window handed off, and how many of those an agent finished.
 */
export function deskToday(
  entryDates: readonly string[],
  runs: readonly { startedAt: number; state: string; origin: string }[],
  now: number = Date.now(),
): DeskFigure[] {
  const recent = runs.filter((run) => now - run.startedAt < 24 * 60 * 60 * 1000 && run.origin === 'phone');
  return [
    { label: 'thoughts dumped', value: String(countToday([...entryDates], now)) },
    { label: 'handed off', value: String(recent.length) },
    { label: 'done by agents', value: String(recent.filter((run) => run.state === 'done').length) },
  ];
}
