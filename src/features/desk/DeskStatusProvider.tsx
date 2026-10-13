import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchEntries } from '@/features/cellar/cellarApi';
import { ENTRIES_KEY } from '@/lib/cellarKeys';
import { deskCounts } from '@/lib/deskCounts';

import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';

function useDeskStatusSource() {
  const { user } = useAuth();
  const link = useDeskLink();
  const runs = useDeskRuns(link, { watch: !!user });
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: fetchEntries, enabled: !!user });
  const counts = deskCounts({
    via: user ? link.via : 'none',
    checking: !!user && link.checking,
    entries: entries.data ?? [],
    entriesState: entries.isError ? 'failed' : entries.isSuccess ? 'ready' : 'loading',
    runs: runs.runs,
    runsState: runs.error ? 'failed' : runs.available ? 'ready' : 'loading',
    snapshotAt: runs.snapshotAt,
  });
  return {
    link, runs, counts,
    entries: entries.isSuccess ? entries.data : [],
    retryCounts: () => {
      if (runs.error) runs.refresh();
      if (entries.isError) void entries.refetch();
    },
  };
}

const DeskStatusContext = createContext<ReturnType<typeof useDeskStatusSource> | null>(null);

/** One poller for the persistent shell and both desk layouts, on every route. */
export function DeskStatusProvider({ children }: { children: ReactNode }) {
  const status = useDeskStatusSource();
  return <DeskStatusContext.Provider value={status}>{children}</DeskStatusContext.Provider>;
}

export function useDeskStatus() {
  const status = useContext(DeskStatusContext);
  if (!status) throw new Error('desk status needs DeskStatusProvider');
  return status;
}
