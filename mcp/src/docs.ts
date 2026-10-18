import type { SupabaseClient } from '@supabase/supabase-js';
import { isDuplicateDoc, normalizeDocRef } from '@/lib/entryDocs';
import type { Entry, EntryDoc } from '@/types/cellar';

export async function attachDoc(
  client: SupabaseClient, userId: string, entry: Entry, input: { ref: string; label?: string },
): Promise<{ doc: EntryDoc; added: boolean }> {
  const ref = normalizeDocRef(input.ref);
  if (!ref) throw new Error('A document link or repo path is required.');
  const existing = entry.docs.find((doc) => isDuplicateDoc(ref, [doc]));
  if (existing) return { doc: existing, added: false };
  const { data, error } = await client.from('cellar_entry_docs').insert({
    user_id: userId, entry_id: entry.id, ref, label: input.label?.trim() || null,
  }).select('id, ref, label, created_at').single();
  if (error) throw error;
  return { doc: { id: data.id, ref: data.ref, label: data.label, createdAt: data.created_at }, added: true };
}
