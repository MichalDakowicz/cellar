import { Text, View } from 'react-native';

import { EXTRA_KEYS } from '@/lib/deskSettings';
import { COLORS } from '@/theme/colors';

/**
 * Settings › keys, "your own keys" (`Keys.dc.html`): pick a free character and
 * where it searches. `@ $ /` are fixed and `#` is colours; these four are ideas
 * to start from, each with whether it starts on. Drawn until each has
 * something to search (docs/desk/TASKS.md W10).
 */
export function DeskKeysBlock() {
  return (
    <View className="gap-2.5">
      <Text className="font-sans text-sm text-muted-foreground">
        pick a free character and where it searches: a folder, a list, or a url that answers with json. @ $ / are fixed and #
        belongs to colours. these are ideas to start from.
      </Text>
      {EXTRA_KEYS.map((key) => (
        <View key={key.key} className="flex-row items-center gap-3.5 rounded-xl bg-row p-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-secondary">
            <Text className="font-mono text-xl font-semibold text-foreground">{key.key}</Text>
          </View>
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="font-sans text-base font-bold text-foreground">{key.name}</Text>
            <Text className="font-sans text-xs text-muted-foreground">
              {`${key.searches} · `}
              <Text className="font-mono" style={{ color: COLORS.foregroundSoft }}>
                {key.example}
              </Text>
            </Text>
          </View>
          <Text className="font-sans text-xs" style={{ color: key.on ? COLORS.ok : COLORS.muted }}>
            {key.on ? 'on' : 'off'}
          </Text>
        </View>
      ))}
      <View className="h-12 items-center justify-center rounded-xl border border-dashed opacity-60" style={{ borderColor: COLORS.outline }}>
        <Text className="font-sans text-sm font-semibold" style={{ color: COLORS.foregroundSoft }}>
          add a key — comes later
        </Text>
      </View>
    </View>
  );
}
