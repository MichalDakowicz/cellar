import {
  AGENT_TOKEN_COLUMNS,
  normalizeAgentToken,
  type AgentTokenRow,
} from "@/lib/rows";
import type { AgentToken } from "@/types/cellar";
import { supabase } from "../auth";
/**
 * Agent tokens.
 *
 * Minting is an RPC rather than an insert because the token is generated in the
 * database: the plaintext is the function's return value and the row only ever
 * holds its hash, so there is no moment where the app could write one down.
 */
export async function fetchAgentTokens(): Promise<AgentToken[]> {
  const { data, error } = await supabase
    .from("cellar_agent_tokens")
    .select(AGENT_TOKEN_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AgentTokenRow[]).map(normalizeAgentToken);
}

/** Returns the plaintext token. The only time it exists outside an agent's config. */
export async function createAgentToken(name: string): Promise<string> {
  const { data, error } = await supabase.rpc("cellar_create_agent_token", {
    p_name: name,
  });
  if (error) throw error;
  return data as string;
}

/** Stamped, not deleted — the row is the record that the machine ever had access. */
export async function revokeAgentToken(id: string): Promise<void> {
  const { error } = await supabase
    .from("cellar_agent_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
