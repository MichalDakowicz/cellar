import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { COLORS } from '@/theme/colors';

import { useCommandSettings } from './useCommandSettings';

/** Overrides name existing tasks; blank restores discovery defaults. */
export function CommandSettings() {
  const settings = useCommandSettings();
  return <View className="gap-3">
    <Text className="font-sans text-sm text-muted-foreground">Project commands run on the PC as jobs. Override a button or chain tasks below. Leave blank for discovered defaults.</Text>
    <ScrollView horizontal contentContainerClassName="gap-2" showsHorizontalScrollIndicator={false}>
      {settings.projects.map((project) => <Pressable key={project.id} accessibilityRole="button" accessibilityState={{ selected: settings.project?.id === project.id }} onPress={() => settings.onProject(project.id)} className="min-h-11 justify-center rounded-full border border-border px-3">
        <Text className="font-sans text-sm text-foreground">{project.name}</Text>
      </Pressable>)}
    </ScrollView>
    {settings.project && <>
      <Text className="font-mono text-xs text-muted-foreground">{settings.project.commands.map((command) => `$${command.id}`).join(' · ') || 'no commands discovered'}</Text>
      <TextInput accessibilityLabel="project command overrides" value={settings.text} onChangeText={settings.onText} multiline autoCapitalize="none" autoCorrect={false} placeholder="check = npm:lint + npm:test" placeholderTextColor={COLORS.muted} className="font-mono min-h-24 rounded-lg bg-secondary p-3 text-sm text-foreground" />
      <Pressable accessibilityRole="button" disabled={settings.busy} onPress={settings.save} className="min-h-12 items-center justify-center rounded-lg bg-primary"><Text className="font-sans text-sm text-primary-foreground">{settings.busy ? 'saving on the pc…' : 'save commands on pc'}</Text></Pressable>
      <Text className="font-sans text-xs text-muted-foreground">From a run chat: /save-command check = npm:lint + npm:test. Chains stop at the first failed step.</Text>
    </>}
    {!!settings.status && <Text className="font-sans text-sm text-muted-foreground">{settings.status}</Text>}
    <Pressable accessibilityRole="button" onPress={settings.retry} className="min-h-11 justify-center"><Text className="font-sans text-sm text-foreground">reload commands</Text></Pressable>
  </View>;
}
