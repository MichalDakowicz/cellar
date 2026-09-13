import { isEntryState } from '@/lib/entryState';
import { isKind } from '@/lib/kinds';
import { supabase } from '@/lib/supabase';
import type { Entry, EntryLine, Kind, Project, Shelf } from '@/types/cellar';

/**
 * The single read boundary. Every `cellar_*` row enters the app through a
 * `normalize*` here and nothing downstream ever branches on a raw column name
 * or a legacy shape (PING.md §13).
 *
 * No React import — this is the transport, not a hook.
 */

type ShelfRow = { id: string; name: string; position: number; created_at: string };
type ProjectRow = { id: string; shelf_id: string; name: string; position: number; created_at: string };
type LineRow = { id: string; text: string; created_at: string };
type EntryRow = {
  id: string;
  project_id: string | null;
  text: string;
  kind: string;
  state: string;
  archived: boolean;
  created_at: string;
  cellar_entry_lines: LineRow[] | null;
};

export function normalizeShelf(row: ShelfRow): Shelf {
  return { id: row.id, name: row.name, position: row.position, createdAt: row.created_at };
}

export function normalizeProject(row: ProjectRow): Project {
  return {
    id: row.id,
    shelfId: row.shelf_id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
  };
}

function normalizeLine(row: LineRow): EntryLine {
  return { id: row.id, text: row.text, createdAt: row.created_at };
}

export function normalizeEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    projectId: row.project_id,
    text: row.text,
    // A kind or state the app does not know falls back rather than rendering as
    // a blank chip. Both columns are text so a future value can land here
    // before this build knows the word for it.
    kind: isKind(row.kind) ? row.kind : 'idea',
    state: isEntryState(row.state) ? row.state : 'open',
    archived: row.archived,
    createdAt: row.created_at,
    lines: (row.cellar_entry_lines ?? []).map(normalizeLine).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

const ENTRY_COLUMNS = 'id, project_id, text, kind, state, archived, created_at, cellar_entry_lines(id, text, created_at)';

export async function fetchShelves(): Promise<Shelf[]> {
  // Seeds "apps" and "side projects" on a brand new cellar. Called on the read
  // rather than from a signup trigger, because Radar owns signup and a new
  // Cellar user may have had the account for a year.
  const { error: seedError } = await supabase.rpc('cellar_seed_shelves');
  if (seedError) throw seedError;

  const { data, error } = await supabase
    .from('cellar_shelves')
    .select('id, name, position, created_at')
    .order('position')
    .order('created_at');
  if (error) throw error;
  return (data as ShelfRow[]).map(normalizeShelf);
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('cellar_projects')
    .select('id, shelf_id, name, position, created_at')
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
    .select('id, name, position, created_at')
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
    .select('id, shelf_id, name, position, created_at')
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}

export async function deleteProject(id: string): Promise<void> {
  // The entries survive: `project_id` is `on delete set null`, so they land
  // back in the inbox rather than going with the project.
  const { error } = await supabase.from('cellar_projects').delete().eq('id', id);
  if (error) throw error;
}

export type NewEntry = { text: string; kind: Kind; projectId: string | null };

/** One insert for a whole raw dump — many lines in, many entries out, one round trip. */
export async function createEntries(userId: string, entries: NewEntry[]): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('cellar_entries')
    .insert(entries.map((e) => ({ user_id: userId, text: e.text, kind: e.kind, project_id: e.projectId })))
    .select(ENTRY_COLUMNS);
  if (error) throw error;
  return (data as EntryRow[]).map(normalizeEntry);
}

export type EntryPatch = Partial<Pick<Entry, 'kind' | 'state' | 'archived' | 'projectId'>>;

export async function patchEntry(id: string, patch: EntryPatch): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.state !== undefined) row.state = patch.state;
  if (patch.archived !== undefined) row.archived = patch.archived;
  if (patch.projectId !== undefined) row.project_id = patch.projectId;
  const { error } = await supabase.from('cellar_entries').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function appendLine(userId: string, entryId: string, text: string): Promise<EntryLine> {
  const { data, error } = await supabase
    .from('cellar_entry_lines')
    .insert({ user_id: userId, entry_id: entryId, text })
    .select('id, text, created_at')
    .single();
  if (error) throw error;
  return normalizeLine(data as LineRow);
}
