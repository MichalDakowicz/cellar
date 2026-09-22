import type { SupabaseClient } from '@supabase/supabase-js';

import {
  normalizeProject,
  normalizeShelf,
  PROJECT_COLUMNS,
  SHELF_COLUMNS,
  type ProjectRow,
  type ShelfRow,
} from '@/lib/rows';
import type { Project, Shelf } from '@/types/cellar';

/**
 * The two containers, written rather than only read.
 *
 * Its own file rather than more of `cellar.ts`, because everything in there is
 * about a thought and everything here is about the thing a thought sits in.
 *
 * The same rule holds as everywhere else on this server: **nothing here
 * deletes.** A shelf carries its projects and a project carries its thoughts,
 * so deleting one is the largest destructive act in the app — it is the user's
 * to make, in the app, having been shown what it costs (`lib/containers`).
 * Renaming and moving is the whole of what an agent needs to tidy up.
 */

/**
 * A shelf by id, by short id, or by name — the same three ways a project
 * resolves, so the two arguments behave alike.
 */
export function resolveShelf(ref: string, shelves: Shelf[]): Shelf {
  const needle = ref.trim().toLowerCase();
  if (!needle) throw new Error('No shelf given.');

  const byId = shelves.find((shelf) => shelf.id === needle || shelf.id.startsWith(needle));
  if (byId) return byId;

  const named = shelves.filter((shelf) => shelf.name.toLowerCase() === needle);
  if (named.length === 1) return named[0];

  const partial = shelves.filter((shelf) => shelf.name.toLowerCase().includes(needle));
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    throw new Error(`"${ref}" matches ${partial.map((shelf) => shelf.name).join(', ')}. Be exact.`);
  }
  throw new Error(`No shelf called "${ref}".`);
}

export async function createShelf(client: SupabaseClient, userId: string, name: string, position: number): Promise<Shelf> {
  const { data, error } = await client
    .from('cellar_shelves')
    .insert({ user_id: userId, name, position })
    .select(SHELF_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeShelf(data as ShelfRow);
}

export async function renameShelf(client: SupabaseClient, id: string, name: string): Promise<Shelf> {
  const { data, error } = await client
    .from('cellar_shelves')
    .update({ name })
    .eq('id', id)
    .select(SHELF_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeShelf(data as ShelfRow);
}

export async function createProject(
  client: SupabaseClient,
  userId: string,
  input: { shelfId: string; name: string; position: number; repoPath: string | null; repoUrl: string | null },
): Promise<Project> {
  const { data, error } = await client
    .from('cellar_projects')
    .insert({
      user_id: userId,
      shelf_id: input.shelfId,
      name: input.name,
      position: input.position,
      repo_path: input.repoPath,
      repo_url: input.repoUrl,
    })
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}

export async function renameProject(client: SupabaseClient, id: string, name: string): Promise<Project> {
  const { data, error } = await client
    .from('cellar_projects')
    .update({ name })
    .eq('id', id)
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}

/**
 * Onto another shelf, at the end of it.
 *
 * The position is set rather than left alone: `position` is scoped to a shelf,
 * so a project carrying its old index into a new shelf lands in the middle of
 * it for no reason the user can see.
 */
export async function moveProject(
  client: SupabaseClient,
  id: string,
  shelfId: string,
  position: number,
): Promise<Project> {
  const { data, error } = await client
    .from('cellar_projects')
    .update({ shelf_id: shelfId, position })
    .eq('id', id)
    .select(PROJECT_COLUMNS)
    .single();
  if (error) throw error;
  return normalizeProject(data as ProjectRow);
}
