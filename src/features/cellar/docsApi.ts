import { supabase } from '@/lib/supabase';

/**
 * Docs on a thought. They ride in on `fetchEntries` as an embed, so there is
 * no read here — only the two writes.
 */

export async function addDoc(userId: string, entryId: string, ref: string): Promise<void> {
  const { error } = await supabase.from('cellar_entry_docs').insert({ user_id: userId, entry_id: entryId, ref });
  if (error) throw error;
}

/** Takes the reference off. The page or the file it pointed at is not touched. */
export async function removeDoc(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_entry_docs').delete().eq('id', id);
  if (error) throw error;
}
