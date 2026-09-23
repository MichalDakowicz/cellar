import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ENTRY_COLUMNS,
  normalizeEntry,
  normalizeProject,
  normalizeShelf,
  PROJECT_COLUMNS,
  SHELF_COLUMNS,
  type EntryRow,
  type ProjectRow,
  type ShelfRow,
} from '@/lib/rows';
import type { Entry, EntryState, Kind, Project, Shelf } from '@/types/cellar';

import { bareProjectId } from '@/lib/agentPrompt';
import { agentLine } from '@/lib/agentWork';

/**
 * Every query this server makes.
 *
 * The normalizers and the column lists come from the app's own `lib/rows.ts`,
 * so a row means the same thing here as it does on the phone. What is *not*
 * shared is the client — the app's is built on AsyncStorage and react-native's
 * AppState, neither of which exists in node.
 *
 * Two rules the tools rely on and this file enforces:
 *
 *   1. Claiming is atomic. The update is conditional on the entry still being
 *      open, so two agents racing for the same thought cannot both win it.
 *   2. Nothing here deletes. There is no delete function to call; the strongest
 *      thing an agent can do to a thought is archive it, and that comes back.
 *
 * Asking and answering are `questions.ts`; the trail's writes are `trail.ts`.
 */

export type Cellar = { shelves: Shelf[]; projects: Project[]; entries: Entry[] };

export async function loadCellar(client: SupabaseClient): Promise<Cellar> {
  // The seed is called for the same reason the app calls it on every read: a
  // brand new cellar has no shelves, and an agent is a perfectly plausible
  // first thing to touch one.
  await client.rpc('cellar_seed_shelves');

  const [shelves, projects, entries] = await Promise.all([
    client.from('cellar_shelves').select(SHELF_COLUMNS).order('position').order('created_at'),
    client.from('cellar_projects').select(PROJECT_COLUMNS).order('position').order('created_at'),
    client.from('cellar_entries').select(ENTRY_COLUMNS).order('created_at', { ascending: false }),
  ]);

  const failure = shelves.error ?? projects.error ?? entries.error;
  if (failure) throw failure;

  return {
    shelves: (shelves.data as ShelfRow[]).map(normalizeShelf),
    projects: (projects.data as ProjectRow[]).map(normalizeProject),
    entries: (entries.data as EntryRow[]).map(normalizeEntry),
  };
}

/**
 * An entry by id, or by the short id the tools print.
 *
 * Output carries eight characters instead of a full uuid — the ids are only
 * ever copied from one tool result into the next argument, and thirty-six
 * characters of hex per row is a real cost across a list of forty. A prefix
 * that matches two entries is rejected rather than guessed.
 */
export function resolveEntry(ref: string, entries: Entry[]): Entry {
  const needle = ref.trim().toLowerCase();
  if (!needle) throw new Error('No entry id given.');

  const exact = entries.find((entry) => entry.id === needle);
  if (exact) return exact;

  const hits = entries.filter((entry) => entry.id.startsWith(needle));
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) throw new Error(`No entry with id starting "${ref}".`);
  throw new Error(`"${ref}" matches ${hits.length} entries. Use more of the id.`);
}

/**
 * A project by id, by short id, or by name. `inbox` and `all` are the caller's job.
 *
 * The id may arrive wearing the `p-` the app prints, and the prefix is stripped
 * for the id match only — names are matched against what was actually typed, so
 * a project someone called `p-old` is still findable by its name.
 */
export function resolveProject(ref: string, projects: Project[]): Project {
  const needle = ref.trim().toLowerCase();
  if (!needle) throw new Error('No project given.');

  const id = bareProjectId(needle);
  const byId = id ? projects.find((project) => project.id === id || project.id.startsWith(id)) : undefined;
  if (byId) return byId;

  const named = projects.filter((project) => project.name.toLowerCase() === needle);
  if (named.length === 1) return named[0];

  const partial = projects.filter((project) => project.name.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error(`"${ref}" matches ${partial.map((project) => project.name).join(', ')}. Be exact.`);
  }
  throw new Error(`No project called "${ref}".`);
}

async function refetch(client: SupabaseClient, id: string): Promise<Entry> {
  const { data, error } = await client.from('cellar_entries').select(ENTRY_COLUMNS).eq('id', id).single();
  if (error) throw error;
  return normalizeEntry(data as EntryRow);
}

/**
 * Take an open entry, or fail saying who has it.
 *
 * Conditional on `state = 'open'`: PostgREST turns that into one `update ...
 * where`, so the check and the write are the same statement and there is no
 * window between them. Zero rows back means someone else got there first.
 */
export async function claimEntry(
  client: SupabaseClient,
  entry: Entry,
  agent: string,
): Promise<{ ok: true; entry: Entry } | { ok: false; entry: Entry }> {
  const { data, error } = await client
    .from('cellar_entries')
    .update({ state: 'doing', agent })
    .eq('id', entry.id)
    .eq('state', 'open')
    .eq('archived', false)
    .select(ENTRY_COLUMNS);
  if (error) throw error;

  const rows = (data ?? []) as EntryRow[];
  if (rows.length === 0) return { ok: false, entry: await refetch(client, entry.id) };
  return { ok: true, entry: normalizeEntry(rows[0]) };
}

/** A report line. Always `source = 'agent'`, always one line — see `agentLine`. */
export async function addAgentLine(
  client: SupabaseClient,
  userId: string,
  entryId: string,
  text: string,
): Promise<string> {
  const line = agentLine(text);
  if (!line) throw new Error('Nothing to write — the line was empty once collapsed.');

  const { error } = await client
    .from('cellar_entry_lines')
    .insert({ user_id: userId, entry_id: entryId, text: line, source: 'agent' });
  if (error) throw error;
  return line;
}

export async function setEntryState(
  client: SupabaseClient,
  entryId: string,
  state: EntryState,
  agent: string | null,
): Promise<Entry> {
  const { error } = await client.from('cellar_entries').update({ state, agent }).eq('id', entryId);
  if (error) throw error;
  return refetch(client, entryId);
}

/** Writes a `reopenPlan` patch. The plan decides; this only carries it. */
export async function reopenEntry(
  client: SupabaseClient,
  entryId: string,
  patch: { state: EntryState; agent: string | null; archived: false },
): Promise<Entry> {
  const { error } = await client.from('cellar_entries').update(patch).eq('id', entryId);
  if (error) throw error;
  return refetch(client, entryId);
}

export async function archiveEntry(client: SupabaseClient, entryId: string): Promise<Entry> {
  const { error } = await client.from('cellar_entries').update({ archived: true }).eq('id', entryId);
  if (error) throw error;
  return refetch(client, entryId);
}

export async function createEntry(
  client: SupabaseClient,
  userId: string,
  input: { text: string; kind: Kind; projectId: string | null; agent: string },
): Promise<Entry> {
  const { data, error } = await client
    .from('cellar_entries')
    .insert({
      user_id: userId,
      text: agentLine(input.text),
      kind: input.kind,
      project_id: input.projectId,
      // Left open and stamped with who dropped it: an agent's own follow-up is
      // a thought for the user to triage, not work the agent may hand itself.
      state: 'open',
      agent: input.agent,
    })
    .select(ENTRY_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeEntry(data as EntryRow);
}

export async function linkRepo(
  client: SupabaseClient,
  projectId: string,
  repo: { repoPath: string | null; repoUrl: string | null },
): Promise<Project> {
  const { data, error } = await client
    .from('cellar_projects')
    .update({ repo_path: repo.repoPath, repo_url: repo.repoUrl })
    .eq('id', projectId)
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}
