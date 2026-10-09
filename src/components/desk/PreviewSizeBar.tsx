import { RefreshCw } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Chip } from '@/components/ui/controls';
import { PREVIEW_SIZES, type PreviewSize } from '@/lib/deskPreview';
import { COLORS } from '@/theme/colors';

/** Phone · tablet · desktop, and reload (`Preview.dc.html`). */
export function PreviewSizeBar({
  size,
  onSize,
  onReload,
}: {
  size: PreviewSize;
  onSize: (size: PreviewSize) => void;
  /** Null when there is nothing to reload. */
  onReload: (() => void) | null;
}) {
  return (
    <View className="flex-row items-center gap-2">
      {PREVIEW_SIZES.map((option) => (
        <Chip key={option.id} label={option.label} selected={option.id === size} onPress={() => onSize(option.id)} />
      ))}
      <View className="flex-1" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="reload the preview"
        disabled={!onReload}
        onPress={() => onReload?.()}
        className={`h-9 w-9 items-center justify-center rounded-full border border-border active:opacity-70 ${onReload ? '' : 'opacity-40'}`}
      >
        <RefreshCw size={16} color={COLORS.foreground} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
