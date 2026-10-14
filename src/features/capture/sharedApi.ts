import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { crashUuid } from '@/lib/debugCrashes';
import type { SharedSubmission } from '@/lib/sharedDraft';

/** The durable draft ID and frozen submission make retries safe after a lost reply. */
export async function fileSharedDraft(owner: string, request: SharedSubmission) {
  const entry = { id: request.id, user_id: owner, text: request.title, kind: request.kind, project_id: request.projectId };
  const saved = await supabase.from('cellar_entries').upsert(entry, { onConflict: 'id', ignoreDuplicates: true });
  if (saved.error) throw new Error(saved.error.message);
  const found = await supabase.from('cellar_entries').select('id,user_id,text,kind,project_id').eq('id', request.id).single();
  if (found.error) throw new Error(found.error.message);
  if (found.data.user_id !== owner || found.data.text !== entry.text || found.data.kind !== entry.kind || found.data.project_id !== entry.project_id) throw new Error('Filed thought changed; inspect it before retrying.');
  if (request.lines.length) {
    const rows = await Promise.all(request.lines.map(async (text, index) => ({ id: crashUuid(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${owner}:${request.id}:share-line:${index}`)), user_id: owner, entry_id: request.id, text, source: 'user', created_at: new Date(request.submittedAt + index).toISOString() })));
    const notes = await supabase.from('cellar_entry_lines').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
    if (notes.error) throw new Error(notes.error.message);
  }
  return request.id;
}
