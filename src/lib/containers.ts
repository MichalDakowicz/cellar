import { plural } from '@/lib/plural';
import type { Entry, Project, Shelf } from '@/types/cellar';

/**
 * What renaming and removing a shelf or a project actually costs.
 *
 * The rule the whole app is built on is that nothing is destroyed to get it out
 * of the way — so deleting a *container* must never destroy what is inside it.
 * A project's entries fall back to the inbox (`project_id` is
 * `on delete set null`), and deleting a shelf cascades to its projects, which
 * fires the same fallback. These functions are what the confirm dialog says out
 * loud before any of that happens.
 *
 * Pure, no React: this is the part worth testing, and it is only testable if it
 * never touches a client.
 */

export type NameError = 'empty' | 'taken' | null;

/** A container name is trimmed, non-empty, and unique among its siblings. */
export function checkName(name: string, siblings: string[], currentName?: string): NameError {
  const clean = name.trim();
  if (!clean) return 'empty';
  if (currentName && clean.toLowerCase() === currentName.trim().toLowerCase()) return null;
  return siblings.some((sibling) => sibling.trim().toLowerCase() === clean.toLowerCase()) ? 'taken' : null;
}

export function nameErrorText(error: NameError, noun: 'shelf' | 'project'): string | null {
  if (error === 'empty') return `give the ${noun} a name`;
  if (error === 'taken') return `there is already a ${noun} called that`;
  return null;
}

export type DeleteCost = {
  /** Projects that go with it. Zero when deleting a project itself. */
  projects: number;
  /** Entries that survive, landing back in the inbox. */
  toInbox: number;
  /** The sentence the confirm dialog shows. Never "this cannot be undone". */
  body: string;
};

/** "moves" / "move" — the verb has to agree or the whole sentence reads machine-made. */
function agrees(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export function deleteProjectCost(projectId: string, entries: Entry[]): DeleteCost {
  const toInbox = entries.filter((entry) => entry.projectId === projectId).length;
  if (toInbox === 0) return { projects: 0, toInbox, body: 'nothing is in it.' };
  return {
    projects: 0,
    toInbox,
    body: `${plural(toInbox, 'entry', 'entries')} ${agrees(toInbox, 'moves', 'move')} back to the inbox.`,
  };
}

export function deleteShelfCost(shelfId: string, projects: Project[], entries: Entry[]): DeleteCost {
  const mine = projects.filter((project) => project.shelfId === shelfId);
  const ids = new Set(mine.map((project) => project.id));
  const toInbox = entries.filter((entry) => entry.projectId !== null && ids.has(entry.projectId)).length;

  const parts = [`${plural(mine.length, 'project')} ${agrees(mine.length, 'goes', 'go')} with it`];
  if (toInbox > 0) {
    parts.push(`${plural(toInbox, 'entry', 'entries')} ${agrees(toInbox, 'moves', 'move')} back to the inbox`);
  }

  return { projects: mine.length, toInbox, body: `${parts.join(', and ')}.` };
}

/**
 * The last shelf cannot go. Capture is the home route and it files onto a
 * shelf, so a cellar with no shelves is an app whose first screen cannot work —
 * and the user would have no control anywhere that makes one.
 */
export function canDeleteShelf(shelves: Shelf[]): boolean {
  return shelves.length > 1;
}

export function shelfDeleteBlockedReason(): string {
  return 'this is your only shelf, and the capture screen files onto one. make another first.';
}
