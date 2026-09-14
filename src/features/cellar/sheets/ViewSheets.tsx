import { View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useCellar } from '@/features/cellar/useCellar';
import { INBOX_SORTS, useCellarPrefs, type InboxSort } from '@/store/cellarPrefs';

/** How the unfiled pile is stacked. The inbox's left-island action. */
export function SortSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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

/** Which shelf the figures cover. Stats' left-island action. */
export function ScopeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
