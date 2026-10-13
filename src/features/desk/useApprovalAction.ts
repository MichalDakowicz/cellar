import { randomUUID } from 'expo-crypto';
import { useRef, useState } from 'react';
import type { ApprovalDecision, ApprovalReceipt, RuntimeRequest } from '@/lib/deskApprovals';
import { useApprovalPending } from '@/store/deskApprovals';
import { readError } from '@/lib/utils';
import { useDeskStatus } from './DeskStatusProvider';
import { useDeskStream } from './useDeskStream';

export function useApprovalAction(request: RuntimeRequest | null) {
  const { link } = useDeskStatus(); const stream = useDeskStream(link);
  const key = `${link.ownerId}:${link.info?.id ?? link.pair?.id}:${request?.id}`;
  const pending = useApprovalPending((state) => state.pending[key]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ApprovalReceipt | null>(null); const locked = useRef(false);
  const connected = !!link.calls && stream.live && link.info?.approvalProtocol === 1;
  const submit = async (decision?: ApprovalDecision) => {
    if (!connected || locked.current || !request || (!pending && (!decision || request.state !== 'pending'))) return;
    const answer = pending ?? { commandId: randomUUID(), requestId: request.id, decision: decision!, source: 'phone' as const };
    locked.current = true; setBusy(true); setError(null); useApprovalPending.getState().put(key, answer);
    try {
      // Recovery first reads the original receipt. A missing receipt may resend only the same UUID/choices.
      const old = pending ? await link.calls!.approvalReceipt(answer) : null;
      const result = old ?? await link.calls!.answerApproval(answer);
      setReceipt(result);
      if (result.state === 'confirmed' || result.state === 'failed') {
        useApprovalPending.getState().put(key, null);
        if (result.state === 'failed') setError(result.error ?? 'PC refused this decision.');
      } else setError(result.error ?? 'Awaiting PC confirmation. Check the original receipt.');
    } catch (failure) { setError(`${readError(failure)} · reply missing; check the original receipt`); }
    finally { locked.current = false; setBusy(false); }
  };
  return { busy, error, pending: !!pending, connected, receipt: receipt?.request.id === request?.id ? receipt : null,
    decide: (decision: ApprovalDecision) => void submit(decision), recover: () => void submit() };
}
