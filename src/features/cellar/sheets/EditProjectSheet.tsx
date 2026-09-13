import { Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { Field, Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useSheetDraft } from '@/features/cellar/sheets/useSheetDraft';
import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { checkName, deleteProjectCost, nameErrorText } from '@/lib/containers';
import { useCellarPrefs } from '@/store/cellarPrefs';

/**
 * Rename a project, move it to another shelf, or delete it.
 *
 * Delete is a second sheet rather than a red row in this one: the confirm has
 * to state what happens to the entries, and "1 entry moves back to the inbox"
 * is the whole reason deleting a project here is safe. Someone who has not read
 * that sentence has not been asked the real question.
 */
export function EditProjectSheet({
  open,
  projectId,
  onClose,
}: {
  open: boolean;
  projectId: string | null;
  onClose: () => void;
}) {
  const { shelves, projects, entries } = useCellar();
  const { editProject, relocateProject, removeProject } = useCellarWrites();
  const lastProjectId = useCellarPrefs((state) => state.lastProjectId);
  const setLastProject = useCellarPrefs((state) => state.setLastProject);

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;
  const { name, setName, confirming, setConfirming } = useSheetDraft(open, projectId, project?.name ?? '');

  if (!project) return null;

  const siblings = projects
    .filter((candidate) => candidate.shelfId === project.shelfId && candidate.id !== project.id)
    .map((candidate) => candidate.name);
  const error = checkName(name, siblings, project.name);
  const cost = deleteProjectCost(project.id, entries);

  const save = () => {
    if (error) return;
    if (name.trim() !== project.name) editProject.mutate({ id: project.id, name: name.trim() });
    onClose();
  };

  const destroy = () => {
    // The capture screen's chip points at this project; leaving it pointed at a
    // dead id would file the next thought nowhere.
    if (lastProjectId === project.id) setLastProject(null);
    removeProject.mutate(project.id, { onSuccess: onClose });
  };

  return (
    <>
      <SheetDialog
        open={open && !confirming}
        title="edit project"
        confirmLabel="save"
        dismissLabel="delete it"
        confirmDisabledReason={nameErrorText(error, 'project')}
        onConfirm={save}
        onDismiss={() => setConfirming(true)}
      >
        <View className="mt-4">
          <Field
            placeholder="working name"
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            error={nameErrorText(error, 'project')}
          />
        </View>

        {shelves.length > 1 && (
          <View className="mt-5 gap-2">
            <Overline>shelf</Overline>
            <ChipWrap
              label="shelf"
              options={shelves.map((shelf) => ({ value: shelf.id, label: shelf.name }))}
              selected={project.shelfId}
              onToggle={(shelfId) => {
                if (shelfId !== project.shelfId) relocateProject.mutate({ id: project.id, shelfId });
              }}
            />
            <Text className="text-xs text-muted-foreground">
              the entries come with it — they belong to the project, not the shelf.
            </Text>
          </View>
        )}
      </SheetDialog>

      <SheetDialog
        open={open && confirming}
        title={`delete ${project.name}`}
        body={cost.body}
        confirmLabel="delete the project"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={destroy}
        onDismiss={() => setConfirming(false)}
      />
    </>
  );
}
