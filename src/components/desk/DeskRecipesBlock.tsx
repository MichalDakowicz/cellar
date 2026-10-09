import { Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { Overline } from '@/components/ui/controls';
import { recipeLine } from '@/lib/deskSettings';

type Recipe = { agent: 'claude' | 'codex' | 'default'; mode: 'ask' | 'edits' | 'full'; prompt: string; after: string[]; then: string };

/**
 * Settings › desk › recipes and rules (`DeskRecipes.dc.html`): what an agent
 * does with each kind of thought, and what every agent has to follow. Drawn
 * from the sample desk until recipes and rules are kept (docs/desk/TASKS.md
 * W15); without it, every kind starts with your defaults and says so.
 */
export function DeskRecipesBlock({
  kinds,
  kind,
  onKind,
  recipe,
  rules,
}: {
  kinds: { id: string; label: string; line: string }[];
  kind: string;
  onKind: (kind: string) => void;
  recipe: Recipe | null;
  rules: { text: string; scope: string }[];
}) {
  const picked = kinds.find((candidate) => candidate.id === kind);

  return (
    <View className="gap-4">
      <ChipWrap label="entry kind" options={kinds.map((option) => ({ value: option.id, label: option.label }))} selected={kind} onToggle={onKind} />
      <View className="gap-2 rounded-xl bg-secondary/60 p-3.5">
        <Text className="text-sm font-semibold text-foreground">{`${picked?.label ?? kind} · ${picked?.line ?? ''}`}</Text>
        {recipe ? (
          <>
            <Text className="font-mono text-xs leading-5 text-foreground">{recipe.prompt}</Text>
            <Text className="text-xs text-muted-foreground">
              {[recipeLine(recipe), recipe.after.length ? `then ${recipe.after.join(', ')}` : null, recipe.then]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </>
        ) : (
          <Text className="text-xs text-muted-foreground">
            starts with the agent and mode above. a recipe per kind — its prompt, skills and what runs after — comes later.
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Overline>rules → agent instructions</Overline>
        {rules.map((rule) => (
          <View key={rule.text} className="flex-row items-center gap-3">
            <Text className="min-w-0 flex-1 text-sm text-foreground">{rule.text}</Text>
            <Text className="text-xs text-muted-foreground">{rule.scope}</Text>
          </View>
        ))}
        <Text className="text-xs text-muted-foreground">
          a rule is a thought every agent follows, kept in step inside a block cellar owns in AGENTS.md and CLAUDE.md —
          each write shown as a diff first. comes later.
        </Text>
      </View>
    </View>
  );
}
