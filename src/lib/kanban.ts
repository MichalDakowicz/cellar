import { BANDS, bandOf } from '@/lib/entryGroups';
import { orderedKinds } from '@/lib/displayPrefs';
import type { Band } from '@/lib/entryGroups';
import type { Entry, Kind } from '@/types/cellar';

/**
 * The board reading of a project: the same entries as the other two, stood up
 * in columns instead of laid down in bands.
 *
 * Pure, like the rest of the grouping — the columns are the thing every surface
 * argues about and they are only worth arguing about once.
 */

/** What the columns are cut by. The toggle that rides the view control. */
export type KanbanAxis = 'state' | 'kind';

export type KanbanColumn = {
  key: string;
  label: string;
  /** Set on a state-cut column — the band it is, so the header can wear its dot. */
  band?: Band;
  /** Set on a kind-cut column, so the header can wear the kind's glyph. */
  kind?: Kind;
  entries: Entry[];
};

/**
 * Every column, in the fixed order of BANDS or KINDS — including the empty
 * ones, which is the one place this differs from the grouped reading.
 *
 * A band with nothing in it drops out of a list because a heading over nothing
 * is noise. A *column* with nothing in it is the opposite: an empty "doing"
 * says you have started nothing, and a board whose columns appear and vanish as
 * you work is a board you have to re-read every visit.
 *
 * Order within a column is the order it was handed, so the board agrees with
 * the stream about which thought is newest.
 */
export function kanbanColumns(entries: Entry[], axis: KanbanAxis, order?: readonly string[] | null): KanbanColumn[] {
  if (axis === 'kind') {
    return orderedKinds(order).map((meta) => ({
      key: `k:${meta.value}`,
      label: meta.value,
      kind: meta.value,
      entries: entries.filter((entry) => entry.kind === meta.value),
    }));
  }

  return BANDS.map((band) => ({
    key: `b:${band}`,
    label: band,
    band,
    entries: entries.filter((entry) => bandOf(entry) === band),
  }));
}

export function isKanbanAxis(value: unknown): value is KanbanAxis {
  return value === 'state' || value === 'kind';
}
