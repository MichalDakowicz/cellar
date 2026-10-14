import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { Pressable, Text, View } from 'react-native';
import type { CheckpointReview } from '@/lib/deskCheckpoints';
import { useDeskLink } from './useDeskLink';
import { useCheckpointRequests } from '@/store/deskCheckpoints';
import { DeskRefusal } from '@/lib/deskCalls';

export function RunTools({ runId }: { runId: string }) {
  const link = useDeskLink(); const [open, setOpen] = useState(false); const [review, setReview] = useState<CheckpointReview | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const key = [link.ownerId, link.info?.id, runId];
  const pendingKey = key.join(':');
  const pending = useCheckpointRequests((state) => state.pending[pendingKey]);
  const usage = useQuery({ queryKey: ['run-usage', ...key], queryFn: () => link.calls!.usage(runId), enabled: !!link.calls && open, retry: false, refetchInterval: open ? 30000 : false });
  const checkpoints = useQuery({ queryKey: ['run-checkpoints', ...key], queryFn: () => link.calls!.checkpoints(runId), enabled: !!link.calls && open, retry: false });
  if (!link.calls) return null;
  async function act(action: 'compact' | 'review' | 'restore' | 'receipt', id?: string) {
    if (!link.calls) return; setBusy(true); setError(null);
    try {
      if (action === 'compact') { await link.calls.compact(runId); await usage.refetch(); }
      if (action === 'review' && id) setReview(await link.calls.checkpointReview(runId, id));
      if ((action === 'restore' || action === 'receipt') && (review || pending)) {
        const request = pending ?? { commandId: Crypto.randomUUID(), runId, checkpointId: review!.checkpoint.id, token: review!.token };
        useCheckpointRequests.getState().put(pendingKey, request);
        const receipt = action === 'receipt' ? await link.calls.checkpointReceipt(request) : await link.calls.checkpointRollback(request);
        if (!receipt) throw new Error('No PC receipt. Retry the same command to resolve it.');
        if (receipt.state !== 'applied') throw new Error(receipt.error ?? 'Rollback unconfirmed; inspect recovery evidence.');
        useCheckpointRequests.getState().put(pendingKey, null); setReview(null); await checkpoints.refetch();
      }
    } catch (e) { if (action === 'restore' && e instanceof DeskRefusal) { useCheckpointRequests.getState().put(pendingKey, null); setReview(null); } setError(String(e)); } finally { setBusy(false); }
  }
  const context = usage.isError ? null : usage.data?.context;
  return <View className="gap-3 rounded-xl border border-border p-3">
    <Pressable accessibilityRole="button" onPress={() => setOpen(!open)}><Text className="min-h-11 font-sans text-foreground">usage and checkpoints · {open ? 'hide' : 'open'}</Text></Pressable>
    {open && <>
      <Text className="font-mono text-xs text-foreground">{context ? `context ${Math.round(context.percent)}%${context.estimated ? ' · estimated' : ''}` : 'context unavailable'}</Text>
      {context && context.percent >= 80 && <Pressable disabled={busy} onPress={() => void act('compact')}><Text className="min-h-11 font-sans text-foreground">/compact context</Text></Pressable>}
      {!usage.isError && usage.data?.windows.map((w) => <Text key={w.label} className="font-sans text-xs text-foreground">{w.label} · {w.used}% · reset {w.resetsAt ? new Date(w.resetsAt).toLocaleString() : 'unavailable'}</Text>)}
      {(usage.error || checkpoints.error) && <Text className="font-sans text-xs text-muted-foreground">{String(usage.error ?? checkpoints.error)}</Text>}
      <Pressable disabled={busy} onPress={() => { void usage.refetch(); void checkpoints.refetch(); }}><Text className="min-h-11 font-sans text-foreground">refresh</Text></Pressable>
      {pending && <><Text className="font-sans text-sm text-foreground">Rollback result pending. Original command saved.</Text><Pressable disabled={busy} onPress={() => void act('receipt')}><Text className="min-h-11 font-sans text-foreground">check rollback result</Text></Pressable><Pressable disabled={busy} onPress={() => void act('restore')}><Text className="min-h-11 font-sans text-foreground">retry same rollback command</Text></Pressable></>}
      {!checkpoints.isError && checkpoints.data?.map((cp) => <Pressable key={cp.id} disabled={busy || !!pending} onPress={() => void act('review', cp.id)}><Text className="min-h-11 font-sans text-foreground">turn {cp.point.turns} · {cp.label}</Text></Pressable>)}
      {review && <><Text className="font-sans text-sm text-foreground">Restore files and conversation to turn {review.checkpoint.point.turns}. Current files remain in a recovery ref.</Text><Text selectable className="font-mono text-xs text-foreground">{review.diff || 'No file changes'}</Text><Pressable disabled={busy || review.truncated} onPress={() => void act('restore')}><Text className="min-h-11 font-sans text-foreground">restore reviewed checkpoint</Text></Pressable><Pressable onPress={() => setReview(null)}><Text className="min-h-11 font-sans text-muted-foreground">cancel</Text></Pressable></>}
      {error && <Text accessibilityRole="alert" className="font-sans text-sm text-foreground">{error}</Text>}
    </>}
  </View>;
}
