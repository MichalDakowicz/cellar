import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { Field, Overline } from '@/components/ui/controls';
import { useCellar } from '@/features/cellar/useCellar';
import { useGroupWrites } from '@/features/cellar/useGroupWrites';
import { checkName, nameErrorText } from '@/lib/containers';
import type { Project } from '@/types/cellar';

const NONE = '';

/**
 * Which group a project sits in, from its edit sheet — or a new group made
 * around it. A group's own general project cannot leave its group: it is where
 * the group's thoughts live, so the sheet says so instead of offering the chips.
 * Applied as it is picked, like the shelf chips beside it.
 */
export function ProjectGroupPicker({ project }: { project: Project }) {
  const { groups } = useCellar();
  const { addGroup, groupProject } = useGroupWrites();
  const [name, setName] = useState('');

  const here = groups.filter((group) => group.shelfId === project.shelfId);
  const mine = here.find((group) => group.id === project.groupId) ?? null;
  const error = name.trim() ? checkName(name, here.map((group) => group.name)) : null;

  if (project.groupHome && mine) {
    return (
      <View className="mt-5 gap-2">
        <Overline>group</Overline>
        <Text className="text-xs text-muted-foreground">
          {`the general project of ${mine.name} — a thought dumped into the group lands here. it leaves the group only if the group goes.`}
        </Text>
      </View>
    );
  }

  const make = () => {
    if (!name.trim() || error) return;
    addGroup.mutate({ shelfId: project.shelfId, name: name.trim(), position: here.length, withProjectId: project.id });
    setName('');
  };

  return (
    <View className="mt-5 gap-2">
      <Overline>group</Overline>
      {here.length > 0 && (
        <ChipWrap
          label="group"
          options={[{ value: NONE, label: 'none' }, ...here.map((group) => ({ value: group.id, label: group.name }))]}
          selected={project.groupId ?? NONE}
          onToggle={(value) => groupProject.mutate({ projectId: project.id, groupId: value === NONE ? null : value })}
        />
      )}
      <View className="flex-row items-start gap-2">
        <View className="min-w-0 flex-1">
          <Field
            placeholder="new group around this project"
            value={name}
            onChangeText={setName}
            onSubmitEditing={make}
            error={nameErrorText(error, 'group')}
          />
        </View>
        {!!name.trim() && (
          <Pressable
            accessibilityRole="button"
            onPress={make}
            disabled={!!error}
            className="h-[42px] justify-center rounded-lg bg-secondary px-3.5 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-foreground">make it</Text>
          </Pressable>
        )}
      </View>
      <Text className="text-xs text-muted-foreground">
        a group is a folder on the shelf with its own general project, where a thought about the whole group goes.
      </Text>
    </View>
  );
}
