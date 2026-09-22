import { Check, X } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { optionLabel, pickedOptions } from '@/lib/entryQuestions';
import type { QuestionStatus } from '@/types/cellar';
import { COLORS } from '@/theme/colors';

/**
 * One thing an agent asked, and what settled it.
 *
 * An unanswered question is the only row in the cellar that is waiting on
 * *you*, so it gets a tinted ground and its options as tap targets: the whole
 * reason a question sits here rather than in a chat is that answering it should
 * cost one tap while you are already looking at the thought.
 *
 * A tap therefore still answers, immediately, with that one option. Holding an
 * option instead starts a multi-pick — the same gesture that holds several
 * entry rows, so the app has one way of meaning "and this one too" rather than
 * two. The answer then reads as the option text joined, never as "c and d":
 * letters are unreadable to the agent that comes back for the decision.
 *
 * Answered and waved-off ones stay, quiet, with the options still under them
 * and the picked ones ticked. They are the record of why the thought was built
 * the way it was — the half that was never written down anywhere.
 */

export type QuestionCardProps = {
  question: string;
  options: string[];
  answer: string | null;
  answeredVia: 'app' | 'chat' | null;
  status: QuestionStatus;
  agent: string | null;
  rel: string;
  draft: string;
  /** Options held for a multi-pick. Empty means a tap still answers outright. */
  held: string[];
  onDraft: (text: string) => void;
  onPick: (option: string) => void;
  onHold: (option: string) => void;
  onSendHeld: () => void;
  onSubmit: () => void;
  onDismiss: () => void;
};

const TONE: Record<QuestionStatus, { label: string; ink: string; ground: string }> = {
  unanswered: { label: 'unanswered', ink: COLORS.danger, ground: COLORS.dangerSoft },
  answered: { label: 'answered', ink: COLORS.accent, ground: COLORS.accentSoft },
  dismissed: { label: 'waved off', ink: COLORS.muted, ground: COLORS.chipGround },
};

export function QuestionCard({
  question,
  options,
  answer,
  answeredVia,
  status,
  agent,
  rel,
  draft,
  held,
  onDraft,
  onPick,
  onHold,
  onSendHeld,
  onSubmit,
  onDismiss,
}: QuestionCardProps) {
  const tone = TONE[status];
  const open = status === 'unanswered';
  const picking = held.length > 0;
  // On a settled question the options are history, and what matters is which
  // of them the answer took.
  const taken = open ? [] : pickedOptions(answer, options);

  return (
    <View className="mt-2.5 rounded-lg px-3.5 py-3" style={{ backgroundColor: tone.ground }}>
      <View className="flex-row items-center gap-2">
        <Text className="text-[10px] font-semibold uppercase tracking-[1.2px]" style={{ color: tone.ink }}>
          {tone.label}
        </Text>
        {!!agent && <Text className="min-w-0 flex-1 text-xs text-muted-foreground">· {agent}</Text>}
        <Text className="text-xs text-muted-foreground">{rel}</Text>
      </View>

      <Text className="mt-1.5 text-sm leading-snug text-foreground">{question}</Text>

      {options.length > 0 && (
        <View className="mt-2.5">
          {options.map((option, index) => (
            <Option
              key={option}
              label={optionLabel(index)}
              text={option}
              open={open}
              marked={open ? held.includes(option) : taken.includes(option)}
              onPress={() => (open ? (picking ? onHold(option) : onPick(option)) : undefined)}
              onLongPress={() => (open ? onHold(option) : undefined)}
            />
          ))}
        </View>
      )}

      {open && options.length > 1 && !picking && (
        <Text className="mt-1.5 text-xs text-muted-foreground">hold an option to pick more than one</Text>
      )}

      {open && picking && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`answer with ${held.length} options`}
          onPress={onSendHeld}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-lg bg-primary/15 py-2.5 active:opacity-70"
        >
          <Text className="text-sm font-bold text-primary">
            answer with {held.length === 1 ? 'this one' : `these ${held.length}`}
          </Text>
        </Pressable>
      )}

      {open && (
        <View className="mt-2.5 flex-row items-center gap-2">
          <TextInput
            className="h-[38px] min-w-0 flex-1 rounded-lg bg-secondary px-3 text-foreground"
            style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
            placeholder={options.length > 0 ? 'or answer in your own words' : 'answer this'}
            placeholderTextColor={COLORS.muted}
            value={draft}
            onChangeText={onDraft}
            onSubmitEditing={onSubmit}
            returnKeyType="done"
            accessibilityLabel={`answer: ${question}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="wave this question off"
            hitSlop={6}
            onPress={onDismiss}
            className="h-[38px] w-[38px] items-center justify-center rounded-lg bg-secondary active:opacity-70"
          >
            <X size={16} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        </View>
      )}

      {!open && !!answer && (
        <View className="mt-2 flex-row items-start gap-2.5">
          <Text className="w-4 pt-0.5 font-mono text-[11px] text-muted-foreground">=</Text>
          <Text className="min-w-0 flex-1 text-sm text-foreground">{answer}</Text>
        </View>
      )}

      {status === 'answered' && answeredVia === 'chat' && (
        <Text className="mt-1.5 text-xs text-muted-foreground">answered in the chat, written back here</Text>
      )}
      {status === 'dismissed' && !answer && (
        <Text className="mt-1.5 text-xs text-muted-foreground">waved off without an answer</Text>
      )}
    </View>
  );
}

/**
 * One option, at one of two weights.
 *
 * On an open question it is a tap target. On a settled one it is the record —
 * still listed, because an answer with the choices stripped off it is what made
 * "c and d both" impossible to read back, and the one it took wears a tick.
 */
function Option({
  label,
  text,
  open,
  marked,
  onPress,
  onLongPress,
}: {
  label: string;
  text: string;
  open: boolean;
  marked: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const body = (
    <View
      className={[
        'mt-1.5 flex-row items-start gap-2.5 rounded-lg px-3',
        open ? 'bg-secondary py-2.5' : 'py-1.5',
      ].join(' ')}
      style={marked && open ? { backgroundColor: COLORS.accentSoft } : undefined}
    >
      <Text className="w-4 pt-px font-mono text-[11px] text-muted-foreground">{label}</Text>
      <Text
        className={['min-w-0 flex-1 text-sm', marked || open ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
      >
        {text}
      </Text>
      {marked && <Check size={14} color={COLORS.accent} strokeWidth={2.5} />}
    </View>
  );

  if (!open) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`answer ${label}: ${text}`}
      accessibilityState={{ selected: marked }}
      onPress={onPress}
      onLongPress={onLongPress}
      className="active:opacity-70"
    >
      {body}
    </Pressable>
  );
}
