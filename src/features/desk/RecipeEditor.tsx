import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, TextInput, Pressable, View } from 'react-native';
import { KINDS } from '@/lib/kinds';
import { defaultRecipe, type DeskRecipe } from '@/lib/deskSettings';
import { parseAutomation, type DeskAutomation, type DeskRule } from '@/lib/deskRecipes';
import type { Kind } from '@/types/cellar';
import { useCellar } from '@/features/cellar/useCellar';
import { useDeskLink } from './useDeskLink';
import { COLORS } from '@/theme/colors';

export function RecipeEditor() {
  const link = useDeskLink(); const client = useQueryClient(); const cellar = useCellar();
  const [kind, setKind] = useState<Kind>('glitch'); const [draft, setDraft] = useState<DeskAutomation | null>(null); const [status, setStatus] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [entryId, setEntry] = useState(''); const [scope, setScope] = useState<DeskRule['scope']>('everywhere'); const [scopeId, setScopeId] = useState<string | null>(null); const [projectId, setProject] = useState('');
  const [review, setReview] = useState<{ projectId: string; token: string; files: { name: string; diff: string }[] } | null>(null);
  const queryKey = ['desk-automation', link.ownerId, link.info?.id];
  const query = useQuery({ queryKey, queryFn: () => link.calls!.automation(), enabled: !!link.calls, retry: false });
  const config = draft ?? query.data; const recipe = config?.recipes[kind] ?? defaultRecipe('claude', 'edits');
  function update(patch: Partial<DeskRecipe>) { if (config) setDraft({ ...config, recipes: { ...config.recipes, [kind]: { ...recipe, ...patch } } }); }
  async function act(mode: 'save' | 'review' | 'apply') {
    if (!link.calls || !config) return; setBusy(true); setStatus(null);
    try {
      if (mode === 'apply' && review) { await link.calls.rulesApply(review.projectId, review.token); setReview(null); setStatus('Reviewed rules written on PC.'); }
      else { const saved = await link.calls.saveAutomation(parseAutomation(config)); client.setQueryData(queryKey, saved); setDraft(null); setStatus('Saved on PC.'); if (mode === 'review') setReview(await link.calls.rulesReview(projectId)); }
    } catch (e) { setStatus(String(e)); } finally { setBusy(false); }
  }
  const button = (label: string, onPress: () => void, selected = false) => <Pressable key={label} accessibilityRole="button" disabled={busy} onPress={onPress} className={`min-h-11 justify-center rounded-lg border border-border px-3 ${selected ? 'bg-secondary' : ''}`}><Text className="font-sans text-sm text-foreground">{label}</Text></Pressable>;
  if (!link.calls) return <Text className="font-sans text-sm text-muted-foreground">Recipes and file sync require a direct connection to PC. Browser keeps account mailbox access.</Text>;
  return <View className="gap-3"><Text className="font-sans text-sm text-muted-foreground">Recipes fill task defaults. Explicit task choices win.</Text>
    <View className="flex-row flex-wrap gap-2">{KINDS.map((k) => button(k.label, () => setKind(k.value), kind === k.value))}</View>
    <View className="flex-row flex-wrap gap-2">{(['default', 'claude', 'codex', 'agy'] as const).map((agent) => button(agent, () => update({ agent }), recipe.agent === agent))}</View>
    <View className="flex-row flex-wrap gap-2">{(['ask', 'edits', 'full'] as const).map((mode) => button(mode, () => update({ mode }), recipe.mode === mode))}</View>
    {(['prompt', 'skills', 'after'] as const).map((field) => <View key={field}><Text className="font-sans text-sm text-foreground">{field}</Text><TextInput accessibilityLabel={`recipe ${field}`} multiline autoCapitalize="none" autoCorrect={false} placeholderTextColor={COLORS.muted} value={field === 'prompt' ? recipe.prompt : recipe[field].join('\n')} onChangeText={(text) => update(field === 'prompt' ? { prompt: text } : { [field]: text.split('\n').filter(Boolean) })} className="min-h-24 rounded-lg bg-secondary p-3 font-mono text-sm text-foreground" /></View>)}
    {button('save recipes and rules', () => void act('save'))}
    <Text className="font-sans text-lg text-foreground">rules from thoughts</Text>
    <View className="gap-1">{cellar.entries.filter((e) => !e.archived).slice(0, 100).map((e) => button(e.text, () => setEntry(e.id), entryId === e.id))}</View>
    <View className="flex-row flex-wrap gap-2">{(['everywhere', 'shelf', 'project'] as const).map((s) => button(s, () => { setScope(s); setScopeId(null); }, scope === s))}</View>
    {scope !== 'everywhere' && (scope === 'project' ? cellar.projects : cellar.shelves).map((r) => button(r.name, () => setScopeId(r.id), scopeId === r.id))}
    {entryId && (scope === 'everywhere' || scopeId) && button('add rule to draft', () => { if (config) setDraft({ ...config, rules: [...config.rules, { entryId, scope, scopeId: scope === 'everywhere' ? null : scopeId }] }); })}
    {config?.rules.map((r, index) => <View key={index}><Text className="font-sans text-sm text-foreground">{cellar.entries.find((e) => e.id === r.entryId)?.text ?? r.entryId} · {r.scope}</Text>{button(`remove rule ${index + 1} from draft`, () => setDraft({ ...config, rules: config.rules.filter((_, n) => n !== index) }))}</View>)}
    <Text className="font-sans text-sm text-foreground">sync checkout</Text>{cellar.projects.filter((p) => p.repoPath).map((p) => button(p.name, () => { setProject(p.id); setReview(null); }, projectId === p.id))}
    {projectId && button('save rules and review file diffs', () => void act('review'))}
    {review && <>{review.files.map((f) => <Text key={f.name} selectable className="font-mono text-xs text-foreground">{f.diff}</Text>)}{button('write reviewed instruction blocks', () => void act('apply'))}{button('cancel review', () => setReview(null))}</>}
    {(status || query.error) && <Text className="font-sans text-sm text-muted-foreground">{status ?? String(query.error)}</Text>}
  </View>;
}
