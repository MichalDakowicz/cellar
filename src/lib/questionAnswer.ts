import { composeAnswer, pickedOptions } from '@/lib/entryQuestions';
import type { EntryQuestion } from '@/types/cellar';

export type QuestionAnswer = { picks: string[]; note: string };

/** Old prose answers remain readable; new choices are exact values, never inferred from a note. */
export function questionAnswer(input: string | QuestionAnswer, options: readonly string[]) {
  if (typeof input === 'string') {
    const answer = input.trim();
    if (!answer || answer.length > 8000) throw new Error('Answer must contain 1–8000 characters.');
    return { answer, answer_picks: null, answer_note: null };
  }
  if (!Array.isArray(input.picks) || input.picks.length > 8 || input.picks.some((pick) => typeof pick !== 'string' || !options.includes(pick))) {
    throw new Error('Each pick must exactly match an offered option (up to 8).');
  }
  const picks = [...new Set(input.picks)];
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  const answer = composeAnswer(picks, note);
  if (!answer || answer.length > 8000) throw new Error('Answer must contain 1–8000 characters.');
  return { answer, answer_picks: picks, answer_note: note || null };
}

export function answerPicks(question: Pick<EntryQuestion, 'answer' | 'options' | 'answerPicks'>): string[] {
  return question.answerPicks ?? pickedOptions(question.answer, question.options);
}
