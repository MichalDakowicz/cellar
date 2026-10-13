import { isDeskSeen } from '@/lib/deskProtocol';

/**
 * Which wire reaches the pc right now — the decision on the entry, "lan first,
 * realtime as the fallback", as one function.
 *
 *   bridge  this is the pc: Cellar's own window inside the desktop app
 *   lan     the paired pc answered on this network
 *   cellar  it did not, but it has beaten through the cellar in the last 90 s
 *   none    neither — off, asleep, or never paired
 *
 * Pure so the order is tested rather than read off a component.
 */

export type DeskVia = 'bridge' | 'lan' | 'cellar' | 'none';

export function chooseDeskVia(input: {
  bridge: boolean;
  lanAnswered: boolean;
  seenAt: string | null;
  now: number;
}): DeskVia {
  if (input.bridge) return 'bridge';
  if (input.lanAnswered) return 'lan';
  if (isDeskSeen(input.seenAt, input.now)) return 'cellar';
  return 'none';
}

/**
 * The pc this device means. A paired phone means the one it paired with; a
 * browser has no pairing — it never holds the LAN key — so it means the pc
 * that beat most recently.
 */
export function pickDesk<T extends { id: string; seenAt: string }>(desks: readonly T[], pairedId: string | null): T | null {
  if (pairedId) return desks.find((desk) => desk.id === pairedId) ?? null;
  return [...desks].sort((a, b) => Date.parse(b.seenAt) - Date.parse(a.seenAt))[0] ?? null;
}

/** What each wire can do. Pages, the screen and builds are big and local: the LAN only. */
export function deskCan(via: DeskVia) {
  return {
    start: via !== 'none',
    log: via === 'bridge' || via === 'lan',
    local: via === 'lan',
  };
}
