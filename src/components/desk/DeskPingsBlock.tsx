import { Text, View } from 'react-native';

import { Chip } from '@/components/ui/controls';
import { PING_KINDS, PING_RULES } from '@/lib/deskSettings';

/**
 * Settings › desk › notifications (`DeskHosts.dc.html`, "where pings go"):
 * one device at a time, first rule that fits wins. Drawn ahead of routing
 * (docs/desk/TASKS.md W13); today a ping is the question notice in settings.
 */
export function DeskPingsBlock() {
  return (
    <View className="gap-3">
      {PING_RULES.map((rule, index) => (
        <View key={rule.when} className="flex-row items-start gap-3 rounded-xl bg-secondary/60 px-3 py-2.5">
          <Text className="w-4 font-mono text-xs text-muted-foreground">{index + 1}</Text>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-sm text-foreground">{rule.when}</Text>
            <Text className="text-xs text-muted-foreground">{rule.where}</Text>
          </View>
        </View>
      ))}
      <View className="flex-row flex-wrap gap-2">
        {PING_KINDS.map((kind) => (
          <Chip key={kind.label} label={kind.label} selected={kind.on} onPress={() => {}} disabled />
        ))}
      </View>
      <Text className="text-xs text-muted-foreground">
        routing comes with notifications that answer. until then, “tell me when an agent asks” in settings is the ping.
      </Text>
    </View>
  );
}
