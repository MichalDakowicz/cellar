import type { Entry } from '@/types/cellar';

/**
 * Holding several thoughts at once, so one action lands on all of them.
 *
 * Pure: the order matters (it is the order the copied line names them in) and
 * "do these all live in the same project" is the question the copy line and the
 * file sheet both ask, so neither may work it out for itself.
 */

export function toggleSelected(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((held) => held !== id) : [...ids, id];
}

/**
 * The held entries, in the order they were picked rather than the order the
 * list draws them — you chose them in some order and the copied line should
 * read back the same way.
 *
 * An id with no entry behind it drops out. A selection outlives a refetch, and
 * a thought can be deleted or archived out from under one.
 */
export function selectedEntries(entries: Entry[], ids: readonly string[]): Entry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return ids.map((id) => byId.get(id)).filter((entry): entry is Entry => entry !== undefined);
}

/**
 * The one project they are all in, or null.
 *
 * Null covers three different things on purpose — nothing selected, a selection
 * that spans projects, and a selection sitting in the inbox — because every
 * caller does the same thing with all three: leave the project out of it. A
 * copied line that names one project for thoughts from two is worse than one
 * that names none.
 */
export function sharedProjectId(entries: Entry[]): string | null {
  const first = entries[0]?.projectId ?? null;
  if (first === null) return null;
  return entries.every((entry) => entry.projectId === first) ? first : null;
}
