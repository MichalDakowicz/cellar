import { Pressable, Text, View } from 'react-native';

import { PictureImage } from '@/components/cellar/PictureImage';
import type { ShownPicture } from '@/lib/entryPicture';

/** Tall enough for a phone screenshot at full width; anything taller shrinks to stay whole. */
const COVER_MAX_HEIGHT = 560;

/**
 * The thought's own picture, under its heading and above everything it grew.
 * Tap opens it full screen; the one control is taking it off, which the screen
 * confirms, because a picture stored as text has nowhere else to come back from.
 */
export function EntryCover({
  cover,
  onOpen,
  onRemove,
}: {
  cover: ShownPicture | null;
  onOpen: (id: string) => void;
  onRemove: () => void;
}) {
  if (!cover) return null;

  return (
    <View className="mt-3.5">
      <PictureImage
        uri={cover.uri}
        aspect={cover.aspect}
        maxHeight={COVER_MAX_HEIGHT}
        label="open the picture"
        onPress={() => onOpen(cover.id)}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="remove the picture"
        hitSlop={8}
        onPress={onRemove}
        className="mt-2 self-start active:opacity-60"
      >
        <Text className="text-xs text-muted-foreground">remove picture</Text>
      </Pressable>
    </View>
  );
}
