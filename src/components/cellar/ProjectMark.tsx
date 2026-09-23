import { Image } from 'expo-image';
import { Text, View } from 'react-native';

/**
 * A project's mark: its icon when it has one, its two letters when it does not.
 * One component so the tile, the header and the edit sheet can never disagree
 * about what a project looks like.
 */
export function ProjectMark({ icon, initials, size }: { icon?: string | null; initials: string; size: number }) {
  const radius = Math.round(size * 0.22);
  if (icon) {
    return (
      <Image
        source={{ uri: icon }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View className="items-center justify-center bg-neutral-900" style={{ width: size, height: size, borderRadius: radius }}>
      <Text
        className="font-bold lowercase tracking-tight text-muted-foreground opacity-60"
        style={{ fontSize: Math.round(size * 0.36) }}
      >
        {initials}
      </Text>
    </View>
  );
}

/**
 * The tile's ground when the project has an icon: the same picture drawn large
 * and blurred, darkened so the tile's own text and badges still read on top.
 * Nothing extra is stored — the backdrop is the icon (`lib/projectIcon`).
 */
export function IconBackdrop({ icon }: { icon: string }) {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden rounded-md">
      <Image source={{ uri: icon }} style={{ width: '100%', height: '100%' }} contentFit="cover" blurRadius={28} />
      <View className="absolute inset-0 bg-black/45" />
    </View>
  );
}
