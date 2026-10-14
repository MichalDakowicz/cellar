import { useEffect, useState } from 'react';
import { calls } from './client';
export function ProviderAccounts() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof calls.providerAccounts>>>([]);
  const [agent, setAgent] = useState<'codex' | 'claude'>('codex'); const [label, setLabel] = useState(''); const [key, setKey] = useState(''); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; void calls.providerAccounts().then((r) => { if (active) setRows(r); }).catch((e) => { if (active) setError(String(e)); }); return () => { active = false; }; }, []);
  async function save() { setBusy(true); setError(null); try { setRows(await calls.saveProviderAccount({ agent, label, key })); setKey(''); setLabel(''); } catch (e) { setError(String(e)); } finally { setBusy(false); } }
  return <section className="stack"><h2>provider accounts</h2><p className="muted">Default uses your existing provider sign-in. Named API accounts keep secrets encrypted by Windows and use separate config folders for each run. Subscription accounts keep provider-owned sign-in.</p>
    {rows.map((row) => <div className="settings-row" key={row.id}>{row.agent} · {row.label}<small>plan runs out: {row.policy}</small></div>)}
    <label>agent<select value={agent} onChange={(e) => setAgent(e.target.value as typeof agent)}><option>codex</option><option>claude</option></select></label>
    <label>account name<input value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} /></label>
    <label>API key<input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} /></label>
    <button disabled={busy || !label || !key} onClick={() => void save()}>save encrypted API account</button>{error && <p role="alert">{error}</p>}
  </section>;
}
