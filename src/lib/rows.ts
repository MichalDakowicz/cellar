import { isEntryState } from '@/lib/entryState';
import { isKind } from '@/lib/kinds';
import type { Entry, EntryLine, Project, Shelf } from '@/types/cellar';

/**
 * The single read boundary: every `cellar_*` row becomes an app type here, and
 * nothing downstream branches on a raw column name or a legacy shape
 * (PING.md §13).
 *
 * It sits in `lib/` rather than beside the queries because the MCP server
 * (`mcp/`) reads the same tables over the same PostgREST and has to end up with
 * the same objects. Two copies of "what a row means" is two apps that disagree
 * about a kind they have not heard of — and this is exactly the file where that
 * kind of rot is invisible until it ships.
 *
 * Pure: the column lists live here, the client that uses them does not.
 */

export type ShelfRow = { id: string; name: string; position: number; created_at: string };

export type ProjectRow = {
  id: string;
  shelf_id: string;
  name: string;
  position: number;
  created_at: string;
  repo_path: string | null;
  repo_url: string | null;
};

export type LineRow = { id: string; text: string; created_at: string; source: string | null };

export type EntryRow = {
  id: string;
  project_id: string | null;
  text: string;
  kind: string;
  state: string;
  archived: boolean;
  created_at: string;
  agent: string | null;
  cellar_entry_lines: LineRow[] | null;
};

export const SHELF_COLUMNS = 'id, name, position, created_at';
export const LINE_COLUMNS = 'id, text, created_at, source';
export const PROJECT_COLUMNS = 'id, shelf_id, name, position, created_at, repo_path, repo_url';
export const ENTRY_COLUMNS =
  'id, project_id, text, kind, state, archived, created_at, agent, cellar_entry_lines(id, text, created_at, source)';

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
    repoPath: row.repo_path,
    repoUrl: row.repo_url,
  };
}

export function normalizeLine(row: LineRow): EntryLine {
  // A line written before the column existed is yours — there was nothing else
  // that could have written it.
  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
    source: row.source === 'agent' ? 'agent' : 'user',
  };
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
    agent: row.agent,
    lines: (row.cellar_entry_lines ?? []).map(normalizeLine).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}
