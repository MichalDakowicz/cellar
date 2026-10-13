import { useEffect } from 'react';
import { useRunControl } from './useRunControl';
import { canStartNewStopAll } from '@/lib/deskControlRecovery';
import type { DeskLink } from './useDeskLink';

/** Account-wide command lives on the reachable host; remote hosts report separately. */
export function useStopAll(link: DeskLink, live: boolean) {
  const connected = !!link.calls && live && link.info?.dispatchProtocol === 1;
  const action = useRunControl(link, 'stop-all', connected);
  const { busy, saved, submit } = action;
  useEffect(() => {
    if (!connected || busy || saved?.receipt?.state !== 'pending') return;
    const timer = setTimeout(() => { void submit(); }, 5000);
    return () => clearTimeout(timer);
  }, [connected, busy, saved, submit]);
  return { busy: action.busy, pending: action.pending && !canStartNewStopAll(saved?.receipt, link.info?.id ?? link.pair?.id),
    run: connected && !action.busy ? () => void action.submit({ action: 'stopAll', runId: null, scope: 'account' }) : null,
    message: action.message ?? (!connected ? 'Reconnect to an updated PC for Stop all across hosts.' : null),
    hosts: action.saved?.receipt?.hosts ?? [],
  };
}
