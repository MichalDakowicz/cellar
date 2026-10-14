import { useEffect, useState } from 'react';
import type { DeskUsage } from '@/lib/deskUsage';
import { calls } from './client';
export function RunUsage({ runId }: { runId: string }) {
  const [usage, setUsage] = useState<DeskUsage | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () => { void calls.usage(runId).then((u) => { if (active) { setUsage(u); setError(null); } }).catch((e) => { if (active) { setUsage(null); setError(String(e)); } }); };
    load(); const timer = setInterval(load, 30_000); return () => { active = false; clearInterval(timer); };
  }, [runId]);
  async function compact() { setBusy(true); try { await calls.compact(runId); setUsage(null); setError('Compaction requested; waiting for provider update.'); } catch (e) { setError(String(e)); } finally { setBusy(false); } }
  return <section className="stack"><h3 className="overline">usage</h3>
    {error && <small role="status">{error}</small>}
    {usage?.context ? <><span className="mono">context {Math.round(usage.context.percent)}%{usage.context.estimated ? ' · estimated' : ''}</span><meter min={0} max={100} value={Math.min(100, usage.context.percent)} />{usage.context.percent >= 80 && <button disabled={busy} onClick={() => void compact()}>/compact · review and compact context</button>}</> : <small className="muted">Context unavailable.</small>}
    {usage?.windows.map((w) => <div className="stack" key={w.label}><span>{w.label} · {w.used}%</span><meter min={0} max={100} value={w.used} /><small>reset {w.resetsAt ? new Date(w.resetsAt).toLocaleString() : 'unavailable'}</small>{w.used >= 100 && <p>Plan exhausted · ask me before changing accounts.</p>}</div>)}
    {usage?.note && <small className="muted">{usage.note}</small>}
  </section>;
}
