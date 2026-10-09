import { Pressable, Text, View } from 'react-native';

/**
 * A thing on the pc the phone can open — a page, the screen, a build. A title,
 * one line of what it is, and the verb on the right, so a list of them reads
 * like the runs above it.
 */
export function DeskLocalRow({
  title,
  detail,
  verb,
  busy,
  onPress,
}: {
  title: string;
  detail: string;
  verb: string;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${verb} ${title}`}
        disabled={busy}
        hitSlop={8}
        onPress={onPress}
        className={['rounded-full border border-border px-3 py-1.5 active:opacity-70', busy ? 'opacity-50' : ''].join(' ')}
      >
        <Text className="text-xs font-semibold text-foreground">{busy ? '…' : verb}</Text>
      </Pressable>
    </View>
  );
}
