/**
 * Putting things in your own order by dragging them.
 *
 * Shelves and projects have always had a `position`; entries got one for this
 * (#26). All three are arranged the same way: the list you are looking at is
 * the order, and a drop renumbers it densely from one — so what you see is
 * exactly what is stored, and nothing depends on the gaps between numbers.
 *
 * Entries keep one rule of their own. A thought dumped after you arranged a
 * project has position 0, and 0 sorts first — so new thoughts still land on
 * top, above the ones you placed, and a project you arranged once does not
 * swallow tomorrow's dump somewhere in the middle.
 */

/** The list with one item moved. A new array; the one handed in is untouched. */
export function moveIndex<T>(list: readonly T[], from: number, to: number): T[] {
  const out = [...list];
  if (from < 0 || from >= out.length) return out;
  const [item] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, item);
  return out;
}

/**
 * The writes a drop needs: every row whose number changed, and no others.
 * Numbered from one, so an arranged entry never ties with a fresh one at 0.
 */
export function positionWrites(
  before: readonly { id: string; position: number }[],
  orderedIds: readonly string[],
): { id: string; position: number }[] {
  const current = new Map(before.map((row) => [row.id, row.position]));
  return orderedIds
    .map((id, index) => ({ id, position: index + 1 }))
    .filter((row) => current.get(row.id) !== row.position);
}

/** Your order: the placed ones by position, and anything never placed (0) first, newest first. */
export function byPosition<T extends { position?: number; createdAt: string }>(rows: readonly T[]): T[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        (a.row.position ?? 0) - (b.row.position ?? 0) ||
        b.row.createdAt.localeCompare(a.row.createdAt) ||
        a.index - b.index,
    )
    .map(({ row }) => row);
}
