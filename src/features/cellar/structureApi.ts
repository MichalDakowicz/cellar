import {
  normalizeProject,
  normalizeShelf,
  PROJECT_COLUMNS,
  SHELF_COLUMNS,
  type ProjectRow,
  type ShelfRow,
} from '@/lib/rows';
import { supabase } from '@/lib/supabase';
import type { Project, Shelf } from '@/types/cellar';

/**
 * The writes that shape the cellar rather than fill it: shelves and projects.
 *
 * Split from `cellarApi.ts`, which keeps the reads and the entry writes, so
 * neither file has to hold every query the app makes. Same rule as there — no
 * React, this is the transport.
 */

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

/**
 * Pinning sorts a project first on its shelf and in file it — `pinnedFirst` in
 * `lib/projectOrder.ts` does the sorting, as the list is read.
 */
export async function setProjectPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('cellar_projects').update({ pinned }).eq('id', id);
  if (error) throw error;
}
