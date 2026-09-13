import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { Field, Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { ENTRY_STATES } from '@/lib/entryState';
import { KINDS } from '@/lib/kinds';
import { plural } from '@/lib/utils';
import { INBOX_SORTS, useCellarPrefs, useCellarSheets, useEntryFilter, type InboxSort } from '@/store/cellarPrefs';
import type { EntryState, Kind } from '@/types/cellar';

type Which = 'filter' | 'shelf' | 'project' | 'file' | 'sort' | 'scope' | null;

/**
 * Every sheet in the app, mounted once in the tabs layout and opened through
 * the handles in `useCellarSheets`.
 *
 * One instance each, globally: the nav island's left action, a row's button and
 * a screen's own control all open the *same* sheet, rather than three copies
 * fighting over one modal slot (PING.md §9.8).
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
    register({
      filter: () => setWhich('filter'),
      shelfPicker: () => setWhich('shelf'),
      newProject: (entryId) => {
        setTargetId(entryId);
        setWhich('project');
      },
      fileUnder: (entryId) => {
        setTargetId(entryId);
        setWhich('file');
      },
      inboxSort: () => setWhich('sort'),
      statsScope: () => setWhich('scope'),
    });
    return () => register({ filter: null, shelfPicker: null, newProject: null, fileUnder: null, inboxSort: null, statsScope: null });
  }, [register]);

  return (
    <>
      <FilterSheet open={which === 'filter'} onClose={close} />
      <ShelfSheet open={which === 'shelf'} onClose={close} />
      <NewProjectSheet open={which === 'project'} entryId={targetId} onClose={close} />
      <FileUnderSheet open={which === 'file'} entryId={targetId} onClose={close} />
      <SortSheet open={which === 'sort'} onClose={close} />
      <ScopeSheet open={which === 'scope'} onClose={close} />
    </>
  );
}

function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const filter = useEntryFilter((state) => state.filter);
  const setFilter = useEntryFilter((state) => state.setFilter);
  const toggleKind = useEntryFilter((state) => state.toggleKind);
  const clear = useEntryFilter((state) => state.clear);

  return (
    <SheetDialog
      open={open}
      title="filter"
      body="narrows this project. it does not narrow the inbox, which is a pile you sort rather than a list you filter."
      confirmLabel="show it"
      dismissLabel="clear"
      onConfirm={onClose}
      onDismiss={() => {
        clear();
        onClose();
      }}
    >
      <View className="mt-5 gap-2">
        <Overline>kind</Overline>
        <ChipWrap
          label="kind"
          options={KINDS.map((kind) => ({ value: kind.value, label: kind.label }))}
          selected={filter.kinds}
          onToggle={(kind: Kind) => toggleKind(kind)}
        />
      </View>
      <View className="mt-5 gap-2">
        <Overline>state</Overline>
        <ChipWrap
          label="state"
          options={[
            { value: 'any' as const, label: 'any state' },
            ...ENTRY_STATES.map((state) => ({ value: state.value, label: state.label })),
          ]}
          selected={filter.state ?? 'any'}
          onToggle={(value) => setFilter({ ...filter, state: value === 'any' ? null : (value as EntryState) })}
        />
      </View>
    </SheetDialog>
  );
}

function ShelfSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shelves, projects } = useCellar();
  const { shelf, setShelf } = useCurrentShelf(shelves);
  const { addShelf } = useCellarWrites();
  const [name, setName] = useState('');

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    addShelf.mutate(
      { name: clean, position: shelves.length },
      {
        onSuccess: (made) => {
          setShelf(made.id);
          setName('');
          onClose();
        },
      },
    );
  };

  return (
    <SheetDialog
      open={open}
      title="shelves"
      body="the layer above projects. apps on one shelf, minecraft mods on another, whatever comes next on its own."
      confirmLabel={name.trim() ? `add ${name.trim()}` : 'done'}
      dismissLabel="close"
      onConfirm={() => (name.trim() ? create() : onClose())}
      onDismiss={onClose}
    >
      <View className="mt-4 gap-2">
        {shelves.map((candidate) => {
          const count = projects.filter((project) => project.shelfId === candidate.id).length;
          const active = candidate.id === shelf?.id;
          return (
            <Pressable
              key={candidate.id}
              accessibilityRole="button"
              accessibilityLabel={candidate.name}
              accessibilityState={{ selected: active }}
              onPress={() => {
                setShelf(candidate.id);
                onClose();
              }}
              className={[
                'flex-row items-center gap-3 rounded-xl p-3 active:opacity-80',
                active ? 'bg-neutral-800' : 'bg-neutral-900',
              ].join(' ')}
            >
              <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
                {candidate.name}
              </Text>
              <Text className="text-xs text-muted-foreground">{plural(count, 'project')}</Text>
            </Pressable>
          );
        })}
        <View className="mt-1">
          <Field placeholder="new shelf" value={name} onChangeText={setName} onSubmitEditing={create} />
        </View>
      </View>
    </SheetDialog>
  );
}

function NewProjectSheet({ open, entryId, onClose }: { open: boolean; entryId: string | null; onClose: () => void }) {
  const { shelves, projects } = useCellar();
  const { shelf } = useCurrentShelf(shelves);
  const { addProject, update } = useCellarWrites();
  const [name, setName] = useState('');

  const create = () => {
    const clean = name.trim();
    if (!clean || !shelf) return;
    addProject.mutate(
      { shelfId: shelf.id, name: clean, position: projects.filter((p) => p.shelfId === shelf.id).length },
      {
        onSuccess: (made) => {
          if (entryId) update.mutate({ id: entryId, patch: { projectId: made.id } });
          setName('');
          onClose();
        },
      },
    );
  };

  return (
    <SheetDialog
      open={open}
      title="new project"
      body={`a project on ${shelf?.name ?? 'this shelf'}. name it now, describe it never.`}
      confirmLabel="create"
      confirmDisabledReason={name.trim() ? null : 'give it a working name'}
      onConfirm={create}
      onDismiss={onClose}
    >
      <View className="mt-4">
        <Field placeholder="working name" value={name} onChangeText={setName} onSubmitEditing={create} autoFocus />
      </View>
    </SheetDialog>
  );
}

function FileUnderSheet({ open, entryId, onClose }: { open: boolean; entryId: string | null; onClose: () => void }) {
  const { shelves, projects, entries } = useCellar();
  const { update } = useCellarWrites();
  const newProject = useCellarSheets((state) => state.newProject);
  const entry = entries.find((candidate) => candidate.id === entryId) ?? null;

  const file = (projectId: string) => {
    if (entryId) update.mutate({ id: entryId, patch: { projectId } });
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      title="file it under"
      body={entry?.text}
      confirmLabel="new project"
      dismissLabel="leave it unfiled"
      onConfirm={() => {
        onClose();
        newProject?.(entryId);
      }}
      onDismiss={onClose}
    >
      <View className="mt-4 gap-2">
        {projects.map((project) => (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityLabel={project.name}
            onPress={() => file(project.id)}
            className="flex-row items-center gap-3 rounded-xl bg-neutral-900 p-3 active:opacity-80"
          >
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {project.name}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {shelves.find((shelf) => shelf.id === project.shelfId)?.name ?? ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </SheetDialog>
  );
}

function SortSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sort = useCellarPrefs((state) => state.inboxSort);
  const setSort = useCellarPrefs((state) => state.setInboxSort);

  return (
    <SheetDialog
      open={open}
      title="sort the inbox"
      body="which end of the pile you start from. it never hides anything — the count on the tab is always what is actually left."
      confirmLabel="done"
      dismissLabel="close"
      onConfirm={onClose}
      onDismiss={onClose}
    >
      <View className="mt-4">
        <ChipWrap
          label="sort"
          options={INBOX_SORTS.map((option) => ({ value: option.value, label: option.label }))}
          selected={sort}
          onToggle={(value: InboxSort) => setSort(value)}
        />
      </View>
    </SheetDialog>
  );
}

function ScopeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shelves, projects, entries } = useCellar();
  const shelfId = useCellarPrefs((state) => state.statsShelfId);
  const setStatsShelf = useCellarPrefs((state) => state.setStatsShelf);

  const countFor = (id: string) => {
    const ids = new Set(projects.filter((project) => project.shelfId === id).map((project) => project.id));
    return entries.filter((entry) => entry.projectId !== null && ids.has(entry.projectId)).length;
  };

  return (
    <SheetDialog
      open={open}
      title="narrow to a shelf"
      body="every shelf includes the inbox — an unfiled thought is still a thought you had."
      confirmLabel="done"
      dismissLabel="close"
      onConfirm={onClose}
      onDismiss={onClose}
    >
      <View className="mt-4">
        <ChipWrap
          label="shelf"
          options={[
            { value: 'all', label: 'every shelf', count: entries.length },
            ...shelves.map((shelf) => ({ value: shelf.id, label: shelf.name, count: countFor(shelf.id) })),
          ]}
          selected={shelfId ?? 'all'}
          onToggle={(value) => {
            setStatsShelf(value === 'all' ? null : value);
            onClose();
          }}
        />
      </View>
    </SheetDialog>
  );
}
