import { useCallback, useMemo, useState } from 'react';

import { useCellarWrites } from '@/features/cellar/useCellar';
import { composeAnswer, pendingQuestions, questionStatus, settledQuestions } from '@/lib/entryQuestions';
import { oneLine } from '@/lib/dump';
import { shortRel } from '@/lib/relTime';
import type { Entry, EntryQuestion } from '@/types/cellar';

/**
 * The questions on one entry, and what you can do to one: pick an option (or,
 * with "pick more than one", several), add a note to go with the pick, type an
 * answer in your own words, or wave it off (docs/desk/screens.md, "question
 * card"). The pick and its note go back as one line — `composeAnswer`.
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
  /** The options picked so far; one at most unless `several`. */
  picked: string[];
  /** "pick more than one" is on — even when the agent asked for one. */
  several: boolean;
  /** The note going with the pick; null while "add a note" is closed. */
  note: string | null;
};

type Pick = { picked: string[]; several: boolean; note: string | null };
const NO_PICK: Pick = { picked: [], several: false, note: null };

export function useEntryQuestions(entry: Entry | null) {
  const { answer, dismiss } = useCellarWrites();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Per question id, for the drafts' reason: two questions can be outstanding
  // and a shared pick would move to whichever you touched last.
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const [confirming, setConfirming] = useState<EntryQuestion | null>(null);

  const questions = entry?.questions ?? EMPTY;

  const view = useCallback(
    (question: EntryQuestion): QuestionView => ({
      question,
      status: questionStatus(question),
      rel: shortRel(question.createdAt),
      draft: drafts[question.id] ?? '',
      ...(picks[question.id] ?? NO_PICK),
    }),
    [drafts, picks],
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
      setPicks((current) => ({ ...current, [questionId]: NO_PICK }));
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
    /** Pick an option, or let it go. One at a time unless "pick more than one" is on. */
    toggle: (questionId: string, option: string) =>
      update(setPicks, questionId, (was) => {
        const on = was.picked.includes(option);
        const picked = was.several
          ? on
            ? was.picked.filter((o) => o !== option)
            : [...was.picked, option]
          : on
            ? []
            : [option];
        return { ...was, picked };
      }),
    /** Turning it off keeps the first pick, so nothing you chose silently goes. */
    toggleSeveral: (questionId: string) =>
      update(setPicks, questionId, (was) => ({
        ...was,
        several: !was.several,
        picked: was.several ? was.picked.slice(0, 1) : was.picked,
      })),
    openNote: (questionId: string) => update(setPicks, questionId, (was) => ({ ...was, note: was.note ?? '' })),
    setNote: (questionId: string, note: string) => update(setPicks, questionId, (was) => ({ ...was, note })),
    /** Answer with the picks and the note, as prose rather than as letters. */
    answerPicked: (questionId: string) => {
      const pick = picks[questionId] ?? NO_PICK;
      send(questionId, composeAnswer(pick.picked, pick.note));
    },
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

function update(
  set: (fn: (current: Record<string, Pick>) => Record<string, Pick>) => void,
  questionId: string,
  next: (was: Pick) => Pick,
) {
  set((current) => ({ ...current, [questionId]: next(current[questionId] ?? NO_PICK) }));
}
