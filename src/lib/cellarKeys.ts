/**
 * The three query keys the cellar is cached under, and which table invalidates
 * which.
 *
 * It lives here rather than beside `useCellar` because two things need the same
 * answer and only one of them is a hook: the queries declare the keys, and the
 * realtime subscription has to map a changed table back to them. Two lists that
 * drift is a live update that quietly stops arriving for one table.
 *
 * Pure — a key is an array of strings, and no React or client belongs in it.
 */

export const SHELVES_KEY = ['cellar', 'shelves'] as const;
export const PROJECTS_KEY = ['cellar', 'projects'] as const;
export const ENTRIES_KEY = ['cellar', 'entries'] as const;

export type CellarKey = typeof SHELVES_KEY | typeof PROJECTS_KEY | typeof ENTRIES_KEY;

/**
 * Every table a change can arrive on, and the query that has to be re-read
 * because of it.
 *
 * Lines and questions map to ENTRIES because `fetchEntries` embeds them — an
 * entry is not a row, it is a row plus everything hanging off it, so an
 * appended line makes the entry list stale even though `cellar_entries` was
 * never written. That is the agent's ordinary case: `cellar_append_line` and
 * `cellar_ask` write here and nowhere else.
 *
 * `cellar_settings` and `cellar_agent_tokens` are deliberately absent. Neither
 * is part of `useCellar`, and a token minted on another device showing up on
 * this one is not worth a socket.
 */
export const LIVE_TABLES: readonly { table: string; key: CellarKey }[] = [
  { table: 'cellar_shelves', key: SHELVES_KEY },
  { table: 'cellar_projects', key: PROJECTS_KEY },
  { table: 'cellar_entries', key: ENTRIES_KEY },
  { table: 'cellar_entry_lines', key: ENTRIES_KEY },
  { table: 'cellar_entry_questions', key: ENTRIES_KEY },
];

/** Every key, for the catch-up read after a gap where events were missed. */
export const ALL_CELLAR_KEYS: readonly CellarKey[] = [SHELVES_KEY, PROJECTS_KEY, ENTRIES_KEY];
