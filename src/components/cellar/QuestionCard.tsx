import { Check, Square, SquareCheck, X } from 'lucide-react-native';
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
 * cost a tap or two while you are already looking at the thought.
 *
 * A tap picks an option and "answer" sends it — the one question card of
 * docs/desk/screens.md, the same on the entry, in a run's chat and in a
 * notification. "pick more than one" turns any question into a multi-pick,
 * even one the agent asked as pick-one, and "add a note" sends a line along
 * with the pick ("B, but keep the total visible"). The answer reads as the
 * option text joined, never as "c and d": letters are unreadable to the agent
 * that comes back for the decision.
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
  /** The options picked so far. */
  picked: string[];
  /** "pick more than one" is on. */
  several: boolean;
  /** The note going with the pick; null while "add a note" is closed. */
  note: string | null;
  onDraft: (text: string) => void;
  onToggle: (option: string) => void;
  onSeveral: () => void;
  onOpenNote: () => void;
  onNote: (text: string) => void;
  /** Send the picks and the note. */
  onAnswer: () => void;
  /** Send what is typed in your own words. */
  onSubmit: () => void;
  onDismiss: () => void;
};

const TONE: Record<QuestionStatus, { label: string; ink: string; ground: string }> = {
  unanswered: { label: 'unanswered', ink: COLORS.danger, ground: COLORS.dangerSoft },
  answered: { label: 'answered', ink: COLORS.accent, ground: COLORS.accentSoft },
  dismissed: { label: 'waved off', ink: COLORS.muted, ground: COLORS.chipGround },
};

export function QuestionCard(props: QuestionCardProps) {
  const { question, options, answer, answeredVia, status, agent, rel, draft, picked, several } = props;
  const tone = TONE[status];
  const open = status === 'unanswered';
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
              marked={open ? picked.includes(option) : taken.includes(option)}
              several={several}
              onPress={() => props.onToggle(option)}
            />
          ))}
        </View>
      )}

      {open && options.length > 0 && <PickControls {...props} />}

      {open && (
        <View className="mt-2.5 flex-row items-center gap-2">
          <TextInput
            className="h-[38px] min-w-0 flex-1 rounded-lg bg-secondary px-3 text-foreground"
            style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
            placeholder={options.length > 0 ? 'other — answer in your own words' : 'answer this'}
            placeholderTextColor={COLORS.muted}
            value={draft}
            onChangeText={props.onDraft}
            onSubmitEditing={props.onSubmit}
            returnKeyType="done"
            accessibilityLabel={`answer: ${question}`}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="wave this question off"
            hitSlop={6}
            onPress={props.onDismiss}
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

/** "pick more than one", "add a note", the note itself, and answer. */
function PickControls({ options, picked, several, note, onSeveral, onOpenNote, onNote, onAnswer }: QuestionCardProps) {
  const none = picked.length === 0;

  return (
    <>
      <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {options.length > 1 && (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: several }}
            hitSlop={6}
            onPress={onSeveral}
            className="flex-row items-center gap-1.5 py-1 active:opacity-70"
          >
            {several ? (
              <SquareCheck size={14} color={COLORS.accent} strokeWidth={2.2} />
            ) : (
              <Square size={14} color={COLORS.muted} strokeWidth={2.2} />
            )}
            <Text className="text-xs font-semibold text-muted-foreground">pick more than one</Text>
          </Pressable>
        )}
        {note === null && (
          <Pressable accessibilityRole="button" hitSlop={6} onPress={onOpenNote} className="py-1 active:opacity-70">
            <Text className="text-xs font-semibold text-muted-foreground">+ add a note</Text>
          </Pressable>
        )}
      </View>

      {note !== null && (
        <TextInput
          className="mt-2 h-[38px] rounded-lg bg-secondary px-3 text-foreground"
          style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
          placeholder="a note to go with it — but keep the total visible"
          placeholderTextColor={COLORS.muted}
          value={note}
          onChangeText={onNote}
          autoFocus
          accessibilityLabel="a note to go with your pick"
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={none ? 'pick an option to answer' : `answer with ${picked.join(', ')}`}
        accessibilityState={{ disabled: none }}
        disabled={none}
        onPress={onAnswer}
        className="mt-2 items-center justify-center rounded-lg bg-primary py-2.5 active:opacity-80"
        style={{ opacity: none ? 0.45 : 1 }}
      >
        <Text className="text-sm font-bold text-primary-foreground">{answerLabel(picked, options)}</Text>
      </Pressable>
    </>
  );
}

/** "answer · a" for one pick, "answer · 2 picked" for several. */
function answerLabel(picked: string[], options: string[]): string {
  if (picked.length === 0) return 'answer';
  if (picked.length > 1) return `answer · ${picked.length} picked`;
  return `answer · ${optionLabel(options.indexOf(picked[0]))}`;
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
  several,
  onPress,
}: {
  label: string;
  text: string;
  open: boolean;
  marked: boolean;
  /** Checkbox rather than radio — for the screen reader as much as the eye. */
  several: boolean;
  onPress: () => void;
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
      accessibilityRole={several ? 'checkbox' : 'radio'}
      accessibilityLabel={`${label}: ${text}`}
      accessibilityState={several ? { checked: marked } : { selected: marked }}
      onPress={onPress}
      className="active:opacity-70"
    >
      {body}
    </Pressable>
  );
}
