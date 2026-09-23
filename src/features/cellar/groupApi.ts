import { GROUP_COLUMNS, normalizeGroup, type GroupRow } from '@/lib/rows';
import { supabase } from '@/lib/supabase';
import type { Group } from '@/types/cellar';

/**
 * Groups: the read, and the writes that keep a group and its general project
 * in step. Its own file because the general project is the whole trick
 * (`lib/groups.ts`), and every write here has to remember it exists.
 */

export async function fetchGroups(): Promise<Group[]> {
  const { data, error } = await supabase.from('cellar_groups').select(GROUP_COLUMNS).order('position').order('created_at');
  if (error) throw error;
  return (data as GroupRow[]).map(normalizeGroup);
}

/**
 * A group, its general project, and optionally the project it was made from.
 * The general project is named after the group — it *is* the group, as far as
 * a thought is concerned — and a project made into a group is moved in with it.
 */
export async function createGroup(
  userId: string,
  input: { shelfId: string; name: string; position: number; withProjectId?: string | null },
): Promise<Group> {
  const { data, error } = await supabase
    .from('cellar_groups')
    .insert({ user_id: userId, shelf_id: input.shelfId, name: input.name, position: input.position })
    .select(GROUP_COLUMNS)
    .single();
  if (error) throw error;
  const group = normalizeGroup(data as GroupRow);

  const home = await supabase.from('cellar_projects').insert({
    user_id: userId,
    shelf_id: input.shelfId,
    name: input.name,
    position: 0,
    group_id: group.id,
    group_home: true,
  });
  if (home.error) throw home.error;

  if (input.withProjectId) await setProjectGroup(input.withProjectId, group.id);
  return group;
}

/** Into a group, or out of one with `null`. The thoughts come with the project. */
export async function setProjectGroup(projectId: string, groupId: string | null): Promise<void> {
  const { error } = await supabase.from('cellar_projects').update({ group_id: groupId }).eq('id', projectId);
  if (error) throw error;
}

/** Renames the group and its general project together, so the two never read as different things. */
export async function renameGroup(id: string, name: string): Promise<void> {
  const group = await supabase.from('cellar_groups').update({ name }).eq('id', id);
  if (group.error) throw group.error;
  const home = await supabase.from('cellar_projects').update({ name }).eq('group_id', id).eq('group_home', true);
  if (home.error) throw home.error;
}

export async function setGroupPinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('cellar_groups').update({ pinned }).eq('id', id);
  if (error) throw error;
}

/**
 * The folder goes; nothing in it does. The general project becomes an ordinary
 * project first — its thoughts are real thoughts — and then the group's delete
 * drops every project back onto the shelf (`on delete set null`).
 */
export async function deleteGroup(id: string): Promise<void> {
  const home = await supabase.from('cellar_projects').update({ group_home: false }).eq('group_id', id);
  if (home.error) throw home.error;
  const { error } = await supabase.from('cellar_groups').delete().eq('id', id);
  if (error) throw error;
}
