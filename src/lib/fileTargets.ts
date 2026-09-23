/**
 * Where a dump lands when it can land in more than one project.
 *
 * The capture screen's file it block used to hold one project or the inbox. It
 * now holds a set: a thought that is true of two projects — the same bug in
 * the app and its web build, an idea for two mods — is dropped once and lands
 * in each, as its own entry, so each project can settle it on its own.
 *
 * The empty set is the inbox, never a project called inbox — `project_id is
 * null` is the inbox everywhere in this app, and a dump with no target writes
 * exactly that.
 *
 * Pure, and the screen only wires it: which ids are live on this shelf, how the
 * button names the destination and how one draft becomes many rows all live
 * here, where they can be tested without a renderer.
 */

/** The inbox chip's value. It is the empty set, not an id. */
export const INBOX_TARGET = '';

/**
 * A tap: this one project, or the inbox.
 *
 * Deliberately not a toggle. Tapping a second project used to switch to it, and
 * a tap that quietly started filing into both would put a thought in a project
 * you had meant to leave — the one mistake this block must never make silently.
 */
export function pickTarget(value: string): string[] {
  return value === INBOX_TARGET ? [] : [value];
}

/**
 * A hold: add this project to the set, or take it out.
 *
 * Holding the inbox clears the set, because the inbox is not a place a thought
 * can be *as well as* somewhere else — an unfiled thought is by definition in
 * no project.
 */
export function toggleTarget(targets: string[], value: string): string[] {
  if (value === INBOX_TARGET) return [];
  return targets.includes(value) ? targets.filter((id) => id !== value) : [...targets, value];
}

/**
 * The remembered set, cut to the projects on the shelf you are standing in.
 *
 * A chip pointing at another shelf would drop the thought somewhere you are not
 * looking, so switching shelves falls back to what is left — the inbox, when
 * that is nothing — rather than keeping a target you cannot see.
 */
export function liveTargets(targets: string[], shelfProjectIds: string[]): string[] {
  return targets.filter((id) => shelfProjectIds.includes(id));
}

/** "inbox", "cellar", "cellar and radar", "3 projects". The drop button's destination. */
export function targetLabel(names: string[]): string {
  if (names.length === 0) return 'inbox';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.length} projects`;
}

/**
 * One draft, once per target.
 *
 * Every drop goes to every target — a raw dump of three lines into two projects
 * is six entries, three in each, in the order they were typed. No target is the
 * inbox, one row per drop.
 */
export function fanOut<T extends object>(drops: T[], targets: string[]): (T & { projectId: string | null })[] {
  if (targets.length === 0) return drops.map((drop) => ({ ...drop, projectId: null }));
  return targets.flatMap((projectId) => drops.map((drop) => ({ ...drop, projectId })));
}
