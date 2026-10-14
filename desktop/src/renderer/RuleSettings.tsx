import { useState } from 'react';
import type { DeskAutomation, DeskRule } from '@/lib/deskRecipes';
import type { Cellar } from './useCellar';
import { calls } from './client';
import { RuleDocument } from './RuleDocument';

export function RuleSettings({ cellar, config, onChange }: { cellar: Cellar; config: DeskAutomation; onChange: (config: DeskAutomation) => void }) {
  const [entryId, setEntry] = useState(''); const [scope, setScope] = useState<DeskRule['scope']>('everywhere'); const [scopeId, setScopeId] = useState('');
  const [projectId, setProject] = useState(''); const [review, setReview] = useState<Awaited<ReturnType<typeof calls.rulesReview>> | null>(null);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function act(apply: boolean) {
    setBusy(true); setError(null);
    try {
      if (apply && review) { await calls.rulesApply(review.projectId, review.token); setReview(null); }
      else { await calls.saveAutomation(config); setReview(await calls.rulesReview(projectId)); }
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return <section className="stack"><h2 className="overline">rules from thoughts</h2>
    <label>thought<select value={entryId} onChange={(e) => setEntry(e.target.value)}><option value="">choose thought</option>{cellar.entries.filter((e) => !e.archived).map((e) => <option key={e.id} value={e.id}>{e.text}</option>)}</select></label>
    <label>scope<select value={scope} onChange={(e) => { setScope(e.target.value as DeskRule['scope']); setScopeId(''); }}>{['everywhere', 'shelf', 'project'].map((s) => <option key={s}>{s}</option>)}</select></label>
    {scope !== 'everywhere' && <select aria-label="rule scope" value={scopeId} onChange={(e) => setScopeId(e.target.value)}><option value="">choose scope</option>{(scope === 'project' ? cellar.projects : cellar.shelves).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>}
    <button disabled={!entryId || (scope !== 'everywhere' && !scopeId)} onClick={() => onChange({ ...config, rules: [...config.rules, { entryId, scope, scopeId: scope === 'everywhere' ? null : scopeId }] })}>add rule to draft</button>
    {config.rules.map((r, i) => <div className="settings-row" key={i}><span>{cellar.entries.find((e) => e.id === r.entryId)?.text ?? r.entryId} · {r.scope}</span><button onClick={() => onChange({ ...config, rules: config.rules.filter((_, n) => n !== i) })}>remove from draft</button></div>)}
    <label>sync checkout<select value={projectId} onChange={(e) => { setProject(e.target.value); setReview(null); }}><option value="">choose project</option>{cellar.projects.filter((p) => p.repoPath).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <button disabled={!projectId || busy} onClick={() => void act(false)}>save rules and review file diffs</button>
    {review && <div className="stack">{review.files.map((f) => <RuleDocument key={f.name} file={f} />)}<button disabled={busy} onClick={() => void act(true)}>write reviewed instruction blocks</button><button onClick={() => setReview(null)}>cancel</button></div>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
