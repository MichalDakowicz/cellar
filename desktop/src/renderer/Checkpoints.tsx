import { useEffect, useState } from 'react';
import type { DeskCheckpoint, CheckpointReview, CheckpointRequest } from '@/lib/deskCheckpoints';
import { calls } from './client';
import { saved, save } from './preferences';
import { DeskRefusal } from '@/lib/deskCalls';

export function Checkpoints({ runId, scope }: { runId: string; scope: string }) {
  const [pending, setPending] = useState<CheckpointRequest | null>(() => saved('checkpoint-requests', scope + ':' + runId, null));
  function remember(request: CheckpointRequest | null) { save('checkpoint-requests', scope + ':' + runId, request); setPending(request); }
  const [rows, setRows] = useState<DeskCheckpoint[]>([]);
  const [review, setReview] = useState<CheckpointReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  useEffect(() => {
    let active = true;
    void calls.checkpoints(runId).then((rows) => { if (active) { setRows(rows); setError(null); } }).catch((e) => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [runId, revision]);
  async function inspect(id: string) {
    setBusy(true); setError(null);
    try { setReview(await calls.checkpointReview(runId, id)); } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function restore(check = false) {
    if (!review && !pending) return; setBusy(true);
    try {
      const request = pending ?? { runId, checkpointId: review!.checkpoint.id, token: review!.token, commandId: crypto.randomUUID() };
      remember(request);
      const receipt = check ? await calls.checkpointReceipt(request) : await calls.checkpointRollback(request);
      if (!receipt) { setError('PC has no receipt. Retry this same command to resolve it; no new rollback command will be sent.'); return; }
      if (receipt.state !== 'applied') throw new Error(receipt.error ?? 'Rollback unconfirmed; inspect recovery evidence before retrying.');
      remember(null);
      setReview(null); refresh((n) => n + 1);
    } catch (e) { if (!check && e instanceof DeskRefusal) { remember(null); setReview(null); } setError(String(e)); } finally { setBusy(false); }
  }
  return <section className="stack"><h3 className="overline">checkpoints</h3>
    <button onClick={() => refresh((n) => n + 1)} disabled={busy}>refresh checkpoints</button>
    {error && <p role="alert">{error}</p>}
    {pending && <div className="stack"><p>Rollback result pending. Original command retained across restarts.</p><button disabled={busy} onClick={() => void restore(true)}>check rollback result</button><button disabled={busy} onClick={() => void restore()}>retry same rollback command</button></div>}
    {!rows.length && !error && <small className="muted">No saved turn boundaries yet.</small>}
    {rows.map((row) => <button key={row.id} disabled={busy || !!pending} onClick={() => void inspect(row.id)}>turn {row.point.turns} · {row.label}</button>)}
    {review && <div className="card stack"><p>Restore files and agent conversation to turn {review.checkpoint.point.turns}. Current work remains in a recovery ref.</p>
      <pre className="mono">{review.diff || 'No file changes. Conversation may still change.'}</pre>
      {review.truncated && <p>Diff too large; rollback disabled until full review is available.</p>}
      <button disabled={busy || review.truncated} onClick={() => void restore()}>restore reviewed checkpoint</button>
      <button disabled={busy} onClick={() => setReview(null)}>cancel</button>
    </div>}
  </section>;
}
