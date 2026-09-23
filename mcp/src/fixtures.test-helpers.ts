import type { Entry, EntryQuestion, Project, Shelf } from '@/types/cellar';

import type { Cellar } from './cellar.ts';

/**
 * Fixtures for the server's own tests.
 *
 * Not a `.test.ts`, so the runner does not try to execute it as a suite. The
 * app's tests build their own entries; this file exists because the things
 * worth testing here — the brief and the resolvers — take a whole `Cellar`,
 * and rebuilding one in every case is most of the file.
 */

export const NOW = Date.parse('2026-09-14T12:00:00.000Z');

export function question(id: string, text: string, over: Partial<EntryQuestion> = {}): EntryQuestion {
  return {
    // Padded so the first eight characters — the short id the brief prints and
    // the tools resolve by — stay readable in an assertion.
    id: `${`${id}000000`.slice(0, 8)}-0000-0000-0000-000000000000`,
    question: text,
    options: [],
    answer: null,
    answeredAt: null,
    answeredVia: null,
    dismissedAt: null,
    agent: 'claude',
    createdAt: '2026-09-14T11:00:00.000Z',
    ...over,
  };
}

export function entry(over: Partial<Entry> = {}): Entry {
  return {
    id: 'abcd1234-0000-0000-0000-000000000000',
    projectId: 'p1',
    text: 'mcp questions change',
    kind: 'idea',
    state: 'blocked',
    archived: false,
    createdAt: '2026-09-14T10:00:00.000Z',
    agent: 'claude',
    lines: [],
    questions: [],
    docs: [],
    ...over,
  };
}

const shelf: Shelf = { id: 's1', name: 'apps', position: 0, createdAt: '2026-09-01T00:00:00.000Z' };

const project: Project = {
  id: 'p1',
  shelfId: 's1',
  name: 'cellar',
  position: 0,
  createdAt: '2026-09-01T00:00:00.000Z',
  repoPath: 'C:/ping/cellar',
  repoUrl: 'https://github.com/MichalDakowicz/cellar',
};

export function cellarOf(...entries: Entry[]): Cellar {
  return { shelves: [shelf], projects: [project], entries };
}
