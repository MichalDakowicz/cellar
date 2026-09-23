import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import { ICON_QUALITY, ICON_SIZE, iconDataUri } from '@/lib/projectIcon';

/**
 * Pick a picture and turn it into the text the icon column holds: cropped
 * square in the picker, cut to `ICON_SIZE`, saved as JPEG with its bytes as
 * base64. `null` when you backed out, which is not an error.
 *
 * The library picker, not the camera: an icon is a thing you already have — a
 * logo, a screenshot — and the camera would need a permission for no gain.
 */
export async function pickProjectIcon(): Promise<string | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return null;

  const small = await manipulateAsync(picked.assets[0].uri, [{ resize: { width: ICON_SIZE, height: ICON_SIZE } }], {
    compress: ICON_QUALITY,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return small.base64 ? iconDataUri(small.base64) : null;
}
