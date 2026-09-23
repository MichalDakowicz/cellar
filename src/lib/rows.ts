import { normalizeOptions } from '@/lib/entryQuestions';
import { isEntryState } from '@/lib/entryState';
import type { NewTrailEvent, TrailEvent } from '@/lib/entryTrail';
import { importanceOf } from '@/lib/importance';
import { isKind } from '@/lib/kinds';
import { iconOf } from '@/lib/projectIcon';
import type { AgentToken, Entry, EntryLine, EntryQuestion, Project, Shelf } from '@/types/cellar';

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
  pinned?: boolean | null;
  icon?: string | null;
};

export type LineRow = { id: string; text: string; created_at: string; source: string | null };

export type QuestionRow = {
  id: string;
  question: string;
  options: unknown;
  answer: string | null;
  answered_at: string | null;
  answered_via: string | null;
  dismissed_at: string | null;
  agent: string | null;
  created_at: string;
};

export type EntryRow = {
  id: string;
  project_id: string | null;
  text: string;
  kind: string;
  state: string;
  importance?: string | null;
  position?: number | null;
  archived: boolean;
  created_at: string;
  agent: string | null;
  cellar_entry_lines: LineRow[] | null;
  cellar_entry_questions: QuestionRow[] | null;
  cellar_entry_docs?: DocRow[] | null;
};

export type DocRow = { id: string; ref: string; label: string | null; created_at: string };

export const SHELF_COLUMNS = 'id, name, position, created_at';
export const LINE_COLUMNS = 'id, text, created_at, source';
export const PROJECT_COLUMNS = 'id, shelf_id, name, position, created_at, repo_path, repo_url, pinned';
// `as const` on both, and the embed built as a template literal, so the select
// string keeps its literal type: supabase-js resolves the row shape from it at
// compile time, and a widened `string` makes every `.select(ENTRY_COLUMNS)` in
// the app infer `GenericStringError[]` instead.
export const QUESTION_COLUMNS =
  'id, question, options, answer, answered_at, answered_via, dismissed_at, agent, created_at' as const;
export const ENTRY_COLUMNS =
  `id, project_id, text, kind, state, importance, position, archived, created_at, agent, cellar_entry_lines(id, text, created_at, source), cellar_entry_questions(${QUESTION_COLUMNS}), cellar_entry_docs(id, ref, label, created_at)` as const;

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
    pinned: row.pinned === true,
    ...(row.icon !== undefined ? { icon: iconOf(row.icon) } : null),
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

/**
 * `options` arrives as whatever jsonb holds, so it goes through the same
 * normalizer the writer uses rather than being trusted as `string[]` — a row
 * written by hand in the dashboard is a perfectly ordinary way for this to be
 * an object.
 */
export function normalizeQuestion(row: QuestionRow): EntryQuestion {
  return {
    id: row.id,
    question: row.question,
    options: normalizeOptions(row.options),
    answer: row.answer,
    answeredAt: row.answered_at,
    answeredVia: row.answered_via === 'chat' ? 'chat' : row.answered_via ? 'app' : null,
    dismissedAt: row.dismissed_at,
    agent: row.agent,
    createdAt: row.created_at,
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
    importance: importanceOf(row.importance),
    position: row.position ?? 0,
    archived: row.archived,
    createdAt: row.created_at,
    agent: row.agent,
    lines: (row.cellar_entry_lines ?? []).map(normalizeLine).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    questions: (row.cellar_entry_questions ?? [])
      .map(normalizeQuestion)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    docs: (row.cellar_entry_docs ?? [])
      .map((doc) => ({ id: doc.id, ref: doc.ref, label: doc.label, createdAt: doc.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

export type AgentTokenRow = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

/**
 * `token_hash` is deliberately not on this list. Nothing in the app has a use
 * for it, and a column you never select is a column that cannot end up in a
 * log, a cache or a redux devtools panel.
 */
export const AGENT_TOKEN_COLUMNS = 'id, name, created_at, last_used_at, expires_at, revoked_at';

export function normalizeAgentToken(row: AgentTokenRow): AgentToken {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

export type EventRow = {
  id: string;
  what: string;
  from_value: string | null;
  to_value: string | null;
  source: string | null;
  agent: string | null;
  at: string;
};

export const EVENT_COLUMNS = 'id, what, from_value, to_value, source, agent, at';

export function normalizeEvent(row: EventRow): TrailEvent {
  return {
    id: row.id,
    what: row.what,
    fromValue: row.from_value,
    toValue: row.to_value,
    source: row.source === 'agent' ? 'agent' : 'user',
    agent: row.agent,
    at: row.at,
  };
}

/** A move as the insert wants it. `at` is the database's clock, never the writer's. */
export function eventInsert(userId: string, entryId: string, event: NewTrailEvent) {
  return {
    user_id: userId,
    entry_id: entryId,
    what: event.what,
    from_value: event.fromValue,
    to_value: event.toValue,
    source: event.source,
    agent: event.agent,
  };
}
