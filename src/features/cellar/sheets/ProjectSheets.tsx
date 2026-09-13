import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { checkName, nameErrorText } from '@/lib/containers';
import { useCellarSheets } from '@/store/cellarPrefs';

/** A new project on the current shelf, optionally filing an entry into it as it lands. */
export function NewProjectSheet({
  open,
  entryId,
  onClose,
}: {
  open: boolean;
  entryId: string | null;
  onClose: () => void;
}) {
  const { shelves, projects } = useCellar();
  const { shelf } = useCurrentShelf(shelves);
  const { addProject, update } = useCellarWrites();
  const [name, setName] = useState('');

  const siblings = projects.filter((project) => project.shelfId === shelf?.id).map((project) => project.name);
  const error = checkName(name, siblings);

  const create = () => {
    if (error || !shelf) return;
    addProject.mutate(
      { shelfId: shelf.id, name: name.trim(), position: siblings.length },
      {
        onSuccess: (made) => {
          if (entryId) update.mutate({ id: entryId, patch: { projectId: made.id } });
          setName('');
          onClose();
        },
      },
    );
  };

  return (
    <SheetDialog
      open={open}
      title="new project"
      body={`a project on ${shelf?.name ?? 'this shelf'}. name it now, describe it never.`}
      confirmLabel="create"
      confirmDisabledReason={nameErrorText(error, 'project')}
      onConfirm={create}
      onDismiss={onClose}
    >
      <View className="mt-4">
        <Field
          placeholder="working name"
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          autoFocus
          error={name.trim() ? nameErrorText(error, 'project') : null}
        />
      </View>
    </SheetDialog>
  );
}

/** Files one entry under a project, from anywhere in the app. */
export function FileUnderSheet({
  open,
  entryId,
  onClose,
}: {
  open: boolean;
  entryId: string | null;
  onClose: () => void;
}) {
  const { shelves, projects, entries } = useCellar();
  const { update } = useCellarWrites();
  const newProject = useCellarSheets((state) => state.newProject);
  const entry = entries.find((candidate) => candidate.id === entryId) ?? null;

  const file = (projectId: string) => {
    if (entryId) update.mutate({ id: entryId, patch: { projectId } });
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      title="file it under"
      body={entry?.text}
      confirmLabel="new project"
      dismissLabel="leave it unfiled"
      onConfirm={() => {
        onClose();
        newProject?.(entryId);
      }}
      onDismiss={onClose}
    >
      <View className="mt-4 gap-2">
        {projects.map((project) => (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityLabel={project.name}
            onPress={() => file(project.id)}
            className="flex-row items-center gap-3 rounded-xl bg-neutral-900 p-3 active:opacity-80"
          >
            <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
              {project.name}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {shelves.find((shelf) => shelf.id === project.shelfId)?.name ?? ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </SheetDialog>
  );
}
