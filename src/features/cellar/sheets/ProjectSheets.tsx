import { Pin } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { checkName, nameErrorText } from '@/lib/containers';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/** A new project on the current shelf, filing whatever was held into it as it lands. */
export function NewProjectSheet({
  open,
  entryIds,
  onClose,
}: {
  open: boolean;
  entryIds: string[];
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
          for (const id of entryIds) update.mutate({ id, patch: { projectId: made.id } });
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

/**
 * Files one entry — or a held selection of them — under a project, from
 * anywhere in the app.
 *
 * One sheet for both because they are one act. The only difference is what the
 * body says it is about: the thought itself when there is one, a count when
 * there are several and quoting one of them would be a lie about the rest.
 *
 * "new project" carries the whole selection through to the sheet behind it, so
 * filing six loose thoughts into a project that does not exist yet is one pass
 * rather than six.
 */
export function FileUnderSheet({
  open,
  entryIds,
  onClose,
}: {
  open: boolean;
  entryIds: string[];
  onClose: () => void;
}) {
  const { shelves, projects, entries } = useCellar();
  const { update } = useCellarWrites();
  const newProject = useCellarSheets((state) => state.newProject);
  const one = entryIds.length === 1 ? entryIds[0] : null;
  const entry = one ? (entries.find((candidate) => candidate.id === one) ?? null) : null;

  const file = (projectId: string) => {
    for (const id of entryIds) update.mutate({ id, patch: { projectId } });
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      title="file it under"
      body={entry ? entry.text : `${entryIds.length} thoughts`}
      confirmLabel="new project"
      dismissLabel={one ? 'leave it unfiled' : 'leave them unfiled'}
      onConfirm={() => {
        onClose();
        newProject?.(entryIds);
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
            {project.pinned && <Pin size={13} color={COLORS.muted} strokeWidth={2.2} />}
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
