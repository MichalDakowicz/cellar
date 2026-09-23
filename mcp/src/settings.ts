import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The one thing on the settings row an agent is told: may it test on the phone.
 *
 * Read, never written — how the user's own app behaves is theirs to set. A
 * missing row or a failed read is `null`, which `deviceRule` reads as no.
 */
export async function loadAgentDevice(client: SupabaseClient): Promise<boolean | null> {
  const { data, error } = await client.from('cellar_settings').select('agent_device').maybeSingle();
  if (error || !data) return null;
  return (data as { agent_device: boolean | null }).agent_device ?? null;
}
