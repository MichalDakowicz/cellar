import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '@/theme/colors';

/**
 * A picture full screen. A tap anywhere puts it away; the cross is for the eye,
 * and the Android back gesture closes it too.
 */
export function PictureViewer({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={uri !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="close the picture"
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/90"
      >
        {uri && <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="close"
          onPress={onClose}
          className="absolute right-3 rounded-full bg-black/55 p-2.5 active:opacity-70"
          style={{ top: insets.top + 8 }}
        >
          <X size={18} color={COLORS.foreground} strokeWidth={2.2} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
