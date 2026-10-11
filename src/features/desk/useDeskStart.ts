import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState } from 'react';
import { parseDeskStart, type DeskStart } from '@/lib/deskProtocol';
import { settleTaskStart } from '@/lib/deskPending';
import { readError } from '@/lib/utils';
import { useDeskPending } from '@/store/deskPending';
import { DeskRefusal } from './deskClient';
import type { DeskLink } from './useDeskLink';
import type { useDeskRuns } from './useDeskRuns';

/** A retry recovers the same durable task; confirmed batch prefixes never replay. */
export function useDeskStart(link: DeskLink, runs: ReturnType<typeof useDeskRuns>, onStarted: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [untrusted, setUntrusted] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const deskId = link.info?.id ?? link.desk?.id ?? link.pair?.id;
  const key = `${link.ownerId}:${deskId}`;
  const pending = useDeskPending((state) => !!state.tasks[key]?.length);
  const failed = useDeskPending((state) => state.failed[key] === true);
  const { start, trust } = runs;
  const begin = useCallback((request?: DeskStart | DeskStart[]) => {
    if (locked.current) return;
    if (!link.ownerId || !deskId) { setError('Sign in and select the PC first.'); return; }
    let requests = useDeskPending.getState().tasks[key] ?? [];
    if (!requests.length && request) {
      if ((link.calls ? link.info?.taskProtocol : link.desk?.taskProtocol) !== 2) {
        setError('Update Cellar on the PC before sending tasks. Nothing sent.'); return;
      }
      requests = (Array.isArray(request) ? request : [request]).map((one) => {
        const commandId = one.commandId ?? randomUUID();
        return { ...one, commandId, ...(one.where === 'worktree' ? { worktreeId: one.worktreeId ?? commandId } : {}) };
      });
      for (const one of requests) {
        const parsed = parseDeskStart(one);
        if (!parsed.ok) { setError(parsed.error); return; }
      }
      useDeskPending.getState().put(key, requests);
    }
    if (!requests.length) return;
    useDeskPending.getState().put(key, requests);
    locked.current = true;
    setBusy(true);
    setError(null);
    setUntrusted(null);
    void (async () => {
      try {
        while (requests.length) {
          const current = requests[0];
          try {
            const runId = await start.mutateAsync(current);
            if (!runId) throw new Error('PC has not confirmed a run. Retry checks the same command.');
            requests = settleTaskStart(requests, 'confirmed', randomUUID);
            useDeskPending.getState().put(key, requests);
          } catch (failure) {
            if (failure instanceof DeskRefusal && failure.receipt?.state === 'failed') {
              requests = settleTaskStart(requests, 'failed', randomUUID);
              useDeskPending.getState().put(key, requests, true);
              setUntrusted(failure.untrusted);
            }
            setError(`${readError(failure)}${failure instanceof DeskRefusal && failure.receipt?.state === 'failed' ? '' : ' — outcome unconfirmed; retry recovers this command, never duplicates it'}`);
            return;
          }
        }
        onStarted();
      } finally { locked.current = false; setBusy(false); }
    })();
  }, [deskId, key, link.ownerId, link.calls, link.info?.taskProtocol, link.desk?.taskProtocol, start, onStarted]);
  const trustAndStart = useCallback(() => {
    if (!untrusted) return;
    trust.mutate(untrusted, { onSuccess: () => begin(), onError: (failure) => setError(readError(failure)) });
  }, [untrusted, trust, begin]);
  const discardFailed = () => {
    const state = useDeskPending.getState();
    if (locked.current || !state.failed[key]) return null;
    const remaining = state.tasks[key] ?? [];
    state.put(key, []);
    setError(null); setUntrusted(null);
    return remaining;
  };
  return { begin, resume: () => begin(), pending, failed, discardFailed, trustAndStart, reset: () => { setError(null); setUntrusted(null); },
    error, untrusted, busy: busy || trust.isPending, trusting: trust.isPending };
}
