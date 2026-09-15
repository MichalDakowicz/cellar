import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { ALL_CELLAR_KEYS, LIVE_TABLES, type CellarKey } from '@/lib/cellarKeys';
import { supabase } from '@/lib/supabase';
import { useLiveStatus } from '@/store/liveStatus';

/**
 * The cellar, pushed rather than polled.
 *
 * One account is a phone and a browser and an agent writing over MCP, and until
 * this existed the other two only found out by being restarted. Postgres
 * replicates the five `cellar_*` tables the app reads (`supabase/schema.sql`,
 * Realtime), every listener is filtered to your own rows, and an event does not
 * carry the change — it only says which query is now a lie. The refetch is the
 * source of truth, so a payload this build does not understand can never put a
 * malformed row into the cache.
 *
 * Nothing is announced. A change from your other device or from an agent lands
 * the way your own writes do: the list is simply right.
 */

/**
 * A raw dump is one insert per line and an agent working an entry writes a line
 * at a time, so the events arrive in bursts. `fetchEntries` reads the whole
 * cellar with its embeds — coalescing a burst into one read is the difference
 * between one query and ten.
 */
const COALESCE_MS = 250;

export function useCellarLive() {
  const { user } = useAuth();
  const client = useQueryClient();
  const setStatus = useLiveStatus((state) => state.setStatus);

  const pending = useRef(new Set<CellarKey>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    timer.current = null;
    const keys = [...pending.current];
    pending.current.clear();
    for (const key of keys) void client.invalidateQueries({ queryKey: key });
  }, [client]);

  const touch = useCallback(
    (key: CellarKey) => {
      pending.current.add(key);
      // The first event in a burst starts the clock; the rest join it. A timer
      // reset per event would let a steady stream of writes postpone the read
      // forever.
      if (timer.current === null) timer.current = setTimeout(flush, COALESCE_MS);
    },
    [flush],
  );

  /** Everything, for a gap where events happened and nobody was listening. */
  const refreshAll = useCallback(() => {
    for (const key of ALL_CELLAR_KEYS) void client.invalidateQueries({ queryKey: key });
  }, [client]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setStatus('connecting');
      return;
    }

    let alive = true;
    let joined = false;
    // Suffixed like the shared-settings channel: a fast refresh can mount the
    // replacement before the old one is torn down, and two channels of the same
    // name on one socket is the second one silently getting nothing.
    const channel = supabase.channel(`cellar:${user.id}:${Math.random().toString(36).slice(2)}`);

    for (const { table, key } of LIVE_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` },
        () => touch(key),
      );
    }

    channel.subscribe((status) => {
      if (!alive) return;
      if (status === 'SUBSCRIBED') {
        setStatus('live');
        // A *re*join is the interesting one: the socket was away, its events
        // went nowhere, and the cache has a hole of unknown size. The first
        // join needs nothing — the queries have just been read.
        if (joined) refreshAll();
        joined = true;
        return;
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setStatus('down');
      }
    });

    return () => {
      alive = false;
      setStatus('connecting');
      void supabase.removeChannel(channel);
    };
  }, [user?.id, touch, refreshAll, setStatus]);

  // Coming back to the app is the other gap. A phone that slept and a browser
  // tab that did are the same case: the socket may have died without ever
  // reporting it, so the return itself is the trigger rather than a status.
  useEffect(() => {
    if (!user?.id) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshAll();
    });
    return () => subscription.remove();
  }, [user?.id, refreshAll]);
}
