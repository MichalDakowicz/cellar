import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sortRuns, type DeskRun, type DeskStart } from '@/lib/deskProtocol';

import { sendStart, sendStop } from './deskCellarApi';
import { DESK_KEYS, type DeskLink } from './useDeskLink';

/**
 * What the pc is running, and the two things you can do about it.
 *
 * Direct (bridge or LAN) the list is asked for every 5 s while a screen shows
 * it. Through the cellar there is nothing to ask — the list is the snapshot the
 * pc wrote in its last heartbeat, which is why it can be half a minute old and
 * why the screen says so.
 */
export function useDeskRuns(link: DeskLink, { watch = true }: { watch?: boolean } = {}) {
  const client = useQueryClient();
  const direct = link.calls;

  const live = useQuery({
    queryKey: [...DESK_KEYS.runs, link.ownerId, link.via, link.info?.id ?? link.pair?.id ?? link.desk?.id ?? 'none'],
    queryFn: () => direct!.runs(),
    enabled: direct !== null && watch,
    refetchInterval: 5_000,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const snapshotError = link.via === 'cellar' ? link.cellarError ?? (link.desk?.runs === null ? 'the pc did not return a valid run snapshot' : null) : null;
  const available = direct ? live.isSuccess && live.isFetchedAfterMount : link.via === 'cellar' && link.desk !== null && !snapshotError;
  const runs: DeskRun[] = !available ? [] : direct ? (live.data ?? []) : sortRuns(link.desk?.runs ?? []);

  const refresh = () => {
    void client.invalidateQueries({ queryKey: DESK_KEYS.runs });
    void client.invalidateQueries({ queryKey: DESK_KEYS.desks });
  };

  const start = useMutation({
    mutationFn: async (request: DeskStart): Promise<string | null> => {
      if (direct) {
        if (link.info?.taskProtocol !== 2) throw new Error('Update Cellar on the PC before sending tasks.');
        const receipt = request.commandId ? await direct.receipt(request.commandId) : null;
        if (receipt?.state === 'confirmed' && receipt.run) return receipt.run.id;
        return (await direct.start(request)).id;
      }
      if (link.via === 'cellar' && link.desk) {
        if (link.desk.taskProtocol !== 2) throw new Error('Update Cellar on the PC before sending tasks through the mailbox.');
        return sendStart(link.desk.id, request);
      }
      throw new Error(`${link.name} is not reachable right now`);
    },
    onSuccess: refresh,
  });

  const stop = useMutation({
    mutationFn: async (id: string) => {
      if (direct) return direct.stop(id);
      if (link.via === 'cellar' && link.desk) return sendStop(link.desk.id, id);
      throw new Error(`${link.name} is not reachable right now`);
    },
    onSuccess: refresh,
  });

  /** Claude's trust prompt for a folder, answered yes from here. Direct wires only. */
  const trust = useMutation({
    mutationFn: async (cwd: string) => {
      if (!direct) throw new Error(`trusting a folder needs the phone on ${link.name}'s wi-fi`);
      return direct.trust(cwd);
    },
  });

  return {
    runs,
    available,
    refresh,
    loading: direct !== null && !available && !live.isError,
    error: direct && live.error ? (live.error as Error).message : snapshotError,
    /** Through the cellar the list is the pc's last heartbeat, not a live read. */
    snapshotAt: direct ? null : (link.desk?.seenAt ?? null),
    start,
    stop,
    trust,
  };
}

/** One run's own words. Direct wires only — the cellar heartbeat carries the list, not the transcripts. */
export function useDeskLog(link: DeskLink, id: string | null) {
  return useQuery({
    queryKey: ['desk', 'log', link.ownerId, link.via, link.info?.id ?? link.pair?.id ?? link.desk?.id ?? 'none', id],
    queryFn: () => link.calls!.log(id!),
    enabled: id !== null && link.calls !== null,
    refetchInterval: 4_000,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
