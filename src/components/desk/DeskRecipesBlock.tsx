import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Chip, Overline, Segmented } from '@/components/ui/controls';
import type { DeskRecipe } from '@/lib/deskSettings';
import { DESK_MODES, type DeskMode } from '@/lib/deskTask';
import { COLORS } from '@/theme/colors';

const AGENTS: { id: DeskRecipe['agent']; label: string }[] = [
  { id: 'claude', label: 'claude' },
  { id: 'codex', label: 'codex' },
  { id: 'default', label: 'project default' },
];

/**
 * Settings › recipes and rules (`DeskRecipes.dc.html`): the kinds as a list,
 * the picked kind's recipe as a labelled grid — agent, may, loads, prompt,
 * after, then — and the rules every agent follows, with the block cellar keeps
 * in the instruction files. Read-only until recipes and rules are kept (W15);
 * without the sample desk every kind shows what really happens: your defaults.
 */
export function DeskRecipesBlock({
  kinds,
  kind,
  onKind,
  recipe,
  custom,
  rules,
}: {
  kinds: { id: string; label: string; line: string }[];
  kind: string;
  onKind: (kind: string) => void;
  recipe: DeskRecipe;
  /** The recipe is a kind's own (the sample desk's); false = your defaults. */
  custom: boolean;
  rules: { text: string; scope: string }[];
}) {
  const picked = kinds.find((candidate) => candidate.id === kind);

  return (
    <View className="gap-7">
      <View className="flex-row flex-wrap gap-7">
        <View className="min-w-[200px] max-w-[240px] flex-1 gap-1">
          {kinds.map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: option.id === kind }}
              onPress={() => onKind(option.id)}
              className={`gap-px rounded-[10px] px-3 py-2 active:opacity-70 ${option.id === kind ? 'bg-secondary' : ''}`}
            >
              <Text className="font-sans text-sm font-semibold text-foreground">{option.label}</Text>
              <Text className="font-sans text-xs text-muted-foreground">{option.line}</Text>
            </Pressable>
          ))}
          <Dashed label="add a kind" />
        </View>

        <View className="min-w-[280px] flex-[3] gap-4">
          <Text className="font-sans text-xl font-bold text-foreground">{picked?.label ?? kind}</Text>
          <Field label="agent">
            <View className="flex-row flex-wrap gap-2">
              {AGENTS.map((agent) => (
                <Chip key={agent.id} label={agent.label} selected={recipe.agent === agent.id} onPress={() => {}} />
              ))}
            </View>
          </Field>
          <Field label="may">
            <Segmented<DeskMode> label="may" value={recipe.mode} onChange={() => {}} options={DESK_MODES.map((mode) => ({ value: mode.id, label: mode.label }))} />
          </Field>
          <Field label="loads">
            <Tokens tokens={recipe.skills} note={recipe.skillsNote} />
          </Field>
          <Field label="prompt">
            <Text className="min-h-[84px] rounded-xl border border-border bg-secondary px-3 py-2.5 font-mono text-[13px] leading-5 text-foreground">
              {recipe.prompt}
            </Text>
            <Text className="font-sans pt-1.5 text-xs text-muted-foreground">
              fills in <Text className="font-mono">{'{entry} {lines} {project} {files}'}</Text>
              {custom ? '' : ' · your defaults until this kind has a recipe of its own'}
            </Text>
          </Field>
          <Field label="after">
            <Tokens tokens={recipe.after} note={recipe.afterNote} />
          </Field>
          <Field label="then">
            <Text className="font-sans text-sm text-foreground">{recipe.then}</Text>
          </Field>
        </View>
      </View>

      <View className="gap-3.5 border-t border-border/50 pt-7">
        <View className="flex-row flex-wrap items-center gap-3">
          <Overline className="flex-1">rules → agent instructions</Overline>
          <Text className="font-sans text-xs text-muted-foreground">writes to</Text>
          <Token text="AGENTS.md" />
          <Token text="CLAUDE.md" />
        </View>
        <Text className="font-sans max-w-[760px] text-sm" style={{ color: COLORS.foregroundSoft }}>
          a rule is a thought every agent follows. cellar will keep every repo&apos;s instruction files in step, inside a block it
          owns — each write shown as a diff first. comes later.
        </Text>
        {rules.map((rule) => (
          <View key={rule.text} className="flex-row items-center gap-3 rounded-xl bg-row px-3 py-2.5">
            <Text className="font-sans min-w-0 flex-1 text-sm text-foreground">{rule.text}</Text>
            <Text className="font-sans text-xs text-muted-foreground">{rule.scope}</Text>
          </View>
        ))}
        <Dashed label="add a rule" />
        {rules.length > 0 && (
          <Text className="rounded-xl border border-border/50 bg-row px-3.5 py-3 font-mono text-xs leading-5" style={{ color: COLORS.foregroundSoft }}>
            {['<!-- cellar:rules · edit these in cellar -->', ...rules.map((rule) => `- ${rule.text}`), '<!-- /cellar:rules -->'].join('\n')}
          </Text>
        )}
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row flex-wrap items-start gap-3">
      <Text className="font-sans w-[140px] pt-1 text-sm text-muted-foreground">{label}</Text>
      <View className="min-w-[220px] flex-1">{children}</View>
    </View>
  );
}

function Tokens({ tokens, note }: { tokens: string[]; note: string }) {
  return (
    <View className="flex-row flex-wrap items-center gap-1.5 pt-0.5">
      {tokens.map((token) => (
        <Token key={token} text={token} />
      ))}
      {!!note && <Text className="font-sans text-xs text-muted-foreground">{note}</Text>}
    </View>
  );
}

function Token({ text }: { text: string }) {
  return <Text className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-foreground">{text}</Text>;
}

/** The boards' dashed "add …" — drawn, until recipes and rules are kept (W15). */
function Dashed({ label }: { label: string }) {
  return (
    <View accessibilityLabel={`${label} — comes later`} className="mt-1 h-10 items-center justify-center rounded-[10px] border border-dashed opacity-60" style={{ borderColor: COLORS.outline }}>
      <Text className="font-sans text-sm" style={{ color: COLORS.foregroundSoft }}>
        {label}
      </Text>
    </View>
  );
}
