import { useQuery } from '@tanstack/react-query';

import { fetchEntries } from '@/features/cellar/cellarApi';
import { waitingOnYou } from '@/lib/agentWork';

/**
 * What the desk plate is badged with: everything waiting on you.
 *
 * For now that is the thoughts an agent stopped to ask about; runs waiting on
 * an approval join it when the pc reports them (docs/desk/TASKS.md, W1). Same
 * query key as `useCellar()`, so the badge and the lists are one cache — the
 * bar mounts on every route, and sharing the key is what makes that free.
 */
export function useDeskWaiting(): number {
  const { data } = useQuery({ queryKey: ['cellar', 'entries'], queryFn: fetchEntries });
  return waitingOnYou(data ?? []).length;
}
