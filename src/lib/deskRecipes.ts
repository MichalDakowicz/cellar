import { isDeskAgent } from './deskProtocol';
import type { DeskRecipe } from './deskSettings';
import type { Entry, Project, Kind } from '@/types/cellar';
import { KINDS } from './kinds';
import type { DeskAgent } from './deskProtocol';
import type { DeskMode } from './deskTask';

export type DeskRule = { entryId: string; scope: 'everywhere' | 'shelf' | 'project'; scopeId: string | null };
export type DeskAutomation = { recipes: Partial<Record<Kind, DeskRecipe>>; rules: DeskRule[] };
export const EMPTY_AUTOMATION: DeskAutomation = { recipes: {}, rules: [] };
export function recipeChoices(recipe: DeskRecipe | undefined, defaults: { agent: DeskAgent; mode: DeskMode }, explicit: { agent?: DeskAgent | null; mode?: DeskMode | null }) {
  return { agent: explicit.agent ?? (recipe?.agent !== 'default' ? recipe?.agent : undefined) ?? defaults.agent,
    mode: explicit.mode ?? recipe?.mode ?? defaults.mode, afterCommands: recipe?.after.map((c) => c.replace(/^\$/, '')) ?? [] };
}
export function parseRecipe(raw: unknown): DeskRecipe {
  const row = raw as DeskRecipe;
  if (!row || (row.agent !== 'default' && !isDeskAgent(row.agent)) || !['ask', 'edits', 'full'].includes(row.mode)
    || typeof row.prompt !== 'string' || row.prompt.length > 6000 || !row.prompt.trim()
    || !Array.isArray(row.skills) || row.skills.length > 12 || row.skills.some((s) => typeof s !== 'string' || !/^\/?[\w:./-]{1,100}$/.test(s))
    || !Array.isArray(row.after) || row.after.length > 8 || row.after.some((s) => typeof s !== 'string' || !/^\$?[\w:-]{1,80}$/.test(s))) throw new Error('Invalid recipe.');
  return { agent: row.agent, mode: row.mode, prompt: row.prompt, skills: row.skills, after: row.after,
    skillsNote: 'none', afterNote: 'after a successful turn', then: 'ask me if the plan runs out' };
}
export function parseAutomation(raw: unknown): DeskAutomation {
  const row = raw as DeskAutomation;
  if (!row || !row.recipes || typeof row.recipes !== 'object' || !Array.isArray(row.rules) || row.rules.length > 100) throw new Error('Invalid recipes and rules.');
  const recipes: DeskAutomation['recipes'] = {};
  for (const [kind, recipe] of Object.entries(row.recipes)) {
    if (!KINDS.some((k) => k.value === kind)) throw new Error('Unknown recipe kind.');
    recipes[kind as Kind] = parseRecipe(recipe);
  }
  const rules = row.rules.map((rule) => {
    if (!rule || !/^[a-f0-9-]{36}$/i.test(rule.entryId) || !['everywhere', 'shelf', 'project'].includes(rule.scope)
      || (rule.scope === 'everywhere' ? rule.scopeId !== null : typeof rule.scopeId !== 'string' || !/^[a-f0-9-]{36}$/i.test(rule.scopeId))) throw new Error('Invalid rule scope.');
    return { entryId: rule.entryId, scope: rule.scope, scopeId: rule.scopeId };
  });
  return { recipes, rules };
}
export function recipePrompt(recipe: DeskRecipe | undefined, entry: Pick<Entry, 'id' | 'text' | 'lines'> & Partial<Pick<Entry, 'docs'>>, project: string, fallback: string) {
  if (!recipe) return fallback;
  const values: Record<string, string> = { entry: entry.id, lines: [entry.text, ...entry.lines.map((l) => l.text)].join('\n'), project, files: entry.docs?.map((d) => d.ref).join('\n') ?? '' };
  const prompt = recipe.prompt.replace(/\{(entry|lines|project|files)\}/g, (_, key: string) => values[key]);
  return [...recipe.skills.map((skill) => skill.startsWith('/') ? skill : '/' + skill), prompt].join('\n\n');
}
export function scopedRules(rules: DeskRule[], entries: Pick<Entry, 'id' | 'text' | 'archived'>[], project: Pick<Project, 'id' | 'shelfId'>) {
  const rank = { everywhere: 0, shelf: 1, project: 2 };
  return rules.filter((r) => r.scope === 'everywhere' || r.scopeId === (r.scope === 'shelf' ? project.shelfId : project.id))
    .sort((a, b) => rank[a.scope] - rank[b.scope]).flatMap((r) => {
      const entry = entries.find((e) => e.id === r.entryId && !e.archived); return entry ? [entry.text] : [];
    });
}
export const RULE_START = '<!-- cellar:rules:start -->';
export const RULE_END = '<!-- cellar:rules:end -->';
export function managedRules(before: string, lines: string[]) {
  if (lines.some((line) => line.includes(RULE_START) || line.includes(RULE_END))) throw new Error('Rule contains a reserved block marker.');
  const starts = before.split(RULE_START).length - 1; const ends = before.split(RULE_END).length - 1;
  if (starts !== ends || starts > 1 || (starts && before.indexOf(RULE_END) < before.indexOf(RULE_START))) throw new Error('Managed rules block is malformed; repair it before syncing.');
  const block = `${RULE_START}\n${lines.map((line) => '- ' + line.replace(/\r?\n/g, ' ')).join('\n')}\n${RULE_END}`;
  if (!starts) return before + (before && !before.endsWith('\n') ? '\n' : '') + (before ? '\n' : '') + block + '\n';
  return before.slice(0, before.indexOf(RULE_START)) + block + before.slice(before.indexOf(RULE_END) + RULE_END.length);
}
