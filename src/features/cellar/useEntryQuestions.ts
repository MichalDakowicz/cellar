import { useCallback, useMemo, useState } from 'react';

import { useCellarWrites } from '@/features/cellar/useCellar';
import { joinAnswers, pendingQuestions, questionStatus, settledQuestions } from '@/lib/entryQuestions';
import { oneLine } from '@/lib/dump';
import { shortRel } from '@/lib/relTime';
import type { Entry, EntryQuestion } from '@/types/cellar';

/**
 * The questions on one entry, and the four things you can do to one: tap an
 * option, hold several of them, type an answer, or wave it off.
 *
 * Drafts are held per question id rather than as one field, because several
 * questions can be outstanding at once and a shared field would move whatever
 * you had typed to whichever one you touched last.
 *
 * Dismiss goes through a confirmation held here rather than in the screen: it
 * is the one action on this surface that settles a question without recording
 * a decision, and the entry comes off `blocked` when it lands.
 */

export type QuestionView = {
  question: EntryQuestion;
  status: ReturnType<typeof questionStatus>;
  rel: string;
  /** What is typed against this question right now. */
  draft: string;
  /** Options held for a multi-pick. Empty means a tap answers outright. */
  held: string[];
};

export function useEntryQuestions(entry: Entry | null) {
  const { answer, dismiss } = useCellarWrites();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Per question id, for the drafts' reason: two questions can be outstanding
  // and a shared set would move what you held to whichever you touched last.
  const [holds, setHolds] = useState<Record<string, string[]>>({});
  const [confirming, setConfirming] = useState<EntryQuestion | null>(null);

  const questions = entry?.questions ?? EMPTY;

  const view = useCallback(
    (question: EntryQuestion): QuestionView => ({
      question,
      status: questionStatus(question),
      rel: shortRel(question.createdAt),
      draft: drafts[question.id] ?? '',
      held: holds[question.id] ?? EMPTY_HELD,
    }),
    [drafts, holds],
  );

  const pending = useMemo(() => pendingQuestions(questions).map(view), [questions, view]);
  const settled = useMemo(() => settledQuestions(questions).map(view), [questions, view]);

  const setDraft = useCallback((id: string, text: string) => {
    setDrafts((current) => ({ ...current, [id]: text }));
  }, []);

  const send = useCallback(
    (questionId: string, text: string) => {
      const body = oneLine(text);
      if (!body || !entry) return;
      setDrafts((current) => ({ ...current, [questionId]: '' }));
      setHolds((current) => ({ ...current, [questionId]: [] }));
      answer.mutate({ entry, questionId, text: body });
    },
    [entry, answer],
  );

  return {
    /** Still owed an answer, oldest first. Rendered above the answered ones. */
    pending,
    /** Answered or waved off. The record of why the thought went the way it did. */
    settled,
    any: questions.length > 0,
    setDraft,
    /** Tap an option. Stored as its text, so reading it back needs no options. */
    pick: (questionId: string, option: string) => send(questionId, option),
    /**
     * Hold an option, or let one go. Holding nothing is not a state you can
     * get stuck in — dropping the last one returns the card to one-tap.
     */
    hold: (questionId: string, option: string) =>
      setHolds((current) => {
        const was = current[questionId] ?? [];
        return { ...current, [questionId]: was.includes(option) ? was.filter((o) => o !== option) : [...was, option] };
      }),
    /** Answer with everything held, as prose rather than as letters. */
    sendHeld: (questionId: string) => send(questionId, joinAnswers(holds[questionId] ?? [])),
    /** Send whatever is typed against this question. */
    submit: (questionId: string) => send(questionId, drafts[questionId] ?? ''),
    confirming,
    askDismiss: (question: EntryQuestion) => setConfirming(question),
    cancelDismiss: () => setConfirming(null),
    confirmDismiss: () => {
      if (entry && confirming) dismiss.mutate({ entry, questionId: confirming.id });
      setConfirming(null);
    },
  };
}

const EMPTY: EntryQuestion[] = [];
const EMPTY_HELD: string[] = [];
