/**
 * A project's icon, stored as the image itself.
 *
 * "store images as image converted to text to not store files": no bucket, no
 * storage policy, no second thing to delete when the project goes — the icon
 * is a data URI in a text column on the project row. That only works while it
 * stays small, so it is cropped square and cut down to 160px before it is ever
 * written, which lands a photo at roughly 8–15 KB of text.
 *
 * The blurred backdrop on the tile is not stored at all: it is this same image
 * drawn large with a blur, so there is one picture to pick and nothing to keep
 * in step.
 */

/** Square, in pixels. Enough for a tile at 3x density; small enough to live in a row. */
export const ICON_SIZE = 160;
/** JPEG quality for the stored icon. */
export const ICON_QUALITY = 0.72;
/** A stored icon is refused past this, so a bad write cannot bloat every projects read. */
export const ICON_MAX_CHARS = 80_000;

const DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function iconDataUri(base64: string, format: 'jpeg' | 'png' = 'jpeg'): string {
  return `data:image/${format};base64,${base64}`;
}

/** What is safe to render: an image data URI of a sane size, or nothing. */
export function iconOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length > ICON_MAX_CHARS) return null;
  return DATA_URI.test(value) ? value : null;
}
