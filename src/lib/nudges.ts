import type { Kind } from '@/types/cellar';

/**
 * A nudge: a banner about a thought you dumped and then left alone.
 *
 * Fires only when something has sat untouched past your threshold, at most as
 * many times a day as you allowed — and when more have gone stale than the
 * allowance covers, they go out as one grouped banner instead of being cut to
 * the first few. Unfiled ideas lead: an app idea waiting in the inbox is the
 * thought this was asked for.
 *
 * Pure. The OS half is `features/notifications/nudgeNotifier.ts`, which also
 * keeps the ledger of what this device already said.
 */

export const NUDGE_DAYS = [3, 7, 14, 30] as const;
export const NUDGES_PER_DAY = [1, 2, 3, 5] as const;

export function nudgeDaysOf(value: unknown): number {
  return NUDGE_DAYS.includes(value as (typeof NUDGE_DAYS)[number]) ? (value as number) : 7;
}

export function nudgesPerDayOf(value: unknown): number {
  return NUDGES_PER_DAY.includes(value as (typeof NUDGES_PER_DAY)[number]) ? (value as number) : 1;
}

export type NudgeCandidate = {
  id: string;
  text: string;
  kind: Kind;
  projectId: string | null;
  createdAt: string;
  /** The row's own stamp, moved by any write to it (`cellar_touch_updated_at`). */
  updatedAt: string | null;
};

const DAY = 24 * 60 * 60 * 1000;

function touchedAt(thought: NudgeCandidate): number {
  const created = Date.parse(thought.createdAt);
  const updated = thought.updatedAt ? Date.parse(thought.updatedAt) : Number.NaN;
  return Number.isNaN(updated) ? created : Math.max(created, updated);
}

/** Which of the unfiled-idea, unfiled, idea, rest buckets a thought falls in. Lower leads. */
function rank(thought: NudgeCandidate): number {
  const unfiled = thought.projectId === null;
  const idea = thought.kind === 'idea';
  return unfiled && idea ? 0 : unfiled ? 1 : idea ? 2 : 3;
}

/** Open thoughts past the threshold, unfiled ideas first, then oldest first. */
export function staleThoughts(thoughts: NudgeCandidate[], now: number, days: number): NudgeCandidate[] {
  const cutoff = now - days * DAY;
  return thoughts
    .filter((thought) => touchedAt(thought) < cutoff)
    .sort((a, b) => rank(a) - rank(b) || touchedAt(a) - touchedAt(b));
}

/** What this device has already said, and when. A grouped banner is one line, keyed `group`. */
export type NudgeLedger = { key: string; at: number }[];

export type Nudge = {
  key: string;
  title: string;
  body: string;
  /** Where a tap goes: the thought itself, or a list when the banner covers several. */
  route: string;
  covers: string[];
};

/**
 * The banners owed right now, and the ledger to keep afterwards.
 *
 * A thought already nudged inside its own threshold is not nudged again — a
 * week-old idea gets one banner a week, not one a day. The day's allowance
 * counts banners, not thoughts, so a grouped one costs one.
 */
export function nudgesDue(
  stale: NudgeCandidate[],
  ledger: NudgeLedger,
  input: { now: number; days: number; perDay: number; nameOf: (projectId: string | null) => string },
): { nudges: Nudge[]; ledger: NudgeLedger } {
  const { now, days, perDay, nameOf } = input;
  const kept = ledger.filter((line) => line.at > now - Math.max(days, 1) * DAY);
  const sentToday = kept.filter((line) => line.at > now - DAY && !line.key.startsWith('covered:')).length;
  const allowance = perDay - sentToday;
  const recently = new Set(kept.filter((line) => line.key.startsWith('covered:')).map((line) => line.key.slice(8)));
  const fresh = stale.filter((thought) => !recently.has(thought.id));

  if (allowance <= 0 || fresh.length === 0) return { nudges: [], ledger: kept };

  const age = (thought: NudgeCandidate) => `${Math.floor((now - touchedAt(thought)) / DAY)}d`;
  const nudges: Nudge[] =
    fresh.length <= allowance
      ? fresh.map((thought) => ({
          key: `nudge:${thought.id}`,
          title: `${thought.projectId === null ? 'still in the inbox' : nameOf(thought.projectId)} · untouched ${age(thought)}`,
          body: thought.text,
          route: `/entry/${thought.id}`,
          covers: [thought.id],
        }))
      : [
          {
            key: `nudge:group:${Math.floor(now / DAY)}`,
            title: `${fresh.length} thoughts untouched for ${days}d or more`,
            body: fresh
              .slice(0, 3)
              .map((thought) => thought.text)
              .join(' · '),
            route: fresh.every((thought) => thought.projectId === null) ? '/inbox' : '/shelf',
            covers: fresh.map((thought) => thought.id),
          },
        ];

  const sent = nudges.map((nudge) => ({ key: nudge.key, at: now }));
  const covered = nudges.flatMap((nudge) => nudge.covers.map((id) => ({ key: `covered:${id}`, at: now })));
  return { nudges, ledger: [...kept, ...sent, ...covered] };
}
