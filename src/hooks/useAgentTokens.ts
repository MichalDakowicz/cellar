import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  createAgentToken,
  fetchAgentTokens,
  revokeAgentToken,
} from '@/features/cellar/cellarApi';

/**
 * The tokens a hosted agent signs in with.
 *
 * Not cached for long and refetched after every change: the whole point of a
 * revoke button is that the list in front of you is the truth about what can
 * reach your cellar right now.
 */

export function useAgentTokens() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['agent-tokens', user?.id] as const;

  const query = useQuery({
    queryKey,
    queryFn: fetchAgentTokens,
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const settle = () => void queryClient.invalidateQueries({ queryKey });

  const mint = useMutation({ mutationFn: createAgentToken, onSuccess: settle });
  const revoke = useMutation({ mutationFn: revokeAgentToken, onSuccess: settle });

  return {
    tokens: query.data ?? [],
    loading: query.isLoading,
    mint: mint.mutateAsync,
    minting: mint.isPending,
    revoke: revoke.mutateAsync,
  };
}
