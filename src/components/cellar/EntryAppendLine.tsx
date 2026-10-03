import { ImagePlus, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { webFocusRing } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * The field under the thread that appends *another* line, with the two ways to
 * send one: the plus for words, the picture for a picture that sits in the
 * thread as its own note.
 */
export function EntryAppendLine({
  value,
  onChangeText,
  onSubmit,
  onPicture,
  pictureBusy,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onPicture: () => void;
  pictureBusy: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mt-3.5 flex-row gap-2">
      <TextInput
        className="h-[42px] min-w-0 flex-1 rounded-lg bg-secondary px-3.5 text-foreground"
        style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS, webFocusRing(focused)]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dump more into this"
        placeholderTextColor={COLORS.muted}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
        accessibilityLabel="dump more into this"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="add a picture"
        accessibilityState={{ disabled: pictureBusy }}
        disabled={pictureBusy}
        hitSlop={6}
        onPress={onPicture}
        className="h-[42px] w-[42px] items-center justify-center rounded-lg bg-secondary active:opacity-70"
        style={{ opacity: pictureBusy ? 0.5 : 1 }}
      >
        <ImagePlus size={18} color={COLORS.foreground} strokeWidth={2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="add a line"
        hitSlop={6}
        onPress={onSubmit}
        className="h-[42px] w-[42px] items-center justify-center rounded-lg bg-secondary active:opacity-70"
      >
        <Plus size={18} color={COLORS.foreground} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
