import { oneLine } from '@/lib/dump';

/**
 * Rewording a thought after it was dropped.
 *
 * A thought is one line — a return in the field is a space here, the way it is
 * on the capture screen, so editing cannot grow a thought into a paragraph. The
 * old wording is not lost: the trail logs the edit with what it said before
 * (`lib/entryTrail`), which is what keeps "what I thought then" readable.
 */

export type ThoughtCheck =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty' | 'unchanged'; message: string };

export function checkThought(input: string, current: string): ThoughtCheck {
  const text = oneLine(input);
  if (!text) return { ok: false, reason: 'empty', message: 'a thought needs some words' };
  if (text === current) return { ok: false, reason: 'unchanged', message: 'nothing is different yet' };
  return { ok: true, text };
}
