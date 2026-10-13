import { Square, SquareCheck, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { runChip } from '@/lib/deskView';
import { optionLabel, optionParts } from '@/lib/entryQuestions';
import { answerPicks } from '@/lib/questionAnswer';
import type { QuestionStatus } from '@/types/cellar';
import { COLORS } from '@/theme/colors';

/**
 * One thing an agent asked, and what settled it — the one question card of
 * docs/desk/screens.md (`QuestionCard.dc.html`, `PhoneQuestion.dc.html`), the
 * same on the entry, in a run's chat and in a notification.
 *
 * Open: who asks and whether it is pick one or pick any, the question, its
 * options as lettered cards (round tiles for one, square for several, the
 * agent's "recommended" as a pill), "other" last — picking it opens a field
 * for your own words — and "let it decide" beside answer. "pick more than one"
 * turns any question into a multi-pick and "add a note" sends a line with the
 * pick. The answer reads as the option text joined, never as letters.
 *
 * Answered and waved-off ones stay, quiet, with the options under them and
 * the taken ones marked: the record of why the thought was built that way.
 */

/** The agent's "recommended" pill wears the done chip's green. */
const RECOMMENDED = runChip('done');

export type QuestionCardProps = {
  question: string;
  options: string[];
  answer: string | null;
  answerPicks?: string[] | null;
  sending?: boolean;
  error?: string | null;
  answeredVia: 'app' | 'chat' | null;
  status: QuestionStatus;
  agent: string | null;
  rel: string;
  draft: string;
  picked: string[];
  several: boolean;
  note: string | null;
  onDraft: (text: string) => void;
  onToggle: (option: string) => void;
  onSeveral: () => void;
  onOpenNote: () => void;
  onNote: (text: string) => void;
  onAnswer: () => void;
  onSubmit: () => void;
  onLetDecide: () => void;
  onDismiss: () => void;
};

export function QuestionCard(props: QuestionCardProps) {
  const { question, options, answer, answeredVia, status, agent, rel } = props;
  const open = status === 'unanswered';
  return open ? (
    <OpenCard {...props} />
  ) : (
    <View className="mt-2.5 gap-1.5 rounded-xl bg-row px-3.5 py-3">
      <View className="flex-row items-center gap-2">
        <Text className="font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {status === 'answered' ? 'answered' : 'waved off'}
        </Text>
        <Text className="font-sans min-w-0 flex-1 text-xs text-muted-foreground">{agent ? `· ${agent}` : ''}</Text>
        <Text className="font-sans text-xs text-muted-foreground">{rel}</Text>
      </View>
      <Text className="font-sans text-sm font-semibold text-foreground">{question}</Text>
      {options.map((option, index) => {
        const taken = answerPicks({ answer, options, answerPicks: props.answerPicks }).includes(option);
        return (
          <Text key={option} className={`font-sans text-sm ${taken ? 'text-foreground' : 'text-muted-foreground'}`}>
            <Text className="font-mono font-semibold">{optionLabel(index)}</Text>
            {`  ${optionParts(option).label}${taken ? '  ✓' : ''}`}
          </Text>
        );
      })}
      {!!answer && <Text className="font-sans text-sm text-foreground">= {answer}</Text>}
      {status === 'answered' && answeredVia === 'chat' && (
        <Text className="font-sans text-xs text-muted-foreground">answered in the chat, written back here</Text>
      )}
      {status === 'dismissed' && !answer && <Text className="font-sans text-xs text-muted-foreground">waved off without an answer</Text>}
    </View>
  );
}

function OpenCard(props: QuestionCardProps) {
  const { question, options, agent, rel, draft, picked, several, note } = props;
  const [other, setOther] = useState(options.length === 0);
  const who = agent ?? 'the agent';
  const ready = !props.sending && (picked.length > 0 || (other && draft.trim().length > 0));

  return (
    <View className="mt-2.5 gap-2.5 border-t border-border/50 pt-3.5">
      {(props.sending || props.error) && <Text className="font-sans text-xs text-muted-foreground">{props.sending ? 'Saving answer…' : props.error}</Text>}
      <View className="flex-row items-center gap-1.5">
        <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: COLORS.danger }} />
        <Text className="font-sans min-w-0 flex-1 text-xs font-bold uppercase tracking-widest" style={{ color: COLORS.danger }}>
          {`${who} asks · ${several ? 'pick any' : 'pick one'}`}
        </Text>
        <Text className="font-sans text-xs text-muted-foreground">{rel}</Text>
      </View>
      <Text className="font-sans text-base font-bold text-foreground">{question}</Text>

      <View className="gap-2">
        {options.map((option, index) => (
          <Option
            key={option}
            letter={optionLabel(index)}
            option={option}
            on={picked.includes(option)}
            several={several}
            onPress={() => props.onToggle(option)}
          />
        ))}
        {options.length > 0 && (
          <Option
            letter={optionLabel(options.length)}
            option="other — say or type your own answer"
            on={other}
            several={several}
            onPress={() => setOther(!other)}
          />
        )}
      </View>

      {other && (
        <TextInput
          className="font-sans h-11 rounded-full border border-border bg-secondary px-4 text-foreground"
          style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
          placeholder="say or type your own answer"
          placeholderTextColor={COLORS.muted}
          value={draft}
          onChangeText={props.onDraft}
          onSubmitEditing={props.onSubmit}
          returnKeyType="send"
          accessibilityLabel={`your own answer to: ${question}`}
        />
      )}

      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {options.length > 1 && (
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: several }} hitSlop={6} onPress={props.onSeveral} className="flex-row items-center gap-1.5 py-1 active:opacity-70">
            {several ? <SquareCheck size={14} color={COLORS.accent} strokeWidth={2.2} /> : <Square size={14} color={COLORS.muted} strokeWidth={2.2} />}
            <Text className="font-sans text-xs font-semibold text-muted-foreground">pick more than one</Text>
          </Pressable>
        )}
        {note === null && options.length > 0 && (
          <Pressable accessibilityRole="button" hitSlop={6} onPress={props.onOpenNote} className="py-1 active:opacity-70">
            <Text className="font-sans text-xs font-semibold text-muted-foreground">+ add a note</Text>
          </Pressable>
        )}
        <View className="flex-1" />
        <Pressable accessibilityRole="button" accessibilityLabel="wave this question off" hitSlop={6} onPress={props.onDismiss} className="py-1 active:opacity-70">
          <X size={14} color={COLORS.muted} strokeWidth={2} />
        </Pressable>
      </View>
      {note !== null && (
        <TextInput
          className="font-sans h-11 rounded-full border border-border bg-secondary px-4 text-foreground"
          style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
          placeholder="a note to go with it — but keep the total visible"
          placeholderTextColor={COLORS.muted}
          value={note}
          onChangeText={props.onNote}
          autoFocus
          accessibilityLabel="a note to go with your pick"
        />
      )}

      <View className="mt-0.5 flex-row gap-2">
        <Pressable accessibilityRole="button" onPress={props.onLetDecide} className="h-12 flex-1 items-center justify-center rounded-full border border-border active:opacity-70">
          <Text className="font-sans text-sm font-semibold text-foreground">{`let ${who} decide`}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={picked.length > 0 ? props.onAnswer : props.onSubmit}
          className="h-12 flex-1 items-center justify-center rounded-full bg-primary active:opacity-80"
          style={{ opacity: ready ? 1 : 0.5 }}
        >
          <Text className="font-sans text-sm font-semibold text-primary-foreground">{answerLabel(picked, options)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** "answer · A + C" — the letters of what is picked. */
function answerLabel(picked: string[], options: string[]): string {
  if (picked.length === 0) return 'answer';
  return `answer · ${picked.map((option) => optionLabel(options.indexOf(option))).join(' + ')}`;
}

/** One lettered option card: tile, label with its "recommended", the line under it. */
function Option({ letter, option, on, several, onPress }: { letter: string; option: string; on: boolean; several: boolean; onPress: () => void }) {
  const parts = optionParts(option);
  return (
    <Pressable
      accessibilityRole={several ? 'checkbox' : 'radio'}
      accessibilityLabel={`${letter}: ${parts.label}`}
      accessibilityState={several ? { checked: on } : { selected: on }}
      onPress={onPress}
      className={`min-h-14 flex-row items-center gap-3 rounded-xl border-2 px-3 py-2 active:opacity-80 ${on ? 'border-primary' : 'border-transparent bg-row'}`}
      style={on ? { backgroundColor: COLORS.accentSoft } : undefined}
    >
      <View className={`h-7 w-7 items-center justify-center ${several ? 'rounded-md' : 'rounded-full'} ${on ? 'bg-primary' : 'bg-secondary'}`}>
        <Text className="font-mono text-[13px] font-semibold" style={{ color: on ? COLORS.accentInk : COLORS.foregroundSoft }}>
          {letter}
        </Text>
      </View>
      <View className="min-w-0 flex-1 gap-px">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text className="font-sans text-sm font-semibold text-foreground">{parts.label}</Text>
          {parts.recommended && (
            <Text className="font-sans rounded-full px-1.5 text-[10px] font-semibold" style={{ color: RECOMMENDED.color, backgroundColor: RECOMMENDED.tint }}>
              recommended
            </Text>
          )}
        </View>
        {!!parts.detail && <Text className="font-sans text-xs text-muted-foreground">{parts.detail}</Text>}
      </View>
    </Pressable>
  );
}
