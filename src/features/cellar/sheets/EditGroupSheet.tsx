import { Text, View } from 'react-native';

import { Field, Overline, SwitchRow } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useSheetDraft } from '@/features/cellar/sheets/useSheetDraft';
import { useCellar } from '@/features/cellar/useCellar';
import { useGroupWrites } from '@/features/cellar/useGroupWrites';
import { checkName, nameErrorText } from '@/lib/containers';
import { groupRoots } from '@/lib/deskFolders';
import { normalizeRepoPath } from '@/lib/repoLink';
import { plural } from '@/lib/utils';

/**
 * Rename, pin, place or delete a group. Renaming renames its general project
 * with it — the two are one thing to a thought. Where it lives is the folder its
 * checkouts share, where "start on pc" runs a thought filed in the group itself;
 * left empty, the folder its projects share is used, and the placeholder shows
 * which that is. Deleting takes the folder away and nothing in it: every
 * project, the general one included, stays on the shelf.
 */
export function EditGroupSheet({ open, groupId, onClose }: { open: boolean; groupId: string | null; onClose: () => void }) {
  const { groups, projects } = useCellar();
  const { editGroup, pinGroup, placeGroup, removeGroup } = useGroupWrites();

  const group = groups.find((candidate) => candidate.id === groupId) ?? null;
  const { values, set, confirming, setConfirming } = useSheetDraft(open, groupId, {
    name: group?.name ?? '',
    repoPath: group?.repoPath ?? '',
  });

  if (!group) return null;

  const siblings = groups
    .filter((candidate) => candidate.shelfId === group.shelfId && candidate.id !== group.id)
    .map((candidate) => candidate.name);
  const error = checkName(values.name, siblings, group.name);
  const inside = projects.filter((project) => project.groupId === group.id).length;
  const shared = groupRoots(projects).get(group.id) ?? null;

  const save = () => {
    if (error) return;
    if (values.name.trim() !== group.name) editGroup.mutate({ id: group.id, name: values.name.trim() });
    const repoPath = normalizeRepoPath(values.repoPath);
    if (repoPath !== (group.repoPath ?? null)) placeGroup.mutate({ id: group.id, repoPath });
    onClose();
  };

  return (
    <>
      <SheetDialog
        open={open && !confirming}
        title="edit group"
        confirmLabel="save"
        dismissLabel="delete it"
        confirmDisabledReason={nameErrorText(error, 'group')}
        onConfirm={save}
        onDismiss={() => setConfirming(true)}
        onRequestClose={onClose}
      >
        <View className="mt-4">
          <Field
            placeholder="group name"
            value={values.name}
            onChangeText={(next) => set({ name: next })}
            onSubmitEditing={save}
            error={nameErrorText(error, 'group')}
          />
        </View>
        <View className="mt-4 gap-2">
          <Overline>where it lives</Overline>
          <Field
            placeholder={shared ?? 'C:\\ping'}
            value={values.repoPath}
            onChangeText={(next) => set({ repoPath: next })}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text className="text-xs text-muted-foreground">
            the folder its projects sit in — where start on pc runs a thought filed in the group itself
          </Text>
        </View>
        <SwitchRow
          label="pin it"
          sub="the folder sorts first on its shelf"
          value={group.pinned}
          onChange={(pinned) => pinGroup.mutate({ id: group.id, pinned })}
        />
      </SheetDialog>

      <SheetDialog
        open={open && confirming}
        title={`delete ${group.name}`}
        body={`the folder goes and nothing in it does — ${plural(inside, 'project')} stay on the shelf, the general one included, with every thought in them.`}
        confirmLabel="delete the group"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={() => removeGroup.mutate(group.id, { onSuccess: onClose })}
        onDismiss={() => setConfirming(false)}
        onRequestClose={() => setConfirming(false)}
      />
    </>
  );
}
