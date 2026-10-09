import { runFilterCounts, runGroups } from './deskRunList';

const run = (title: string, project: string, state: 'waiting' | 'running' | 'done', startedAt: number, meta = '') => ({
  title,
  project,
  state,
  startedAt,
  meta,
});

const runs = [
  run('old done', 'solar', 'done', 1, 'claude'),
  run('grid', 'solar', 'running', 5, 'claude'),
  run('desk tab', 'cellar', 'waiting', 2, 'codex'),
  run('notes', 'cellar', 'done', 9, 'codex'),
  run('rotate crash', 'radar', 'done', 3, 'codex'),
];

describe('runGroups', () => {
  it('puts the project that needs you first, and waiting before running before the rest', () => {
    expect(runGroups(runs, 'all', '').map((group) => [group.project, group.runs.map((r) => r.title)])).toEqual([
      ['cellar', ['desk tab', 'notes']],
      ['solar', ['grid', 'old done']],
      ['radar', ['rotate crash']],
    ]);
  });

  it('filters by state', () => {
    expect(runGroups(runs, 'running', '').map((group) => group.project)).toEqual(['solar']);
  });

  it('searches project, title and meta, with or without a $', () => {
    expect(runGroups(runs, 'all', '$solar').flatMap((group) => group.runs.map((r) => r.title))).toEqual(['grid', 'old done']);
    expect(runGroups(runs, 'all', 'codex cellar').flatMap((group) => group.runs.map((r) => r.title))).toEqual([
      'desk tab',
      'notes',
    ]);
  });

  it('is empty when nothing matches', () => {
    expect(runGroups(runs, 'all', 'nothing like this')).toEqual([]);
  });
});

describe('runFilterCounts', () => {
  it('counts each filter', () => {
    expect(runFilterCounts(runs)).toEqual({ all: 5, waiting: 1, running: 1 });
  });
});
