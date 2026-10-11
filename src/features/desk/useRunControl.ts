import { randomUUID } from 'expo-crypto';
import { useCallback, useRef, useState } from 'react';
import { controlMessage, type RunControl } from '@/lib/deskDispatch';
import { readError } from '@/lib/utils';
import { useDeskControls } from '@/store/deskControls';
import type { DeskLink } from './useDeskLink';

export function useRunControl(link: DeskLink, slot: string, connected: boolean) {
  const key = `${link.ownerId}:${link.info?.id ?? link.pair?.id}:${slot}`;
  const saved = useDeskControls((state) => state.controls[key]);
  const [busy, setBusy] = useState(false); const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const pending = !!saved && (!saved.receipt || ['pending', 'unknown'].includes(saved.receipt.state));
  const calls = link.calls; const via = link.via;
  const submit = useCallback(async (input?: Omit<RunControl, 'commandId' | 'source'>) => {
    const saved = useDeskControls.getState().controls[key];
    const pending = !!saved && (!saved.receipt || ['pending', 'unknown'].includes(saved.receipt.state));
    if (!connected || locked.current || (!input && !saved) || !calls) return null;
    const request = pending || !input ? saved!.request : { ...input, commandId: randomUUID(), source: via === 'bridge' ? 'pc' as const : 'phone' as const };
    locked.current = true; setBusy(true); setError(null);
    useDeskControls.getState().save(key, request, pending ? saved?.receipt : undefined);
    try {
      const old = pending || !input ? await calls.controlReceipt(request) : null;
      const receipt = old ?? await calls.control(request);
      useDeskControls.getState().save(key, request, receipt);
      return { request, receipt };
    } catch (failure) { setError(`${readError(failure)} · reply missing; check the original receipt`); return null; }
    finally { locked.current = false; setBusy(false); }
  }, [connected, key, calls, via]);
  return { busy, pending, connected, saved, submit,
    message: error ?? (saved?.receipt ? controlMessage(saved.receipt) : pending ? 'Reply missing; check the original receipt.' : null) };
}
