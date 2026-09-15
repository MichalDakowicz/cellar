import { ALL_CELLAR_KEYS, ENTRIES_KEY, LIVE_TABLES, PROJECTS_KEY, SHELVES_KEY } from '@/lib/cellarKeys';

describe('LIVE_TABLES', () => {
  it('covers every table fetchEntries, fetchProjects and fetchShelves read', () => {
    // The embed is the reason this list is longer than the three queries: an
    // entry carries its lines and its questions, so a write to either makes the
    // entry list stale. Dropping one of them is how a live update stops
    // arriving for the agent's most common write without anything failing.
    expect(LIVE_TABLES.map((t) => t.table)).toEqual([
      'cellar_shelves',
      'cellar_projects',
      'cellar_entries',
      'cellar_entry_lines',
      'cellar_entry_questions',
    ]);
  });

  it('sends lines and questions to the entry list, not to one of their own', () => {
    const forTable = (table: string) => LIVE_TABLES.find((t) => t.table === table)?.key;
    expect(forTable('cellar_entry_lines')).toBe(ENTRIES_KEY);
    expect(forTable('cellar_entry_questions')).toBe(ENTRIES_KEY);
  });

  it('maps every table to a key the cellar actually caches under', () => {
    for (const { table, key } of LIVE_TABLES) {
      expect({ table, known: ALL_CELLAR_KEYS.includes(key) }).toEqual({ table, known: true });
    }
  });

  it('keeps the catch-up list to exactly the three cellar queries', () => {
    expect(ALL_CELLAR_KEYS).toEqual([SHELVES_KEY, PROJECTS_KEY, ENTRIES_KEY]);
  });
});
