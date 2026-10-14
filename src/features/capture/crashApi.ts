import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { crashUuid, redactCrash, type DebugCrash } from '@/lib/debugCrashes';
async function id(value: string) { return crashUuid(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value)); }
/** Deterministic IDs make a lost response safe to retry without duplicate thoughts/notes. */
export async function fileDebugCrash(owner: string, crash: DebugCrash) {
  if (crash.owner !== owner) throw new Error('Crash belongs to a different signed-in account.');
  const entryId = await id(`${owner}:crash:${crash.signature}`);
  const text = `cellar debug crash: ${redactCrash(crash.stack).split('\n')[0].slice(0, 180)}`;
  const entry = await supabase.from('cellar_entries').upsert({ id: entryId, user_id: owner, kind: 'glitch', text, project_id: null }, { onConflict: 'id', ignoreDuplicates: true });
  if (entry.error) throw entry.error;
  const lines = [
    `repeated ${crash.count} time${crash.count === 1 ? '' : 's'} · latest ${new Date(crash.at).toISOString()} · debug build`,
    `stack\n${redactCrash(crash.stack)}`, `log\n${redactCrash(crash.log)}`,
  ];
  const rows = await Promise.all(lines.map(async (text, index) => ({ id: await id(`${owner}:${crash.signature}:line:${index}`), entry_id: entryId, user_id: owner, source: 'agent', text })));
  const notes = await supabase.from('cellar_entry_lines').upsert(rows, { onConflict: 'id' }); if (notes.error) throw notes.error;
  if (crash.picture) {
    const picture = await supabase.from('cellar_entry_pictures').upsert({ id: await id(`${owner}:${crash.signature}:picture`), entry_id: entryId, user_id: owner, line_id: null, ...crash.picture }, { onConflict: 'id' });
    if (picture.error) throw picture.error;
  }
  return entryId;
}
