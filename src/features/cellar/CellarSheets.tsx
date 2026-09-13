import { useCallback, useEffect, useState } from 'react';

import { EditProjectSheet } from '@/features/cellar/sheets/EditProjectSheet';
import { EditShelfSheet } from '@/features/cellar/sheets/EditShelfSheet';
import { FilterSheet } from '@/features/cellar/sheets/FilterSheet';
import { FileUnderSheet, NewProjectSheet } from '@/features/cellar/sheets/ProjectSheets';
import { ShelfSheet } from '@/features/cellar/sheets/ShelfSheet';
import { ScopeSheet, SortSheet } from '@/features/cellar/sheets/ViewSheets';
import { useCellarSheets } from '@/store/cellarPrefs';

type Which = 'filter' | 'shelf' | 'project' | 'file' | 'sort' | 'scope' | 'editProject' | 'editShelf' | null;

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
  const register = useCellarSheets((state) => state.register);

  const close = useCallback(() => {
    setWhich(null);
    setTargetId(null);
  }, []);

  useEffect(() => {
    const open = (next: Which, id: string | null = null) => {
      setTargetId(id);
      setWhich(next);
    };
    register({
      filter: () => open('filter'),
      shelfPicker: () => open('shelf'),
      newProject: (entryId) => open('project', entryId),
      fileUnder: (entryId) => open('file', entryId),
      inboxSort: () => open('sort'),
      statsScope: () => open('scope'),
      editProject: (projectId) => open('editProject', projectId),
      editShelf: (shelfId) => open('editShelf', shelfId),
    });
    return () =>
      register({
        filter: null,
        shelfPicker: null,
        newProject: null,
        fileUnder: null,
        inboxSort: null,
        statsScope: null,
        editProject: null,
        editShelf: null,
      });
  }, [register]);

  return (
    <>
      <FilterSheet open={which === 'filter'} onClose={close} />
      <ShelfSheet open={which === 'shelf'} onClose={close} />
      <NewProjectSheet open={which === 'project'} entryId={targetId} onClose={close} />
      <FileUnderSheet open={which === 'file'} entryId={targetId} onClose={close} />
      <SortSheet open={which === 'sort'} onClose={close} />
      <ScopeSheet open={which === 'scope'} onClose={close} />
      <EditProjectSheet open={which === 'editProject'} projectId={targetId} onClose={close} />
      <EditShelfSheet open={which === 'editShelf'} shelfId={targetId} onClose={close} />
    </>
  );
}
