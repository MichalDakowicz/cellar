import type { DeskAgent, DeskRun, DeskStart } from '@/lib/deskProtocol';
import { supabase } from '@/lib/supabase';

/**
 * The pc through the cellar, for when it is not on this network: its
 * heartbeat row, and requests it picks up over realtime
 * (supabase/schema.sql §12; the pc's half is desktop/src/host/fallback.ts).
 */

export type DeskRow = {
  id: string;
  name: string;
  host: string | null;
  port: number | null;
  agents: DeskAgent[];
  runs: DeskRun[];
  seenAt: string;
};

export async function fetchDesks(): Promise<DeskRow[]> {
  const { data, error } = await supabase
    .from('cellar_desks')
    .select('id, name, host, port, agents, runs, seen_at')
    .order('seen_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    host: (row.host as string | null) ?? null,
    port: (row.port as number | null) ?? null,
    agents: (row.agents as DeskAgent[] | null) ?? [],
    runs: Array.isArray(row.runs) ? (row.runs as DeskRun[]) : [],
    seenAt: row.seen_at as string,
  }));
}

type RequestState = { state: 'queued' | 'taken' | 'done' | 'failed'; error: string | null; runId: string | null };

async function readRequest(id: string): Promise<RequestState> {
  const { data, error } = await supabase.from('cellar_desk_requests').select('state, error, run_id').eq('id', id).single();
  if (error) throw error;
  return { state: data.state, error: data.error, runId: data.run_id };
}

const WAIT_MS = 45_000;
const POLL_MS = 1500;

/**
 * Wait for the pc to settle a request. A start through the cellar is a round
 * trip through realtime and then the agent's own start-up, so the answer is
 * polled for. `taken` means the pc has it and is starting it — still waiting,
 * not lost.
 *
 * A request still `queued` when the wait runs out is withdrawn — marked failed
 * only if the pc has not claimed it in the meantime — so a pc that wakes later
 * cannot run something this screen already called a failure.
 */
async function settled(id: string): Promise<string | null> {
  const until = Date.now() + WAIT_MS;
  while (Date.now() < until) {
    const now = await readRequest(id);
    if (now.state === 'done') return now.runId;
    if (now.state === 'failed') throw new Error(now.error ?? 'the pc could not do it');
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  const { data } = await supabase
    .from('cellar_desk_requests')
    .update({ state: 'failed', error: 'withdrawn — the pc did not pick it up' })
    .eq('id', id)
    .eq('state', 'queued')
    .select('id');
  if (data?.length) throw new Error('the pc did not pick it up — it may be asleep. nothing was started.');
  throw new Error('the pc took it but has not said how it went yet — check its runs in a moment');
}

export async function sendStart(deskId: string, start: DeskStart): Promise<string | null> {
  const { data, error } = await supabase
    .from('cellar_desk_requests')
    .insert({
      desk_id: deskId,
      kind: 'start',
      agent: start.agent,
      prompt: start.prompt,
      cwd: start.cwd,
      name: start.name,
      entry_id: start.entryId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return settled(data.id as string);
}

export async function sendStop(deskId: string, runId: string): Promise<void> {
  const { data, error } = await supabase
    .from('cellar_desk_requests')
    .insert({ desk_id: deskId, kind: 'stop', run_id: runId })
    .select('id')
    .single();
  if (error) throw error;
  await settled(data.id as string);
}
