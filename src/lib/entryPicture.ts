/**
 * A picture on a thought, stored as the picture itself.
 *
 * The same decision a project's icon made (`lib/projectIcon.ts`): the image is
 * a data URI in a text column, so there is no bucket, no storage policy and no
 * second thing to delete when the thought goes. That only works while it stays
 * small, so a picture that is too big is compressed before it is written, and a
 * 160px thumb rides with it so a list never has to read the big one.
 *
 * The shape is the person's. They crop it in the picker, and nothing here
 * limits or changes the proportions of what comes back: a tall strip of a chat
 * stays a tall strip. Only the pixel count is bounded, never the aspect.
 *
 * Two homes. The **cover** is the thought's own picture, at most one. A **note
 * picture** hangs off a line under the thought, at most one per line, and the
 * line carries `PICTURE_LINE` as its text so an agent reading the thread sees
 * that a picture is there instead of an empty bullet.
 */

/** Longest side of the list thumb. */
export const THUMB_SIZE = 160;
export const THUMB_QUALITY = 0.7;

/**
 * What the stored picture may cost, tried in order until one fits under
 * `PICTURE_MAX_CHARS`: a pixel budget and a JPEG quality. The first step is the
 * usual one — about 1.5 megapixels, which keeps a full phone screenshot
 * readable — and the rest only happen for a picture that will not compress, a
 * busy one. A picture already under the budget is not resized, only re-encoded.
 */
export const PICTURE_STEPS: readonly { pixels: number; quality: number }[] = [
  { pixels: 1_500_000, quality: 0.6 },
  { pixels: 1_500_000, quality: 0.45 },
  { pixels: 900_000, quality: 0.45 },
  { pixels: 450_000, quality: 0.4 },
  { pixels: 200_000, quality: 0.35 },
];
/** Past these a write is refused and a read is not drawn, so one bad row cannot bloat a screen. */
export const PICTURE_MAX_CHARS = 450_000;
export const THUMB_MAX_CHARS = 40_000;

/** What a note that is only a picture says, for whoever reads the thread as text. */
export const PICTURE_LINE = '(picture)';

const DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function pictureDataUri(base64: string): string {
  return `data:image/jpeg;base64,${base64}`;
}

/** What is safe to draw: an image data URI under the cap, or nothing. */
export function pictureOf(value: unknown, max: number = PICTURE_MAX_CHARS): string | null {
  if (typeof value !== 'string') return null;
  if (value.length > max) return null;
  return DATA_URI.test(value) ? value : null;
}

/** A picture ready to be written: the thumb and the one it stands for, both text, and its size. */
export type NewPicture = { thumb: string; data: string; width: number; height: number };

/**
 * The resize that brings a picture's longest side down to `max`, in the shape
 * `expo-image-manipulator` takes — one side only, so the other follows and the
 * aspect is kept. `null` when it is already small enough: never upscaled.
 */
export function fitSize(width: number, height: number, max: number): { width: number } | { height: number } | null {
  if (Math.max(width, height) <= max) return null;
  return width >= height ? { width: max } : { height: max };
}

/**
 * The resize that brings a picture down to a pixel budget without touching its
 * shape, or `null` when it is already within it. Pixels rather than a longest
 * side, because a side limit would shrink a tall crop to a sliver while a wide
 * one kept all its detail — the budget treats every shape alike.
 */
export function fitPixels(width: number, height: number, maxPixels: number): { width: number } | null {
  if (!(width > 0) || !(height > 0) || width * height <= maxPixels) return null;
  return { width: Math.max(1, Math.floor(width * Math.sqrt(maxPixels / (width * height)))) };
}

/** A picture's shape as the screen draws it: its own, with no clamp. A size that is missing reads as 4:3. */
export function aspectOf(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 4 / 3;
  return width / height;
}

/** Both halves within their caps and both real image data URIs. */
export function writablePicture(picture: NewPicture): boolean {
  return pictureOf(picture.thumb, THUMB_MAX_CHARS) !== null && pictureOf(picture.data) !== null;
}

/** A line that is only a picture, which the thread draws as the picture alone. */
export function isPictureLine(text: string): boolean {
  return text === PICTURE_LINE;
}

/** One picture's thumb as the lists read it — the big one is fetched on its own. */
export type PictureThumb = {
  id: string;
  entryId: string;
  /** Null is the cover; otherwise the note this picture hangs off. */
  lineId: string | null;
  thumb: string;
  width: number;
  height: number;
};

/** A picture as the screen draws it: where it is, and the box it sits in. */
export type ShownPicture = { id: string; uri: string; aspect: number };

/** What the pictures of one thought look like, split the way the screen draws them. */
export type EntryPictures = {
  cover: PictureThumb | null;
  /** By line id, for the notes that carry one. */
  byLine: Map<string, PictureThumb>;
};

export function picturesOf(thumbs: PictureThumb[], entryId: string): EntryPictures {
  const mine = thumbs.filter((picture) => picture.entryId === entryId);
  return {
    cover: mine.find((picture) => picture.lineId === null) ?? null,
    byLine: new Map(mine.filter((picture) => picture.lineId !== null).map((picture) => [picture.lineId as string, picture])),
  };
}

/** Row → thumb, dropping a row whose thumb is not a real, sane image. */
export function normalizeThumb(row: {
  id: string;
  entry_id: string;
  line_id: string | null;
  width: number;
  height: number;
  thumb: unknown;
}): PictureThumb | null {
  const thumb = pictureOf(row.thumb, THUMB_MAX_CHARS);
  return thumb
    ? { id: row.id, entryId: row.entry_id, lineId: row.line_id, thumb, width: row.width, height: row.height }
    : null;
}
