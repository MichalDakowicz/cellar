import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import {
  fitPixels,
  fitSize,
  PICTURE_STEPS,
  pictureDataUri,
  THUMB_QUALITY,
  THUMB_SIZE,
  writablePicture,
  type NewPicture,
} from '@/lib/entryPicture';

/**
 * Pick a picture, let the person crop it, and turn it into the text a picture
 * row holds: a JPEG in base64, and a `THUMB_SIZE` thumb of it. `null` when you
 * backed out, which is not an error; a picture that will not fit as text even
 * at the hardest compression throws, because "nothing happened" would read as
 * the app ignoring you.
 *
 * The crop is the person's: the picker's own editor, with no aspect passed, so
 * the shape is whatever they drag it to — nothing here picks a ratio for them
 * and nothing after changes it. What *is* done to the picture is compression,
 * and only when it needs it: brought down to a pixel budget if it is bigger
 * than that, kept whole if not, then re-encoded harder step by step until it
 * fits in a column (`PICTURE_STEPS`).
 *
 * The editor is the Android picker's. The web file picker has no crop step, so
 * there the picture comes back as it was chosen.
 *
 * The library picker and not the camera, the same call `pickProjectIcon` makes:
 * what you want to attach is usually a screenshot or something you already
 * took, and the camera would ask a permission for no gain.
 */
export async function pickPicture(): Promise<NewPicture | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 1 });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;

  for (const step of PICTURE_STEPS) {
    const resize = fitPixels(asset.width, asset.height, step.pixels);
    const big = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: step.quality,
      format: SaveFormat.JPEG,
      base64: true,
    });
    const thumbResize = fitSize(big.width, big.height, THUMB_SIZE);
    const small = await manipulateAsync(big.uri, thumbResize ? [{ resize: thumbResize }] : [], {
      compress: THUMB_QUALITY,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!big.base64 || !small.base64) continue;

    const picture = {
      thumb: pictureDataUri(small.base64),
      data: pictureDataUri(big.base64),
      width: big.width,
      height: big.height,
    };
    if (writablePicture(picture)) return picture;
  }
  throw new Error('that picture is too detailed to keep as text');
}
