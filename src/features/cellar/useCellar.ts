import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import {
  answerQuestion,
  appendLine,
  createProject,
  createShelf,
  deleteEntry,
  deleteLine,
  deleteProject,
  deleteShelf,
  dismissQuestion,
  dropEntries,
  fetchEntries,
  fetchProjects,
  fetchShelves,
  moveProject,
  patchEntry,
  renameProject,
  renameShelf,
  setProjectRepo,
  type EntryPatch,
  type NewDrop,
} from '@/features/cellar/cellarApi';
import { useAuth } from '@/features/auth/AuthProvider';
import { ENTRIES_KEY, PROJECTS_KEY, SHELVES_KEY } from '@/lib/cellarKeys';
import { unblocksEntry } from '@/lib/entryQuestions';
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

export function useCellar() {
  const shelves = useQuery({ queryKey: SHELVES_KEY, queryFn: fetchShelves });
  const projects = useQuery({ queryKey: PROJECTS_KEY, queryFn: fetchProjects });
  const entries = useQuery({ queryKey: ENTRIES_KEY, queryFn: fetchEntries });

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
    mutationFn: (batch: NewDrop[]) => dropEntries(requireUser(user?.id), batch),
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: EntryPatch }) => patchEntry(id, patch),
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const addLine = useMutation({
    // `createdAt` is undo putting a line back at the moment it was written,
    // never a fresh append (features/cellar/cellarApi.ts).
    mutationFn: ({ entryId, text, createdAt }: { entryId: string; text: string; createdAt?: string }) =>
      appendLine(requireUser(user?.id), entryId, text, 'user', createdAt),
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const removeLine = useMutation({
    mutationFn: (id: string) => deleteLine(id),
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  // Settling the last outstanding question lifts `blocked` on its own — the
  // whole point of the state is "something is waiting on you", and leaving a
  // red badge on an entry you have just answered is the app lying about it.
  //
  // Only from `blocked`, though: if the thought has since been marked done or
  // dropped, that decision outranks an answer and must not be undone. The
  // agent's name comes off with it, the same way setting the state by hand
  // does, so the entry reads as claimable again.
  const settle = useCallback(
    async (entry: Entry, questionId: string) => {
      if (entry.state !== 'blocked') return;
      if (!unblocksEntry(entry.questions, questionId)) return;
      await patchEntry(entry.id, { state: 'open', agent: null });
    },
    [],
  );

  const answer = useMutation({
    mutationFn: async ({ entry, questionId, text }: { entry: Entry; questionId: string; text: string }) => {
      await answerQuestion(questionId, text);
      await settle(entry, questionId);
    },
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const dismiss = useMutation({
    mutationFn: async ({ entry, questionId }: { entry: Entry; questionId: string }) => {
      await dismissQuestion(questionId);
      await settle(entry, questionId);
    },
    onSuccess: () => invalidate(ENTRIES_KEY),
  });

  const addShelf = useMutation({
    mutationFn: ({ name, position }: { name: string; position: number }) =>
      createShelf(requireUser(user?.id), name, position),
    onSuccess: () => invalidate(SHELVES_KEY),
  });

  const addProject = useMutation({
    mutationFn: ({ shelfId, name, position }: { shelfId: string; name: string; position: number }) =>
      createProject(requireUser(user?.id), shelfId, name, position),
    onSuccess: () => invalidate(PROJECTS_KEY),
  });

  const editProject = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameProject(id, name),
    onSuccess: () => invalidate(PROJECTS_KEY),
  });

  const linkProject = useMutation({
    mutationFn: ({ id, ...repo }: { id: string; repoPath: string | null; repoUrl: string | null }) =>
      setProjectRepo(id, repo),
    onSuccess: () => invalidate(PROJECTS_KEY),
  });

  const relocateProject = useMutation({
    mutationFn: ({ id, shelfId }: { id: string; shelfId: string }) => moveProject(id, shelfId),
    onSuccess: () => invalidate(PROJECTS_KEY),
  });

  const removeProject = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    // Entries move to the inbox rather than going with the project, so the
    // entry list is stale too.
    onSuccess: () => invalidate(PROJECTS_KEY, ENTRIES_KEY),
  });

  const editShelf = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameShelf(id, name),
    onSuccess: () => invalidate(SHELVES_KEY),
  });

  const removeShelf = useMutation({
    mutationFn: (id: string) => deleteShelf(id),
    // The projects cascade and their entries fall to the inbox, so all three
    // lists are stale — invalidating only SHELVES leaves a shelf screen
    // rendering projects that no longer exist.
    onSuccess: () => invalidate(SHELVES_KEY, PROJECTS_KEY, ENTRIES_KEY),
  });

  return {
    drop,
    update,
    remove,
    addLine,
    removeLine,
    answer,
    dismiss,
    addShelf,
    editShelf,
    removeShelf,
    addProject,
    editProject,
    linkProject,
    relocateProject,
    removeProject,
  };
}

function requireUser(id: string | undefined): string {
  if (!id) throw new Error('not signed in');
  return id;
}
