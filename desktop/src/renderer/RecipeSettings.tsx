import { useEffect, useState } from 'react';
import { KINDS } from '@/lib/kinds';
import { defaultRecipe } from '@/lib/deskSettings';
import { EMPTY_AUTOMATION, parseAutomation, type DeskAutomation } from '@/lib/deskRecipes';
import type { Kind } from '@/types/cellar';
import type { DeskRecipe } from '@/lib/deskSettings';
import { calls } from './client';
import type { Cellar } from './useCellar';
import { RuleSettings } from './RuleSettings';

export function RecipeSettings({ sample, cellar }: { sample: boolean; cellar: Cellar }) {
  const [kind, setKind] = useState<Kind>('glitch');
  const [config, setConfig] = useState<DeskAutomation>(EMPTY_AUTOMATION);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (!sample) void calls.automation().then((value) => { if (active) { setConfig(value); setReady(true); } }).catch((e) => { if (active) setError(String(e)); });
    return () => { active = false; };
  }, [sample]);
  const recipe = config.recipes[kind] ?? defaultRecipe('claude', 'edits');
  function update(patch: Partial<DeskRecipe>) { setConfig((c) => ({ ...c, recipes: { ...c.recipes, [kind]: { ...recipe, ...patch } } })); }
  async function save() {
    setBusy(true); setError(null);
    try { setConfig(await calls.saveAutomation(parseAutomation(config))); } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return <div className="stack"><p className="muted">Recipes fill task defaults. Explicit task choices win. After commands run only after a successful turn.</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={!ready || busy || sample} className="stack">
      <label>kind<select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>{KINDS.map((k) => <option key={k.value}>{k.value}</option>)}</select></label>
      <label>agent<select value={recipe.agent} onChange={(e) => update({ agent: e.target.value as DeskRecipe['agent'] })}>{['default', 'claude', 'codex', 'agy'].map((a) => <option key={a}>{a}</option>)}</select></label>
      <label>mode<select value={recipe.mode} onChange={(e) => update({ mode: e.target.value as DeskRecipe['mode'] })}>{['ask', 'edits', 'full'].map((a) => <option key={a}>{a}</option>)}</select></label>
      <label>skills (one per line)<textarea rows={2} value={recipe.skills.join('\n')} onChange={(e) => update({ skills: e.target.value.split('\n').filter(Boolean) })} /></label>
      <label>prompt template<textarea value={recipe.prompt} onChange={(e) => update({ prompt: e.target.value })} /></label>
      <small className="muted">{'{entry} · {lines} · {project} · {files}'}</small>
      <label>commands after success (one per line)<textarea rows={2} value={recipe.after.join('\n')} onChange={(e) => update({ after: e.target.value.split('\n').filter(Boolean) })} /></label>
      <button onClick={() => void save()}>save recipes and rules</button>
      <RuleSettings cellar={cellar} config={config} onChange={setConfig} />
    </fieldset>
  </div>;
}
