import { useState } from 'react';
import type { Host } from './useHost';
import { useHostQuery } from './useHostQuery';
import { calls } from './client';
import { saved, saveRecord } from './preferences';
import { navigate } from './useRoute';
import { managedChecks, type PreviewAction } from '@/lib/deskManagedPreview';

export function ManagedPreviews({ host, port }: { host: Host; port?: string }) {
  const enabled = host.live && host.can.managedPreviews;
  const previews = useHostQuery(enabled, calls.previews, host.key, 3000);
  const jobs = useHostQuery(enabled, calls.runs, host.key, 3000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = saved<Record<string, PreviewAction>>('cellar-preview-actions', 'pending', {})[host.key];
  async function act(projectId: string, runId: string, action: PreviewAction['action'], unopened = false) {
    if (!enabled || busy || pending) return;
    if (unopened && !window.confirm('Preview was never opened. Deploy without previewing? $deploy replaces what is live.')) return;
    const request: PreviewAction = { commandId: crypto.randomUUID(), projectId, runId, action, ...(unopened ? { confirmUnopened: true } : {}) };
    saveRecord('cellar-preview-actions', 'pending', host.key, request); setBusy(true); setError(null);
    try {
      const receipt = await calls.previewAction(request);
      if (['confirmed', 'failed'].includes(receipt.state)) saveRecord('cellar-preview-actions', 'pending', host.key, null);
      if (receipt.state !== 'confirmed') setError(receipt.error ?? 'Preview action uncertain.');
      previews.refresh(); jobs.refresh();
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  async function recover() {
    if (!pending) return;
    try {
      const receipt = await calls.previewReceipt(pending.commandId);
      if (!receipt || ['confirmed', 'failed'].includes(receipt.state)) saveRecord('cellar-preview-actions', 'pending', host.key, null);
      setError(receipt?.error ?? (receipt?.state === 'pending' ? 'Still pending.' : receipt?.state === 'unknown' ? 'Result unknown. Check the PC; action will not replay.' : null));
      previews.refresh(); jobs.refresh();
    } catch (e) { setError(String(e)); }
  }
  if (!enabled) return <p className="muted">Reconnect to an updated PC for managed previews.</p>;
  const selected = previews.data?.find((p) => String(p.port) === port);
  return <section className="stack">
    {!port && <><h2 className="overline">worktree previews</h2>{jobs.data?.filter((r) => r.projectId && r.agent !== 'job').map((run) => <div key={run.id} className="row wrap">
      <span>{run.name} · {run.branch ?? 'main'}</span><button disabled={busy || !!pending} onClick={() => void act(run.projectId!, run.id, 'start')}>start preview</button>
    </div>)}{previews.data?.map((p) => <div key={p.id} className="row wrap"><span className="mono">:{p.port} · {p.state}</span><button disabled={p.state !== 'live'} onClick={() => navigate(`/desk/preview/${p.port}`)}>open</button><button disabled={busy || !!pending} onClick={() => void act(p.projectId, p.runId, 'stop')}>stop</button></div>)}</>}
    {selected && <><div className="row"><button disabled={busy || !!pending} onClick={() => void act(selected.projectId, selected.runId, 'checks')}>run checks</button><button disabled={busy || !!pending} onClick={() => void act(selected.projectId, selected.runId, 'deploy', !selected.openedAt)}>$deploy</button><button onClick={() => navigate(`/desk/run/${selected.runId}`)}>tell the agent</button></div>
      {managedChecks(selected, jobs.data ?? []).map((c) => <p key={c.label} className="mono">{c.label} · {c.detail}</p>)}
      {jobs.data?.filter((j) => selected.checks.some((c) => c.jobId === j.id) || selected.deployJobId === j.id).map((j) => <button key={j.id} onClick={() => navigate(`/desk/run/${j.id}`)}>{j.name} · {j.state} · open output</button>)}
    </>}
    {(error ?? previews.error ?? jobs.error) && <p role="status">{error ?? previews.error ?? jobs.error}</p>}
    {pending && <button onClick={() => void recover()}>check original preview receipt</button>}
  </section>;
}
