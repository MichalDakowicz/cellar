import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';

import {
  fitSize,
  PICTURE_QUALITY,
  PICTURE_SIZE,
  pictureDataUri,
  THUMB_QUALITY,
  THUMB_SIZE,
  writablePicture,
  type NewPicture,
} from '@/lib/entryPicture';

/**
 * Pick a picture and turn it into the text a picture row holds: the full size
 * cut to `PICTURE_SIZE` on its longest side as a JPEG in base64, and a
 * `THUMB_SIZE` thumb of that. `null` when you backed out, which is not an
 * error; a picture that will not fit as text even at the lowest quality throws,
 * because "nothing happened" would read as the app ignoring you.
 *
 * The library picker and not the camera, the same call `pickProjectIcon` makes:
 * what you want to attach is usually a screenshot or something you already
 * took, and the camera would ask a permission for no gain.
 */
export async function pickPicture(): Promise<NewPicture | null> {
  const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const asset = picked.canceled ? null : picked.assets[0];
  if (!asset) return null;

  // Quality steps down only if the first cut is too big to keep. A busy
  // screenshot is the case: it is the one that does not compress.
  for (const quality of [PICTURE_QUALITY, 0.4, 0.25]) {
    const resize = fitSize(asset.width, asset.height, PICTURE_SIZE);
    const big = await manipulateAsync(asset.uri, resize ? [{ resize }] : [], {
      compress: quality,
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
