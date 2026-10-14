import { managedRules, scopedRules, recipePrompt, parseRecipe, recipeChoices } from './deskRecipes';
import { defaultRecipe } from './deskSettings';

test('managed blocks preserve surrounding instructions and reject ambiguous markers', () => {
  const first = managedRules('user rules\n', ['one']);
  const next = managedRules(first + 'tail\n', ['two']);
  expect(next).toContain('user rules\n'); expect(next).toContain('tail\n'); expect(next).not.toContain('- one'); expect(next).toContain('- two');
  expect(() => managedRules('<!-- cellar:rules:start -->', [])).toThrow();
  expect(() => managedRules('', ['<!-- cellar:rules:end -->'])).toThrow();
});
test('rule scope orders global, shelf, project and omits archived thoughts', () => {
  const entries = ['global', 'shelf', 'project', 'hidden'].map((id) => ({ id, text: id, archived: id === 'hidden' }));
  expect(scopedRules([{ entryId: 'project', scope: 'project', scopeId: 'p' }, { entryId: 'global', scope: 'everywhere', scopeId: null }, { entryId: 'hidden', scope: 'everywhere', scopeId: null }, { entryId: 'shelf', scope: 'shelf', scopeId: 's' }], entries, { id: 'p', shelfId: 's' })).toEqual(['global', 'shelf', 'project']);
});
test('template fills once without interpreting thought text as another template', () => {
  const recipe = { ...defaultRecipe('codex', 'ask'), prompt: '{lines} in {project}', skills: ['review'] };
  expect(recipePrompt(recipe, { id: 'e', text: '{project}', lines: [] }, 'cellar', 'fallback')).toBe('/review\n\n{project} in cellar');
  expect(() => parseRecipe({ ...recipe, after: ['test;rm'] })).toThrow();
});
test('each entry recipe supplies its own defaults and explicit task choices override them', () => {
  const defaults = { agent: 'claude' as const, mode: 'ask' as const };
  const recipe = { ...defaultRecipe('codex', 'edits'), after: ['$test'] };
  expect(recipeChoices(recipe, defaults, {})).toEqual({ agent: 'codex', mode: 'edits', afterCommands: ['test'] });
  expect(recipeChoices(recipe, defaults, { agent: 'claude', mode: 'full' })).toEqual({ agent: 'claude', mode: 'full', afterCommands: ['test'] });
});
