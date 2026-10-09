/**
 * The live pc screen (docs/desk/screens.md, `Screen.dc.html`): landscape, the
 * picture edge to edge, and the four ways to drive it.
 *
 * Pure: the phone's screen view and the desktop's phone panel name the modes
 * and say the same hint for each.
 */

export type ScreenMode = 'touch' | 'pad' | 'keys' | 'voice';

export type ScreenModeMeta = { id: ScreenMode; label: string; hint: string };

export const SCREEN_MODES: ScreenModeMeta[] = [
  { id: 'touch', label: 'touch — tap where you look', hint: 'tap = click · two fingers = scroll · hold = right click' },
  { id: 'pad', label: 'trackpad — drag the cursor', hint: 'drag moves the cursor · tap = click · two fingers = scroll' },
  { id: 'keys', label: 'keyboard', hint: 'keyboard is up · ctrl, alt and tab ride above it' },
  { id: 'voice', label: 'dictate into the focused field', hint: 'talk — it types into whatever has focus on the pc' },
];

export function screenMode(id: ScreenMode): ScreenModeMeta {
  return SCREEN_MODES.find((mode) => mode.id === id) ?? SCREEN_MODES[0];
}

/**
 * The hint pill. Until the pc takes input (docs/desk/TASKS.md W18) the modes are
 * drawn and nothing reaches the pc, and the pill says so rather than letting a
 * tap look broken.
 */
export function screenHint(id: ScreenMode, controls: boolean): string {
  const mode = screenMode(id);
  return controls ? mode.hint : `${mode.label} · comes later, view only for now`;
}

export type ScreenLoad = 'connecting' | 'live' | 'gone';

/** The host pill: who, and how the picture is doing. */
export function screenStatus(load: ScreenLoad): { text: string; live: boolean } {
  if (load === 'live') return { text: 'a few frames a second', live: true };
  if (load === 'gone') return { text: 'not answering', live: false };
  return { text: 'connecting', live: false };
}
