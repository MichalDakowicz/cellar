import { useQuery } from '@tanstack/react-query';
import { useDeskStatus } from './DeskStatusProvider';

export const WORKTREES_KEY = ['desk', 'worktrees'] as const;
/** Failed/disconnected reads suppress cached workspaces, just like the run source. */
export function useDeskWorktrees() {
  const { link } = useDeskStatus();
  const supported = !!link.calls && link.info?.worktrees === true;
  const query = useQuery({
    queryKey: [...WORKTREES_KEY, link.ownerId, link.info?.id, link.via, link.pair?.host, link.pair?.port],
    queryFn: () => link.calls!.worktrees(), enabled: supported,
    retry: false, staleTime: 5000, refetchInterval: 15_000,
  });
  return { projects: supported && query.isSuccess && !query.isError ? query.data : [],
    loading: supported && query.isLoading,
    error: !link.calls ? 'Connect directly to the PC to read worktrees.' : !supported ? 'Update Cellar on the PC for worktrees.'
      : query.isError ? (query.error as Error).message : null,
    retry: () => void query.refetch() };
}
