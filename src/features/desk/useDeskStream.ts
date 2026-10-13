import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { EMPTY_STREAM } from '@/lib/deskEvents';
import { useDeskHistory } from '@/store/deskHistory';
import type { DeskLink } from './useDeskLink';
import { DeskStream } from './deskStream';

const streams = new Map<string, DeskStream>();
const emptySnapshot = () => EMPTY_STREAM;
const noopSubscribe = () => () => {};
export function streamKey(link: DeskLink): string { return `${link.ownerId}:${link.info?.id ?? link.pair?.id}:${link.pair?.host ?? 'bridge'}:${link.pair?.port ?? ''}`; }
export function useDeskStream(link: DeskLink, runId: string | null = null, watch = true) {
  const key = streamKey(link);
  const supported = link.info?.eventProtocol === 1;
  const calls = link.calls;
  const stream = useMemo(() => {
    if (!supported || !calls || !link.ownerId) return null;
    let value = streams.get(key);
    if (!value) {
      const history = useDeskHistory.getState();
      let timer: ReturnType<typeof setTimeout> | null = null;
      value = new DeskStream(() => calls.eventTicket(), history.cursors[key] ?? { epoch: '', sequence: 0 }, (state) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => useDeskHistory.getState().save(key, state), 300);
      });
      streams.set(key, value);
    }
    value.setTicket(() => calls.eventTicket());
    return value;
  }, [supported, calls, link.ownerId, key]);
  useEffect(() => {
    if (!stream || !watch) return;
    const release = stream.acquire({}, runId);
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') stream.reconnect(); else stream.pause(); });
    return () => { subscription.remove(); release(); };
  }, [stream, runId, watch]);
  const state = useSyncExternalStore(stream?.subscribe ?? noopSubscribe, stream?.snapshot ?? emptySnapshot, emptySnapshot);
  return { key, supported, state: calls ? state : { ...state, phase: 'disconnected' as const, error: link.lanError },
    live: !!calls && state.phase === 'live', retry: () => { if (stream) stream.reconnect(); else link.recheck(); } };
}
