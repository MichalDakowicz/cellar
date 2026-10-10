import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DeskCommandDefinition, DeskJobStart } from '@/lib/deskCommands';

import { useDeskStatus } from './DeskStatusProvider';
import { DESK_KEYS } from './useDeskLink';

const COMMANDS_KEY = ['desk', 'commands'] as const;

/** Project tasks are read and dispatched directly; mailbox-only clients say so. */
export function useDeskCommands() {
  const { link } = useDeskStatus();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...COMMANDS_KEY, link.ownerId, link.via, link.info?.id, link.pair?.host, link.pair?.port],
    queryFn: () => link.calls!.commands(), enabled: !!link.calls,
    retry: false, staleTime: 15_000, refetchInterval: 30_000,
  });
  const start = useMutation({
    mutationFn: (request: DeskJobStart) => {
      if (!link.calls) throw new Error('commands need a direct connection to the pc');
      return link.calls.job(request);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: DESK_KEYS.runs }),
  });
  const save = useMutation({
    mutationFn: ({ projectId, commands }: { projectId: string; commands: DeskCommandDefinition[] }) => {
      if (!link.calls) throw new Error('connect directly to the pc to save its commands');
      return link.calls.saveCommands(projectId, commands);
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: COMMANDS_KEY }),
  });
  return {
    projects: link.calls && query.isSuccess ? query.data : [],
    loading: !!link.calls && query.isLoading,
    error: query.isError ? (query.error as Error).message : !link.calls ? 'commands need a direct connection to the pc' : null,
    retry: () => void query.refetch(), start, save,
  };
}
