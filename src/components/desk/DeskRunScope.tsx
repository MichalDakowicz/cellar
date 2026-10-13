import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';

export function DeskRunScope({ project, scope, onScope }: { project: string; scope: 'all' | 'project'; onScope: (scope: 'all' | 'project') => void }) {
  return (
    <View className="gap-2.5">
      <Overline>runs</Overline>
      <View className="flex-row gap-1 rounded-xl border border-border bg-row p-1">
        {(['all', 'project'] as const).map((id) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: scope === id }} onPress={() => onScope(id)} className={`h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 ${scope === id ? 'bg-secondary' : ''}`}>
            <Text className={`font-sans text-sm font-semibold ${scope === id ? 'text-foreground' : 'text-muted-foreground'}`} numberOfLines={1}>{id === 'all' ? 'all projects' : project}</Text>
          </Pressable>
        ))}
      </View>
      <Text className="font-sans text-xs text-muted-foreground">Waiting on you stays across all projects.</Text>
    </View>
  );
}
