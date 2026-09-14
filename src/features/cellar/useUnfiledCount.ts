import { useQuery } from '@tanstack/react-query';

import { fetchEntries } from '@/features/cellar/cellarApi';
import { waitingOnYou } from '@/lib/agentWork';

/**
 * What the inbox destination has waiting on it — thoughts with no project yet,
 * plus anything an agent stopped to ask about.
 *
 * It counts both because the inbox screen shows both, and a badge that counts
 * only half of what the screen lists is how a user stops trusting the number.
 *
 * It reads the same query key as `useCellar()`, so the bar and the screens are
 * one cache and the badge can never disagree with the list it points at. The
 * bar renders on every route, so this is the one hook in the app that runs
 * everywhere; keeping it on the shared key is what makes that free.
 */
export function useUnfiledCount(): number {
  const { data } = useQuery({ queryKey: ['cellar', 'entries'], queryFn: fetchEntries });
  const entries = data ?? [];
  const unfiled = entries.filter((entry) => entry.projectId === null && !entry.archived).length;
  return unfiled + waitingOnYou(entries).length;
}
