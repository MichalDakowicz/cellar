/**
 * A picture on a thought, stored as the picture itself.
 *
 * The same decision a project's icon made (`lib/projectIcon.ts`): the image is
 * a data URI in a text column, so there is no bucket, no storage policy and no
 * second thing to delete when the thought goes. That only works while it stays
 * small, so it is cut down before it is written — a screenshot at 1000px on its
 * longest side is a readable 60–150 KB of text — and a 160px thumb rides with
 * it so a list never has to read the big one.
 *
 * Two homes. The **cover** is the thought's own picture, at most one. A **note
 * picture** hangs off a line under the thought, at most one per line, and the
 * line carries `PICTURE_LINE` as its text so an agent reading the thread sees
 * that a picture is there instead of an empty bullet.
 */

/** Longest side of the stored picture, in pixels. */
export const PICTURE_SIZE = 1000;
/** Longest side of the list thumb. */
export const THUMB_SIZE = 160;
/** JPEG quality of the stored picture and of the thumb. */
export const PICTURE_QUALITY = 0.6;
export const THUMB_QUALITY = 0.7;
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

/** A picture ready to be written: the thumb and the one it stands for, both text. */
export type NewPicture = { thumb: string; data: string };

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
};

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
  thumb: unknown;
}): PictureThumb | null {
  const thumb = pictureOf(row.thumb, THUMB_MAX_CHARS);
  return thumb ? { id: row.id, entryId: row.entry_id, lineId: row.line_id, thumb } : null;
}
