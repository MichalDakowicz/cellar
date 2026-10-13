import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import type { WorktreeAction, WorktreeReview } from '@/lib/deskWorktrees';
import { useWorktreePending } from '@/store/deskWorktrees';
import { readError } from '@/lib/utils';
import { useDeskStatus } from './DeskStatusProvider';
import { WORKTREES_KEY } from './useDeskWorktrees';
import { DESK_KEYS } from './useDeskLink';

export function useWorktreeAction(id: string) {
  const { link } = useDeskStatus();
  const client = useQueryClient();
  const key = `${link.ownerId}:${link.info?.id ?? link.pair?.id}:${id}`;
  const pending = useWorktreePending((state) => state.pending[key]);
  const [review, setReview] = useState<WorktreeReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locked = useRef(false);
  const connected = !!link.calls && link.info?.worktrees === true;
  const inspect = async (action: WorktreeAction) => {
    if (!connected || locked.current || pending) return;
    locked.current = true; setBusy(true); setError(null); setMessage(null);
    try {
      const result = await link.calls!.reviewWorktree(id, action);
      if (!result || result.worktreeId !== id || result.action !== action || !/^[a-f0-9]{64}$/.test(result.token)
        || typeof result.allowed !== 'boolean' || typeof result.summary !== 'string' || typeof result.branch !== 'string' || typeof result.target !== 'string'
        || !/^[a-f0-9]{40,64}$/.test(result.sourceHead) || !/^[a-f0-9]{40,64}$/.test(result.targetHead)
        || (result.reason !== null && typeof result.reason !== 'string') || (!result.allowed && !result.reason)) throw new Error('PC did not return a valid worktree review.');
      setReview(result);
    } catch (failure) { setError(readError(failure)); }
    finally { locked.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (!connected || locked.current || (!pending && !review?.allowed)) return;
    locked.current = true; setBusy(true); setError(null); setMessage(null);
    const request = pending ?? { commandId: randomUUID(), worktreeId: id, action: review!.action, token: review!.token };
    useWorktreePending.getState().put(key, request); setReview(null);
    try {
      const saved = pending ? await link.calls!.worktreeReceipt(request.commandId) : null;
      const receipt = saved ?? await link.calls!.actWorktree(request);
      if (!receipt || receipt.commandId !== request.commandId || !['confirmed', 'failed', 'pending', 'unknown'].includes(receipt.state)) throw new Error('PC did not return a valid action receipt.');
      if (receipt.state === 'confirmed') {
        if (!receipt.result || receipt.result.worktreeId !== id || receipt.result.action !== request.action || typeof receipt.result.message !== 'string') throw new Error('PC did not confirm this worktree action.');
        setMessage(receipt.result.message); useWorktreePending.getState().put(key, null);
        void client.invalidateQueries({ queryKey: WORKTREES_KEY });
        void client.invalidateQueries({ queryKey: DESK_KEYS.runs });
      } else if (receipt.state === 'failed') {
        setError(receipt.error ?? 'PC refused the action. Review again.'); useWorktreePending.getState().put(key, null);
      } else setError(receipt.error ?? 'Action awaiting PC confirmation. Recover checks the original receipt.');
    } catch (failure) { setError(`${readError(failure)} — outcome unconfirmed; recover checks the same command`); }
    finally { locked.current = false; setBusy(false); }
  };
  return { review, busy, error, message, pending: !!pending, connected,
    inspect, submit, close: () => setReview(null) };
}
