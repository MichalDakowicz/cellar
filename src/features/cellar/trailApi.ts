import type { NewTrailEvent, TrailEvent } from '@/lib/entryTrail';
import { EVENT_COLUMNS, eventInsert, normalizeEvent, type EventRow } from '@/lib/rows';
import { supabase } from '@/lib/supabase';

/**
 * The trail's two queries. Kept out of `cellarApi.ts`, which is the whole
 * cellar in one read — the trail is read one entry at a time, when that entry
 * is open, and nowhere else wants it.
 */

export async function fetchEntryEvents(entryId: string): Promise<TrailEvent[]> {
  const { data, error } = await supabase
    .from('cellar_entry_events')
    .select(EVENT_COLUMNS)
    .eq('entry_id', entryId)
    .order('at');
  if (error) throw error;
  return (data as EventRow[]).map(normalizeEvent);
}

/**
 * Best effort, after the write it describes: a gap in the history is a lesser
 * failure than a state change refused because its history could not be written
 * (`mcp/src/cellar.ts` logMoves makes the same call).
 */
export async function logEvents(userId: string, entryId: string, events: NewTrailEvent[]): Promise<void> {
  if (events.length === 0) return;
  const { error } = await supabase
    .from('cellar_entry_events')
    .insert(events.map((event) => eventInsert(userId, entryId, event)));
  if (error) console.warn('Could not write the trail for', entryId, error.message);
}
