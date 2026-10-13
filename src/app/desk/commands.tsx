import { Text, View } from 'react-native';

import { LaterScreen } from '@/features/desk/LaterScreen';
import { SAMPLE_PROJECTS } from '@/lib/deskSample';

/**
 * Desk › commands (Map › desk): each project's prepared `$` commands, read
 * from its package.json and gradle — each also a button on home and the desk
 * tab. Drawn from the sample desk until the pc reads them (docs/desk/TASKS.md W2).
 */
export default function DeskCommands() {
  return (
    <LaterScreen
      name="commands"
      overline="commands · desktop to edit, both to run"
      title="commands"
      sub="each project's $ commands, from its package.json and gradle"
      sampleOnly
      waitsOn="each project's $ commands, read from its package.json and gradle — comes once the pc reads them"
    >
      <View className="gap-3">
        {SAMPLE_PROJECTS.map((project) => (
          <View key={project.id} className="gap-2 rounded-xl bg-row p-3.5">
            <Text className="font-mono text-sm font-semibold text-foreground">{`$${project.name}`}</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {project.commands.map((command) => (
                <Text key={command.id} className="rounded-md bg-secondary px-2 py-1 font-mono text-xs text-foreground">
                  {`$${command.label}`}
                </Text>
              ))}
            </View>
            <Text className="font-mono text-xs text-muted-foreground" numberOfLines={1}>
              {project.meta}
            </Text>
          </View>
        ))}
      </View>
    </LaterScreen>
  );
}
