import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import type { SortableItem } from '@/components/ui/SortableList';
import { writePositions, type ArrangeTable } from '@/features/cellar/arrangeApi';
import { useCellar } from '@/features/cellar/useCellar';
import { byPosition, moveIndex, positionWrites } from '@/lib/arrange';
import { ENTRIES_KEY, PROJECTS_KEY, SHELVES_KEY } from '@/lib/cellarKeys';
import { plural } from '@/lib/utils';

export type ArrangeWhat = 'shelves' | 'projects' | 'entries';

type Row = SortableItem & { position: number };

/**
 * One list to put in order: every shelf, the projects on one shelf, or the
 * live thoughts in one project. The drop is shown at once and written behind
 * it — a row that jumped back while the write was in flight would read as a
 * drag that failed.
 */
export function useArrangeScreen(what: ArrangeWhat, id: string | undefined) {
  const { shelves, projects, entries } = useCellar();
  const client = useQueryClient();
  const [local, setLocal] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { rows, title, table, key } = useMemo(() => {
    if (what === 'shelves') {
      return {
        title: 'arrange shelves',
        table: 'cellar_shelves' as ArrangeTable,
        key: SHELVES_KEY,
        rows: shelves.map<Row>((shelf) => ({
          key: shelf.id,
          label: shelf.name,
          sub: plural(projects.filter((project) => project.shelfId === shelf.id).length, 'project'),
          position: shelf.position,
        })),
      };
    }
    if (what === 'projects') {
      const shelf = shelves.find((candidate) => candidate.id === id);
      return {
        title: `arrange ${shelf?.name ?? 'projects'}`,
        table: 'cellar_projects' as ArrangeTable,
        key: PROJECTS_KEY,
        rows: projects
          .filter((project) => project.shelfId === id)
          .map<Row>((project) => ({
            key: project.id,
            label: project.name,
            sub: plural(entries.filter((entry) => entry.projectId === project.id && !entry.archived).length, 'entry', 'entries'),
            position: project.position,
          })),
      };
    }
    const project = projects.find((candidate) => candidate.id === id);
    return {
      title: `arrange ${project?.name ?? 'thoughts'}`,
      table: 'cellar_entries' as ArrangeTable,
      key: ENTRIES_KEY,
      rows: byPosition(entries.filter((entry) => entry.projectId === id && !entry.archived)).map<Row>((entry) => ({
        key: entry.id,
        label: entry.text,
        sub: `${entry.kind} · ${entry.state}`,
        position: entry.position,
      })),
    };
  }, [what, id, shelves, projects, entries]);

  // The drop you just made wins until the list from the server says the same.
  const items = useMemo(() => {
    if (!local) return rows;
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const kept = local.map((rowKey) => byKey.get(rowKey)).filter((row): row is Row => !!row);
    const added = rows.filter((row) => !local.includes(row.key));
    return [...added, ...kept];
  }, [rows, local]);

  const move = useCallback(
    (from: number, to: number) => {
      const ids = moveIndex(
        items.map((item) => item.key),
        from,
        to,
      );
      setLocal(ids);
      setError(null);
      const writes = positionWrites(rows.map((row) => ({ id: row.key, position: row.position })), ids);
      void writePositions(table, writes)
        .then(() => client.invalidateQueries({ queryKey: key }))
        .catch((failure: unknown) => {
          setLocal(null);
          setError(failure instanceof Error ? failure.message : 'the new order did not save');
        });
    },
    [items, rows, table, key, client],
  );

  return {
    title,
    items,
    move,
    error,
    hint:
      what === 'entries'
        ? 'hold a thought, then drag it. set the project order to yours in settings to read it this way — new thoughts still land on top.'
        : 'hold a row, then drag it.',
    empty: items.length === 0,
  };
}
