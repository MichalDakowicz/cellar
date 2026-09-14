import { Text, View } from 'react-native';

import { QuestionCard } from '@/components/cellar/QuestionCard';
import { Overline } from '@/components/ui/controls';
import type { QuestionView } from '@/features/cellar/useEntryQuestions';

/**
 * The questions section.
 *
 * Its own section, above the thread, for the same reason an agent's lines are
 * separated from yours: a question is not the thought developing, it is a fork
 * in it. Mixed into the append field it would be another one-liner to scroll
 * past, and the one row in the cellar that is actually waiting on you would be
 * the thing you find last.
 *
 * Outstanding first, then what has been settled — newest decisions are not more
 * interesting than the question still holding the entry up.
 */

export type QuestionThreadProps = {
  pending: QuestionView[];
  settled: QuestionView[];
  onDraft: (id: string, text: string) => void;
  onPick: (id: string, option: string) => void;
  onSubmit: (id: string) => void;
  onDismiss: (view: QuestionView) => void;
};

export function QuestionThread({ pending, settled, onDraft, onPick, onSubmit, onDismiss }: QuestionThreadProps) {
  if (pending.length === 0 && settled.length === 0) return null;

  const card = (view: QuestionView) => (
    <QuestionCard
      key={view.question.id}
      question={view.question.question}
      options={view.question.options}
      answer={view.question.answer}
      answeredVia={view.question.answeredVia}
      status={view.status}
      agent={view.question.agent}
      rel={view.rel}
      draft={view.draft}
      onDraft={(text) => onDraft(view.question.id, text)}
      onPick={(option) => onPick(view.question.id, option)}
      onSubmit={() => onSubmit(view.question.id)}
      onDismiss={() => onDismiss(view)}
    />
  );

  return (
    <View className="mt-4">
      <Overline>{pending.length > 0 ? 'waiting on you' : 'questions'}</Overline>
      {pending.map(card)}
      {pending.length > 0 && settled.length > 0 && (
        <Text className="mt-4 text-[10px] font-semibold uppercase tracking-[1.2px] text-muted-foreground">
          already settled
        </Text>
      )}
      {settled.map(card)}
    </View>
  );
}
