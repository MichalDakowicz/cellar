import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { chooseDeskVia, deskCan, pickDesk, type DeskVia } from '@/lib/deskLink';
import { useDeskPair } from '@/store/deskPair';

import { deskBridge } from './bridge';
import { fetchDesks, type DeskRow } from './deskCellarApi';
import { bridgeTransport, deskCalls, lanTransport, type DeskCalls } from './deskClient';

export const DESK_KEYS = {
  info: ['desk', 'info'] as const,
  desks: ['desk', 'desks'] as const,
  runs: ['desk', 'runs'] as const,
};

/**
 * Which pc this device means, and which wire reaches it now.
 *
 * Two questions asked in parallel and kept warm: does the paired pc answer on
 * this network (every 20 s), and when did it last beat through the cellar
 * (every 15 s). `chooseDeskVia` turns the two into one answer. A pc that
 * reports a new LAN address through the cellar moves the pairing with it, so a
 * router handing out a different IP does not mean scanning again.
 */
export function useDeskLink() {
  const { user } = useAuth();
  const pair = useDeskPair((state) => state.pair);
  const moved = useDeskPair((state) => state.moved);
  const bridge = useMemo(() => deskBridge(), []);

  const direct: DeskCalls | null = useMemo(() => {
    if (bridge) return deskCalls(bridgeTransport(bridge));
    if (pair) return deskCalls(lanTransport(pair));
    return null;
  }, [bridge, pair]);

  const info = useQuery({
    queryKey: [...DESK_KEYS.info, bridge ? 'bridge' : pair ? `${pair.host}:${pair.port}` : 'none'],
    queryFn: () => direct!.info(),
    enabled: direct !== null,
    retry: false,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const desks = useQuery({
    queryKey: DESK_KEYS.desks,
    queryFn: fetchDesks,
    enabled: !!user && !bridge,
    retry: false,
    // An error here is almost always the tables not being there yet; asking
    // again every 15 s would only repeat it.
    refetchInterval: (query) => (query.state.error ? false : 15_000),
    staleTime: 5_000,
  });

  const desk: DeskRow | null = useMemo(
    () => pickDesk(desks.data ?? [], pair?.id ?? null),
    [desks.data, pair?.id],
  );

  // The clock the heartbeat is judged against, ticking with the poll — read in
  // render it would be a different answer on every re-render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (desk?.host && desk.port && info.isError) moved(desk.id, desk.host, desk.port);
  }, [desk?.id, desk?.host, desk?.port, info.isError, moved]);

  const via: DeskVia = chooseDeskVia({
    bridge: bridge !== null,
    lanAnswered: !bridge && info.isSuccess,
    seenAt: desk?.seenAt ?? null,
    now,
  });

  return {
    via,
    can: deskCan(via),
    /** The direct API — bridge or LAN — only when that is the wire in use. */
    calls: via === 'bridge' || via === 'lan' ? direct : null,
    info: info.data ?? null,
    desk,
    pair,
    bridge,
    name: info.data?.name ?? desk?.name ?? pair?.name ?? 'your pc',
    checking: (direct !== null && info.isLoading) || desks.isLoading,
    /** Why the cellar wire is not there, when it is because the tables are missing. */
    cellarError: desks.error ? (desks.error as Error).message : null,
    /** Why the paired pc did not answer on this network — unreachable, refused the signature, … */
    lanError: info.error ? (info.error as Error).message : null,
    recheck: () => {
      void info.refetch();
      void desks.refetch();
    },
  };
}

export type DeskLink = ReturnType<typeof useDeskLink>;
