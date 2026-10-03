import { normalizeThumb, pictureOf, writablePicture, type NewPicture, type PictureThumb } from '@/lib/entryPicture';
import { supabase } from '@/lib/supabase';

/**
 * The pictures' queries. Kept out of `cellarApi.ts` for the reason the trail's
 * are: the cellar is read in one go and a picture is not part of that read —
 * thumbs come once, the full size one picture at a time.
 *
 * No React import — this is the transport, not a hook.
 */

type PictureRow = { id: string; entry_id: string; line_id: string | null; width: number; height: number; thumb: unknown };

/**
 * Postgres says 42P01 and PostgREST says PGRST205 when the table is not there.
 * Cellar's schema is applied by hand, so a build can be running against a
 * database that has not had the pictures section yet — and the whole app must
 * keep working, just without pictures.
 */
function isMissingTable(error: { code?: string; message?: string }): boolean {
  return error.code === '42P01' || error.code === 'PGRST205' || /cellar_entry_pictures/.test(error.message ?? '');
}

export async function fetchPictureThumbs(): Promise<PictureThumb[]> {
  const { data, error } = await supabase
    .from('cellar_entry_pictures')
    .select('id, entry_id, line_id, width, height, thumb')
    .order('created_at');
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return (data as PictureRow[]).flatMap((row) => normalizeThumb(row) ?? []);
}

/** The full-size picture, or null when the row is gone or its data is not a sane image. */
export async function fetchPictureData(id: string): Promise<string | null> {
  const { data, error } = await supabase.from('cellar_entry_pictures').select('data').eq('id', id).maybeSingle();
  if (error) throw error;
  return pictureOf((data as { data?: unknown } | null)?.data);
}

type InsertRow = {
  user_id: string;
  entry_id: string;
  line_id: string | null;
  width: number;
  height: number;
  thumb: string;
  data: string;
};

function row(userId: string, entryId: string, lineId: string | null, picture: NewPicture): InsertRow {
  if (!writablePicture(picture)) throw new Error('that picture is too big to keep as text');
  return {
    user_id: userId,
    entry_id: entryId,
    line_id: lineId,
    width: picture.width,
    height: picture.height,
    thumb: picture.thumb,
    data: picture.data,
  };
}

/**
 * Sets a thought's cover, replacing the one it had.
 *
 * The delete goes first and the insert second, so a failed write can leave a
 * thought without a cover but never with two — the partial unique index would
 * refuse the second one anyway. Written this way because PostgREST cannot
 * upsert against a partial index.
 */
export async function setCover(userId: string, entryId: string, picture: NewPicture): Promise<void> {
  const next = row(userId, entryId, null, picture);
  const { error: removeError } = await supabase
    .from('cellar_entry_pictures')
    .delete()
    .eq('entry_id', entryId)
    .is('line_id', null);
  if (removeError) throw removeError;
  const { error } = await supabase.from('cellar_entry_pictures').insert(next);
  if (error) throw error;
}

/** The picture a note carries. The line is written first, so its id exists. */
export async function addNotePicture(userId: string, entryId: string, lineId: string, picture: NewPicture): Promise<void> {
  const { error } = await supabase.from('cellar_entry_pictures').insert(row(userId, entryId, lineId, picture));
  if (error) throw error;
}

/** Covers for a batch of thoughts just dropped, in one write. */
export async function addCovers(userId: string, covers: { entryId: string; picture: NewPicture }[]): Promise<void> {
  if (covers.length === 0) return;
  const { error } = await supabase
    .from('cellar_entry_pictures')
    .insert(covers.map((cover) => row(userId, cover.entryId, null, cover.picture)));
  if (error) throw error;
}

export async function deletePicture(id: string): Promise<void> {
  const { error } = await supabase.from('cellar_entry_pictures').delete().eq('id', id);
  if (error) throw error;
}
