import { useCallback, useEffect, useState } from 'react';

import { EditGroupSheet } from '@/features/cellar/sheets/EditGroupSheet';
import { EditProjectSheet } from '@/features/cellar/sheets/EditProjectSheet';
import { EditShelfSheet } from '@/features/cellar/sheets/EditShelfSheet';
import { FilterSheet } from '@/features/cellar/sheets/FilterSheet';
import { FileUnderSheet, NewProjectSheet } from '@/features/cellar/sheets/ProjectSheets';
import { ShelfSheet } from '@/features/cellar/sheets/ShelfSheet';
import { ScopeSheet, SortSheet } from '@/features/cellar/sheets/ViewSheets';
import { useCellarSheets } from '@/store/cellarPrefs';

type Which =
  | 'filter'
  | 'shelf'
  | 'project'
  | 'file'
  | 'sort'
  | 'scope'
  | 'editProject'
  | 'editShelf'
  | 'editGroup'
  | null;

/**
 * Every sheet in the app, mounted once in the tabs layout and opened through
 * the handles in `useCellarSheets`.
 *
 * One instance each, globally: the nav island's left action, a row's button and
 * a screen's own control all open the *same* sheet, rather than three copies
 * fighting over one modal slot (PING.md §9.8). This file is only the registrar
 * — each sheet's own markup lives under `sheets/`.
 */
export function CellarSheets() {
  const [which, setWhich] = useState<Which>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  // The file sheet is the one that can be handed several. Kept apart from
  // `targetId` rather than widening it, because every other sheet takes exactly
  // one id and a union there would put a `typeof` in each of them.
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const register = useCellarSheets((state) => state.register);

  const close = useCallback(() => {
    setWhich(null);
    setTargetId(null);
    setTargetIds([]);
  }, []);

  useEffect(() => {
    const open = (next: Which, id: string | null = null) => {
      setTargetId(id);
      setTargetIds(id ? [id] : []);
      setWhich(next);
    };
    const openMany = (next: Which, ids: string[]) => {
      setTargetId(null);
      setTargetIds(ids);
      setWhich(next);
    };
    register({
      filter: () => open('filter'),
      shelfPicker: () => open('shelf'),
      newProject: (entryIds) => openMany('project', entryIds),
      fileUnder: (entryId) => open('file', entryId),
      fileMany: (entryIds) => openMany('file', entryIds),
      inboxSort: () => open('sort'),
      statsScope: () => open('scope'),
      editProject: (projectId) => open('editProject', projectId),
      editShelf: (shelfId) => open('editShelf', shelfId),
      editGroup: (groupId) => open('editGroup', groupId),
    });
    return () =>
      register({
        filter: null,
        shelfPicker: null,
        newProject: null,
        fileUnder: null,
        fileMany: null,
        inboxSort: null,
        statsScope: null,
        editProject: null,
        editShelf: null,
        editGroup: null,
      });
  }, [register]);

  return (
    <>
      <FilterSheet open={which === 'filter'} onClose={close} />
      <ShelfSheet open={which === 'shelf'} onClose={close} />
      <NewProjectSheet open={which === 'project'} entryIds={targetIds} onClose={close} />
      <FileUnderSheet open={which === 'file'} entryIds={targetIds} onClose={close} />
      <SortSheet open={which === 'sort'} onClose={close} />
      <ScopeSheet open={which === 'scope'} onClose={close} />
      <EditProjectSheet open={which === 'editProject'} projectId={targetId} onClose={close} />
      <EditShelfSheet open={which === 'editShelf'} shelfId={targetId} onClose={close} />
      <EditGroupSheet open={which === 'editGroup'} groupId={targetId} onClose={close} />
    </>
  );
}
