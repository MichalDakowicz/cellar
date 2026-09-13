import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  appendLine,
  createEntries,
  createProject,
  createShelf,
  deleteEntry,
  deleteProject,
  fetchEntries,
  fetchProjects,
  fetchShelves,
  patchEntry,
  type EntryPatch,
  type NewEntry,
} from '@/features/cellar/cellarApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCellarPrefs } from '@/store/cellarPrefs';
import type { Entry, Project, Shelf } from '@/types/cellar';

/**
 * The cellar, as three queries and the writes that invalidate them.
 *
 * Everything else in the app derives from `useCellar()` — the shelf screen, the
 * inbox, stats and search are four cuts of one entry list, and reading them
 * separately is how four screens start disagreeing about how many glitches are
 * open.
 */

const SHELVES = ['cellar', 'shelves'] as const;
const PROJECTS = ['cellar', 'projects'] as const;
const ENTRIES = ['cellar', 'entries'] as const;

export function useCellar() {
  const shelves = useQuery({ queryKey: SHELVES, queryFn: fetchShelves });
  const projects = useQuery({ queryKey: PROJECTS, queryFn: fetchProjects });
  const entries = useQuery({ queryKey: ENTRIES, queryFn: fetchEntries });

  return {
    shelves: shelves.data ?? EMPTY_SHELVES,
    projects: projects.data ?? EMPTY_PROJECTS,
    entries: entries.data ?? EMPTY_ENTRIES,
    loading: shelves.isLoading || projects.isLoading || entries.isLoading,
    error: shelves.error ?? projects.error ?? entries.error ?? null,
    refetch: () => {
      void shelves.refetch();
      void projects.refetch();
      void entries.refetch();
    },
  };
}

// Stable identities: a fresh `[]` every render would re-run every useMemo
// downstream, and every screen in this app memoises off these three lists.
const EMPTY_SHELVES: Shelf[] = [];
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_ENTRIES: Entry[] = [];

/**
 * The shelf you are standing in front of.
 *
 * The stored id is validated against what actually loaded — a shelf deleted on
 * another device would otherwise leave this device pointing at nothing, and
 * every screen would render as an empty cellar rather than as a stale pref.
 */
export function useCurrentShelf(shelves: Shelf[]) {
  const shelfId = useCellarPrefs((state) => state.shelfId);
  const setShelf = useCellarPrefs((state) => state.setShelf);

  const shelf = useMemo(
    () => shelves.find((candidate) => candidate.id === shelfId) ?? shelves[0] ?? null,
    [shelves, shelfId],
  );

  return { shelf, setShelf };
}

export function useCellarWrites() {
  const { user } = useAuth();
  const client = useQueryClient();

  const invalidate = useCallback(
    (...keys: readonly (readonly string[])[]) => {
      for (const key of keys) void client.invalidateQueries({ queryKey: key });
    },
    [client],
  );

  const drop = useMutation({
    mutationFn: (batch: NewEntry[]) => createEntries(requireUser(user?.id), batch),
    onSuccess: () => invalidate(ENTRIES),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntryPatch }) => patchEntry(id, patch),
    onSuccess: () => invalidate(ENTRIES),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => invalidate(ENTRIES),
  });

  const addLine = useMutation({
    mutationFn: ({ entryId, text }: { entryId: string; text: string }) =>
      appendLine(requireUser(user?.id), entryId, text),
    onSuccess: () => invalidate(ENTRIES),
  });

  const addShelf = useMutation({
    mutationFn: ({ name, position }: { name: string; position: number }) =>
      createShelf(requireUser(user?.id), name, position),
    onSuccess: () => invalidate(SHELVES),
  });

  const addProject = useMutation({
    mutationFn: ({ shelfId, name, position }: { shelfId: string; name: string; position: number }) =>
      createProject(requireUser(user?.id), shelfId, name, position),
    onSuccess: () => invalidate(PROJECTS),
  });

  const removeProject = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    // Entries move to the inbox rather than going with the project, so the
    // entry list is stale too.
    onSuccess: () => invalidate(PROJECTS, ENTRIES),
  });

  return { drop, update, remove, addLine, addShelf, addProject, removeProject };
}

function requireUser(id: string | undefined): string {
  if (!id) throw new Error('not signed in');
  return id;
}
