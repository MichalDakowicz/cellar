import type { SupabaseClient } from '@supabase/supabase-js';

import { agentLine } from '@/lib/agentWork';
import { normalizeOptions, unblocksEntry } from '@/lib/entryQuestions';
import { patchEvents } from '@/lib/entryTrail';
import { normalizeQuestion, QUESTION_COLUMNS, type QuestionRow } from '@/lib/rows';
import type { Entry, EntryQuestion } from '@/types/cellar';

import { logMoves } from './trail.ts';

/**
 * The questions an agent puts on a thought, and the answers it writes back.
 * Split from `cellar.ts`, which keeps the reads and the entry writes.
 */

/**
 * Ask, and block the entry.
 *
 * A row rather than a line, so the question keeps the options it offered and
 * can hold the answer that settles it. The entry goes `blocked` the moment the
 * question lands — not when the session ends — because a question nobody has
 * been told about is worth nothing, and a session that dies between the two
 * would take it with it.
 *
 * Several questions may be outstanding on one entry. It comes off `blocked`
 * when the last of them is answered or waved off, which the app does when you
 * answer in it and `answerQuestion` does when an agent writes a chat answer
 * back.
 */
export async function askQuestion(
  client: SupabaseClient,
  userId: string,
  entryId: string,
  input: { question: string; options: string[]; agent: string },
): Promise<EntryQuestion> {
  const question = agentLine(input.question);
  if (!question) throw new Error('Nothing to ask — the question was empty once collapsed.');

  const { data, error } = await client
    .from('cellar_entry_questions')
    .insert({
      user_id: userId,
      entry_id: entryId,
      question,
      options: normalizeOptions(input.options),
      agent: input.agent,
    })
    .select(QUESTION_COLUMNS)
    .single();
  if (error) throw error;

  await client.from('cellar_entries').update({ state: 'blocked', agent: input.agent }).eq('id', entryId);
  return normalizeQuestion(data as QuestionRow);
}

/** A question by id or by the short id the brief prints. */
export function resolveQuestion(ref: string, questions: EntryQuestion[]): EntryQuestion {
  const needle = ref.trim().toLowerCase();
  if (!needle) throw new Error('No question id given.');

  const exact = questions.find((question) => question.id === needle);
  if (exact) return exact;

  const hits = questions.filter((question) => question.id.startsWith(needle));
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error(`No question on this entry with id starting "${ref}".`);
  throw new Error(`"${ref}" matches ${hits.length} questions. Use more of the id.`);
}

/**
 * Write back an answer the user gave somewhere else.
 *
 * `answered_via` is 'chat' and not negotiable from here: the app is the only
 * thing that writes 'app', so an answer arriving through this server is by
 * definition one the agent went and asked for. Unblocks the entry if this was
 * the last question outstanding, the same rule the app applies.
 */
export async function answerQuestion(
  client: SupabaseClient,
  who: { userId: string; agent: string },
  entry: Entry,
  questionId: string,
  answer: string,
): Promise<EntryQuestion> {
  const body = agentLine(answer);
  if (!body) throw new Error('Nothing to record — the answer was empty once collapsed.');

  const { data, error } = await client
    .from('cellar_entry_questions')
    .update({ answer: body, answered_at: new Date().toISOString(), answered_via: 'chat' })
    .eq('id', questionId)
    .select(QUESTION_COLUMNS)
    .single();
  if (error) throw error;

  if (entry.state === 'blocked' && unblocksEntry(entry.questions, questionId)) {
    await client.from('cellar_entries').update({ state: 'open', agent: null }).eq('id', entry.id);
    await logMoves(client, who.userId, entry.id, patchEvents(entry, { state: 'open' }, { source: 'agent', agent: who.agent }));
  }
  return normalizeQuestion(data as QuestionRow);
}
