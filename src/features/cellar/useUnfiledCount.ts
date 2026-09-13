import { useQuery } from '@tanstack/react-query';

import { fetchEntries } from '@/features/cellar/cellarApi';

/**
 * How many thoughts have no project yet — the number on the inbox destination.
 *
 * It reads the same query key as `useCellar()`, so the bar and the screens are
 * one cache and the badge can never disagree with the list it points at. The
 * bar renders on every route, so this is the one hook in the app that runs
 * everywhere; keeping it on the shared key is what makes that free.
 */
export function useUnfiledCount(): number {
  const { data } = useQuery({ queryKey: ['cellar', 'entries'], queryFn: fetchEntries });
  return (data ?? []).filter((entry) => entry.projectId === null && !entry.archived).length;
}
