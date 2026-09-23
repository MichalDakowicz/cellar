import { View } from 'react-native';

import { Field, SwitchRow } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useSheetDraft } from '@/features/cellar/sheets/useSheetDraft';
import { useCellar } from '@/features/cellar/useCellar';
import { useGroupWrites } from '@/features/cellar/useGroupWrites';
import { checkName, nameErrorText } from '@/lib/containers';
import { plural } from '@/lib/utils';

/**
 * Rename, pin or delete a group. Renaming renames its general project with it
 * — the two are one thing to a thought. Deleting takes the folder away and
 * nothing in it: every project, the general one included, stays on the shelf.
 */
export function EditGroupSheet({ open, groupId, onClose }: { open: boolean; groupId: string | null; onClose: () => void }) {
  const { groups, projects } = useCellar();
  const { editGroup, pinGroup, removeGroup } = useGroupWrites();

  const group = groups.find((candidate) => candidate.id === groupId) ?? null;
  const { values, set, confirming, setConfirming } = useSheetDraft(open, groupId, { name: group?.name ?? '' });

  if (!group) return null;

  const siblings = groups
    .filter((candidate) => candidate.shelfId === group.shelfId && candidate.id !== group.id)
    .map((candidate) => candidate.name);
  const error = checkName(values.name, siblings, group.name);
  const inside = projects.filter((project) => project.groupId === group.id).length;

  const save = () => {
    if (error) return;
    if (values.name.trim() !== group.name) editGroup.mutate({ id: group.id, name: values.name.trim() });
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
