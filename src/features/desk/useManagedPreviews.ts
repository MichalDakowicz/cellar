import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Alert } from 'react-native';
import { previewRuns, type PreviewAction } from '@/lib/deskManagedPreview';
import { usePreviewActions } from '@/store/deskPreviewActions';
import { useDeskLink } from './useDeskLink';

export function useManagedPreviews() {
  const link = useDeskLink();
  const enabled = link.can.managedPreviews && !!link.calls;
  const key = `${link.ownerId}:${link.info?.id}`;
  const pending = usePreviewActions((s) => s.pending[key]);
  const save = usePreviewActions((s) => s.set);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['desk', 'managed-previews', key], queryFn: async () => {
    const [previews, runs] = await Promise.all([link.calls!.previews(), link.calls!.runs()]); return { previews, runs, agentRuns: previewRuns(runs) };
  }, enabled, refetchInterval: 3000, retry: false });
  async function send(action: PreviewAction) {
    if (!enabled || busy || pending) return;
    setBusy(true); setError(null); save(key, action);
    try {
      const receipt = await link.calls!.previewAction(action);
      if (receipt.state === 'confirmed' || receipt.state === 'failed') save(key, null);
      if (receipt.state !== 'confirmed') setError(receipt.error ?? 'Action uncertain. Check original receipt.');
      await query.refetch();
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  function act(projectId: string, runId: string, action: PreviewAction['action'], unopened = false) {
    const request = { commandId: Crypto.randomUUID(), projectId, runId, action };
    if (action === 'deploy' && unopened) Alert.alert('Deploy without previewing?', 'This preview has never been opened. $deploy replaces what is live.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Deploy', onPress: () => void send({ ...request, confirmUnopened: true }) },
    ]); else void send(request);
  }
  async function recover() {
    if (!pending || !enabled || busy) return;
    setBusy(true);
    try {
      const receipt = await link.calls!.previewReceipt(pending.commandId);
      if (!receipt) { save(key, null); setError('Host has no receipt. Action was not accepted; retry explicitly.'); }
      else if (['confirmed', 'failed'].includes(receipt.state)) { save(key, null); setError(receipt.error ?? null); }
      else setError(receipt.error ?? 'Action still pending. Check again.');
      await query.refetch();
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return { enabled, data: enabled && !query.error ? query.data : undefined, busy: busy || !!pending, act, recover: pending ? recover : null,
    error: error ?? (query.error ? String(query.error) : null), link };
}
