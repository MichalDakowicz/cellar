import { useMemo } from 'react';

import type { EntryListItem } from '@/components/cellar/EntryList';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { groupByKind } from '@/lib/entryGroups';
import { INBOX_SORTS, useCellarPrefs, type InboxSort } from '@/store/cellarPrefs';
import type { Entry } from '@/types/cellar';

/**
 * The inbox: everything dumped without picking a project.
 *
 * The sort is the left island's action here, and it is three orders rather than
 * a filter because the inbox is a pile you are about to work through — the
 * question is always "which end do I start from", never "show me less of it".
 * A filtered inbox that still says 14 unfiled is a lie about how much is left.
 */
export function useInboxScreen() {
  const { entries, loading, error, refetch } = useCellar();
  const sort = useCellarPrefs((state) => state.inboxSort);
  const { settings } = useCellarSettings();

  const unfiled = useMemo(
    () => entries.filter((entry) => entry.projectId === null && !entry.archived),
    [entries],
  );

  const items = useMemo(() => buildItems(unfiled, sort), [unfiled, sort]);

  return {
    loading,
    error,
    refetch,
    sort,
    sortLabel: INBOX_SORTS.find((option) => option.value === sort)?.label ?? 'newest first',
    meta: `${unfiled.length} unfiled`,
    items,
    showCodes: settings.showCodes,
    isEmpty: unfiled.length === 0,
  };
}

function buildItems(entries: Entry[], sort: InboxSort): EntryListItem[] {
  if (sort === 'kind') {
    return groupByKind(entries).flatMap((group) => [
      {
        type: 'section' as const,
        section: { key: group.kind, label: group.kind, meta: String(group.entries.length), kind: group.kind },
      },
      ...group.entries.map((entry) => ({ type: 'entry' as const, entry })),
    ]);
  }

  const ordered = [...entries].sort((a, b) =>
    sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt),
  );
  return ordered.map((entry) => ({ type: 'entry' as const, entry }));
}
