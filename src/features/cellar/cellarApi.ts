import {
  AGENT_TOKEN_COLUMNS,
  ENTRY_COLUMNS,
  LINE_COLUMNS,
  normalizeAgentToken,
  normalizeEntry,
  normalizeLine,
  normalizeProject,
  normalizeQuestion,
  normalizeShelf,
  PROJECT_COLUMNS,
  QUESTION_COLUMNS,
  SHELF_COLUMNS,
  type AgentTokenRow,
  type EntryRow,
  type LineRow,
  type ProjectRow,
  type QuestionRow,
  type ShelfRow,
} from '@/lib/rows';
import { supabase } from '@/lib/supabase';
import type {
  AgentToken,
  AnsweredVia,
  Entry,
  EntryLine,
  EntryQuestion,
  Kind,
  LineSource,
  Project,
  Shelf,
} from '@/types/cellar';

/**
 * Every query the app makes, and nothing else.
 *
 * The row shapes and their normalizers live in `lib/rows.ts` — the MCP server
 * reads the same tables and has to produce the same objects, and it cannot
 * import this file because this file holds the client.
 *
 * No React import — this is the transport, not a hook.
 */

export async function fetchShelves(): Promise<Shelf[]> {
  // Seeds "apps" and "side projects" on a brand new cellar. Called on the read
  // rather than from a signup trigger, because Radar owns signup and a new
  // Cellar user may have had the account for a year.
  const { error: seedError } = await supabase.rpc('cellar_seed_shelves');
  if (seedError) throw seedError;

  const { data, error } = await supabase
    .from('cellar_shelves')
    .select(SHELF_COLUMNS)
    .order('position')
    .order('created_at');
  if (error) throw error;
  return (data as ShelfRow[]).map(normalizeShelf);
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('cellar_projects')
    .select(`${PROJECT_COLUMNS}, icon`)
    .order('position')
    .order('created_at');
  if (error) throw error;
  return (data as ProjectRow[]).map(normalizeProject);
}

/**
 * The whole cellar in one read.
 *
 * It is one user's own one-line thoughts — a heavy user is in the low
 * thousands of rows — and every screen in the app is a different cut of the
 * same set: the shelf counts them, stats tallies them, search scans them, the
 * inbox is the ones with no project. Paging this would mean five queries that
 * disagree with each other about the same number.
 */
export async function fetchEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('cellar_entries')
    .select(ENTRY_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as EntryRow[]).map(normalizeEntry);
}

export async function createShelf(userId: string, name: string, position: number): Promise<Shelf> {
  const { data, error } = await supabase
    .from('cellar_shelves')
    .insert({ user_id: userId, name, position })
    .select(SHELF_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeShelf(data as ShelfRow);
}

export async function createProject(
  userId: string,
  shelfId: string,
  name: string,
  position: number,
): Promise<Project> {
  const { data, error } = await supabase
    .from('cellar_projects')
    .insert({ user_id: userId, shelf_id: shelfId, name, position })
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}

export async function renameShelf(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('cellar_shelves').update({ name }).eq('id', id);
  if (error) throw error;
}

/**
 * Projects cascade with the shelf, and their entries then fall to the inbox
 * through `project_id`'s own `on delete set null` — Postgres chains the two, so
 * one delete here loses a container and nothing that was in it.
 */
export async function deleteShelf(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_shelves').delete().eq('id', id);
  if (error) throw error;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('cellar_projects').update({ name }).eq('id', id);
  if (error) throw error;
}

/**
 * Where the project lives. Both halves are set together because the edit sheet
 * holds them as one form, and a partial write would let a cleared field come
 * back on the next save.
 */
export async function setProjectRepo(
  id: string,
  repo: { repoPath: string | null; repoUrl: string | null },
): Promise<void> {
  const { error } = await supabase
    .from('cellar_projects')
    .update({ repo_path: repo.repoPath, repo_url: repo.repoUrl })
    .eq('id', id);
  if (error) throw error;
}

/** Moves a project to another shelf. The entries do not move — they are the project's. */
/** A new icon, or `null` to take it off. Already cut to size (`lib/projectIcon`). */
export async function setProjectIcon(id: string, icon: string | null): Promise<void> {
  const { error } = await supabase.from('cellar_projects').update({ icon }).eq('id', id);
  if (error) throw error;
}

export async function moveProject(id: string, shelfId: string): Promise<void> {
  const { error } = await supabase.from('cellar_projects').update({ shelf_id: shelfId }).eq('id', id);
  if (error) throw error;
}

export async function deleteProject(id: string): Promise<void> {
  // The entries survive: `project_id` is `on delete set null`, so they land
  // back in the inbox rather than going with the project.
  const { error } = await supabase.from('cellar_projects').delete().eq('id', id);
  if (error) throw error;
}

export type NewEntry = { text: string; kind: Kind; projectId: string | null };

/** A thought and the notes typed under it, which is what a normal dump is now. */
export type NewDrop = NewEntry & { lines: string[] };

/** One insert for a whole raw dump — many lines in, many entries out, one round trip. */
export async function createEntries(userId: string, entries: NewEntry[]): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('cellar_entries')
    .insert(entries.map((e) => ({ user_id: userId, text: e.text, kind: e.kind, project_id: e.projectId })))
    .select(ENTRY_COLUMNS);
  if (error) throw error;
  return (data as EntryRow[]).map(normalizeEntry);
}

/**
 * A whole dump, however many entries and notes it turned out to be.
 *
 * Entries with no notes go in one insert, because that is the raw dump and it
 * is forty rows on a bad day. An entry that *has* notes is inserted on its own
 * so its lines can be hung off the id that comes back — there is at most one of
 * those per dump, since only normal mode makes them.
 */
export async function dropEntries(userId: string, drops: NewDrop[]): Promise<void> {
  const plain = drops.filter((drop) => drop.lines.length === 0);
  if (plain.length > 0) await createEntries(userId, plain);

  for (const drop of drops.filter((candidate) => candidate.lines.length > 0)) {
    const [entry] = await createEntries(userId, [drop]);
    await appendNotes(userId, entry.id, drop.lines);
  }
}

/**
 * The notes under a thought, in the order they were typed.
 *
 * Stamped a millisecond apart rather than left to the column default. A thread
 * is ordered by `created_at` alone (lib/rows), and every row of one insert gets
 * the same transaction timestamp — so a batch would come back in whatever order
 * the read felt like, which for "a title with the detail under it" is the one
 * thing that must not happen.
 */
async function appendNotes(userId: string, entryId: string, texts: string[]): Promise<void> {
  const start = Date.now();
  const { error } = await supabase.from('cellar_entry_lines').insert(
    texts.map((text, index) => ({
      user_id: userId,
      entry_id: entryId,
      text,
      source: 'user' as const,
      created_at: new Date(start + index).toISOString(),
    })),
  );
  if (error) throw error;
}

export type EntryPatch = Partial<Pick<Entry, 'kind' | 'state' | 'archived' | 'projectId' | 'agent'>>;

export async function patchEntry(id: string, patch: EntryPatch): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.archived !== undefined) row.archived = patch.archived;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  if (patch.agent !== undefined) row.agent = patch.agent;
  const { error } = await supabase.from('cellar_entries').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function appendLine(
  userId: string,
  entryId: string,
  text: string,
  source: LineSource = 'user',
  /**
   * Only ever set by undo, which is putting a line back where it was. The
   * thread is ordered by this, so restoring with `now()` would drop the line at
   * the bottom and quietly rewrite when it was thought.
   */
  createdAt?: string,
): Promise<EntryLine> {
  const { data, error } = await supabase
    .from('cellar_entry_lines')
    .insert({ user_id: userId, entry_id: entryId, text, source, ...(createdAt ? { created_at: createdAt } : null) })
    .select(LINE_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeLine(data as LineRow);
}

/**
 * Takes a line off an entry.
 *
 * The one destructive write below entry level, and it exists because a line
 * dumped into the wrong thought otherwise sits there forever — the thought
 * itself is immutable on purpose, its lines are not the same promise. The
 * screen confirms first and keeps the row in memory for undo until you leave.
 */
export async function deleteLine(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_entry_lines').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Answering a question an agent asked.
 *
 * The stamp is set here rather than by a default, because the same row is
 * written a second time when you change your mind — and `answered_at` is what
 * the status is read from, so it has to move with the answer.
 */
export async function answerQuestion(
  id: string,
  answer: string,
  via: AnsweredVia = 'app',
): Promise<EntryQuestion> {
  const { data, error } = await supabase
    .from('cellar_entry_questions')
    .update({ answer, answered_at: new Date().toISOString(), answered_via: via })
    .eq('id', id)
    .select(QUESTION_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeQuestion(data as QuestionRow);
}

/**
 * Waved off. The question stays — it is still the record that something was
 * asked, and what you did about it was nothing.
 */
export async function dismissQuestion(id: string): Promise<void> {
  const { error } = await supabase
    .from('cellar_entry_questions')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Agent tokens.
 *
 * Minting is an RPC rather than an insert because the token is generated in the
 * database: the plaintext is the function's return value and the row only ever
 * holds its hash, so there is no moment where the app could write one down.
 */
export async function fetchAgentTokens(): Promise<AgentToken[]> {
  const { data, error } = await supabase
    .from('cellar_agent_tokens')
    .select(AGENT_TOKEN_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as AgentTokenRow[]).map(normalizeAgentToken);
}

/** Returns the plaintext token. The only time it exists outside an agent's config. */
export async function createAgentToken(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('cellar_create_agent_token', { p_name: name });
  if (error) throw error;
  return data as string;
}

/** Stamped, not deleted — the row is the record that the machine ever had access. */
export async function revokeAgentToken(id: string): Promise<void> {
  const { error } = await supabase
    .from('cellar_agent_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
