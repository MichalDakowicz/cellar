import { BANDS } from '@/lib/entryGroups';
import { isKanbanAxis, kanbanColumns } from '@/lib/kanban';
import { KINDS } from '@/lib/kinds';
import type { Entry, EntryState, Kind } from '@/types/cellar';

function entry(id: string, kind: Kind, state: EntryState, archived = false): Entry {
  return {
    id,
    projectId: 'p1',
    text: id,
    kind,
    state,
    importance: 'normal',
    archived,
    createdAt: '2026-09-20T10:00:00.000Z',
    agent: null,
    lines: [],
    questions: [],
  };
}

describe('kanbanColumns', () => {
  it('cuts by state in band order, archived last', () => {
    const columns = kanbanColumns([entry('a', 'idea', 'open')], 'state');
    expect(columns.map((column) => column.label)).toEqual(BANDS);
  });

  it('cuts by kind in the fixed kind order', () => {
    const columns = kanbanColumns([entry('a', 'glitch', 'open')], 'kind');
    expect(columns.map((column) => column.label)).toEqual(KINDS.map((meta) => meta.value));
  });

  it('keeps empty columns, unlike the grouped reading', () => {
    const columns = kanbanColumns([entry('a', 'idea', 'open')], 'state');
    const doing = columns.find((column) => column.label === 'doing');
    expect(doing?.entries).toEqual([]);
  });

  it('puts an archived entry in archived rather than in its state', () => {
    const columns = kanbanColumns([entry('a', 'idea', 'open', true)], 'state');
    expect(columns.find((column) => column.label === 'open')?.entries).toHaveLength(0);
    expect(columns.find((column) => column.label === 'archived')?.entries).toHaveLength(1);
  });

  it('keeps the order it was handed inside a column', () => {
    const columns = kanbanColumns([entry('a', 'idea', 'open'), entry('b', 'idea', 'open')], 'kind');
    expect(columns.find((column) => column.label === 'idea')?.entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keys columns by axis so a state and a kind of the same name cannot collide', () => {
    const states = kanbanColumns([], 'state').map((column) => column.key);
    const kinds = kanbanColumns([], 'kind').map((column) => column.key);
    expect(states.some((key) => kinds.includes(key))).toBe(false);
  });
});

describe('isKanbanAxis', () => {
  it('takes the two axes and nothing else', () => {
    expect(isKanbanAxis('state')).toBe(true);
    expect(isKanbanAxis('kind')).toBe(true);
    expect(isKanbanAxis('kanban')).toBe(false);
    expect(isKanbanAxis(null)).toBe(false);
  });
});
