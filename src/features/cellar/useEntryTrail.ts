import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchEntryEvents } from '@/features/cellar/trailApi';
import { entryEventsKey } from '@/lib/cellarKeys';
import { entryTrail } from '@/lib/entryTrail';
import { exactStamp } from '@/lib/relTime';
import type { Entry, Project } from '@/types/cellar';

/**
 * One entry's trail, stamped to the minute, oldest first.
 *
 * Read only while the entry is open. The merge and the stamp are `lib/`, so
 * this hook is the query and the memo and nothing else.
 */
export function useEntryTrail(entry: Entry | null, projects: Project[]) {
  const events = useQuery({
    queryKey: entryEventsKey(entry?.id ?? ''),
    queryFn: () => fetchEntryEvents(entry!.id),
    enabled: !!entry,
  });

  return useMemo(() => {
    if (!entry) return [];
    return entryTrail(entry, events.data ?? [], projects).map((item) => ({ ...item, stamp: exactStamp(item.at) }));
  }, [entry, events.data, projects]);
}
