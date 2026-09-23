import type { SupabaseClient } from '@supabase/supabase-js';

import type { NewTrailEvent } from '@/lib/entryTrail';
import { eventInsert } from '@/lib/rows';

/** Who a move is stamped with, from this server: always an agent, always named. */
export function byAgent(agent: string): { source: 'agent'; agent: string } {
  return { source: 'agent', agent };
}

/**
 * The moves a write made, onto the thought's trail (`lib/entryTrail`).
 *
 * Best effort, and after the write rather than before it: a trail row that
 * failed to land is a gap in the history, but a claim or a finish that failed
 * because its history could not be written is the agent's actual work refused.
 * The write has already happened by the time this runs, so this never throws.
 */
export async function logMoves(
  client: SupabaseClient,
  userId: string,
  entryId: string,
  moves: NewTrailEvent[],
): Promise<void> {
  if (moves.length === 0) return;
  const { error } = await client.from('cellar_entry_events').insert(moves.map((move) => eventInsert(userId, entryId, move)));
  if (error) console.error('Could not write the trail for', entryId, error.message);
}
