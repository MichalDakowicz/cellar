import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { createGroup, deleteGroup, renameGroup, setGroupPinned, setProjectGroup } from '@/features/cellar/groupApi';
import { GROUPS_KEY, PROJECTS_KEY } from '@/lib/cellarKeys';

/**
 * The group writes. Every one of them touches projects as well — a group's
 * general project is a project — so both lists are refreshed together.
 */
export function useGroupWrites() {
  const { user } = useAuth();
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: GROUPS_KEY });
    void client.invalidateQueries({ queryKey: PROJECTS_KEY });
  };

  const addGroup = useMutation({
    mutationFn: (input: { shelfId: string; name: string; position: number; withProjectId?: string | null }) => {
      if (!user?.id) throw new Error('not signed in');
      return createGroup(user.id, input);
    },
    onSuccess: refresh,
  });
  const groupProject = useMutation({
    mutationFn: ({ projectId, groupId }: { projectId: string; groupId: string | null }) => setProjectGroup(projectId, groupId),
    onSuccess: refresh,
  });
  const editGroup = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameGroup(id, name),
    onSuccess: refresh,
  });
  const pinGroup = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setGroupPinned(id, pinned),
    onSuccess: refresh,
  });
  const removeGroup = useMutation({ mutationFn: (id: string) => deleteGroup(id), onSuccess: refresh });

  return { addGroup, groupProject, editGroup, pinGroup, removeGroup };
}
