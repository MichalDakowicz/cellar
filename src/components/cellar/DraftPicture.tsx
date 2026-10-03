import { Image } from 'expo-image';
import { ImagePlus, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

/**
 * The picture on a thought you are still typing: a way to add one, and once
 * there is one, its thumb with a cross.
 *
 * It becomes the thought's cover when you drop. One picture, because it is the
 * thought's own — pictures that belong with the notes are added on the entry,
 * where the notes are.
 */
export function DraftPicture({
  thumb,
  busy,
  onPick,
  onClear,
}: {
  thumb: string | null;
  busy: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  if (thumb) {
    return (
      <View className="mt-2.5 flex-row items-center gap-3">
        <Image source={{ uri: thumb }} style={{ width: 56, height: 56, borderRadius: 10 }} contentFit="cover" />
        <Text className="min-w-0 flex-1 text-xs text-muted-foreground">goes on the thought as its picture</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="take the picture off"
          hitSlop={8}
          onPress={onClear}
          className="rounded-full bg-secondary p-2 active:opacity-70"
        >
          <X size={14} color={COLORS.muted} strokeWidth={2.2} />
        </Pressable>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="add a picture"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      hitSlop={8}
      onPress={onPick}
      className="mt-2.5 flex-row items-center gap-1.5 self-start active:opacity-60"
      style={{ opacity: busy ? 0.5 : 1 }}
    >
      <ImagePlus size={13} color={COLORS.muted} strokeWidth={2} />
      <Text className="text-xs text-muted-foreground">{busy ? 'working…' : 'add a picture'}</Text>
    </Pressable>
  );
}
