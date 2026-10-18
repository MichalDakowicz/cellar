import type { SupabaseClient } from '@supabase/supabase-js';
import { pictureOf } from '@/lib/entryPicture';
import { text, type ToolResult } from './context.ts';

type Picture = { id: string; line_id: string | null; width: number; height: number };
const INLINE_BUDGET = 6_000_000;

export async function readPicture(client: SupabaseClient, entryId: string, pictureId: string): Promise<ToolResult> {
  const { data, error } = await client.from('cellar_entry_pictures').select('id, line_id, width, height, data')
    .eq('entry_id', entryId).eq('id', pictureId).single();
  if (error) throw error;
  const uri = pictureOf(data.data);
  if (!uri) throw new Error('Picture is invalid or exceeds the supported image size.');
  const match = /^data:(image\/[^;]+);base64,(.+)$/.exec(uri)!;
  return { content: [
    { type: 'text', text: pictureLabel(data) },
    { type: 'image', mimeType: match[1], data: match[2] },
  ] };
}

function pictureLabel(picture: Picture): string {
  return `picture ${picture.id} — ${picture.line_id ? `note ${picture.line_id}` : 'cover'} (${picture.width} × ${picture.height})`;
}

/** Images belong to this entry only; lists never fetch their large data columns. */
export async function withPictures(client: SupabaseClient, entryId: string, body: string): Promise<ToolResult> {
  const result = text(body);
  try {
    const { data, error } = await client.from('cellar_entry_pictures').select('id, line_id, width, height')
      .eq('entry_id', entryId).order('created_at');
    if (error) throw error;
    if (!data?.length) return result;
    result.content.push({ type: 'text', text: 'Attached pictures are part of the brief. Inspect these images before working; do not infer their contents from the text alone.' });
    let remaining = INLINE_BUDGET;
    for (const picture of data as Picture[]) {
      if (remaining > 0) {
        const image = await readPicture(client, entryId, picture.id);
        const size = image.content.reduce((sum, block) => sum + (block.type === 'image' ? block.data.length : 0), 0);
        if (size <= remaining) {
          result.content.push(...image.content);
          remaining -= size;
          continue;
        }
        remaining = 0;
      }
      result.content.push({ type: 'text', text: `${pictureLabel(picture)} — read with cellar_get_picture(entry="${entryId}", picture="${picture.id}") before working` });
    }
  } catch (error) {
    // A successful claim stays successful even when its image read fails.
    result.content.push({ type: 'text', text: `Could not load attached pictures: ${error instanceof Error ? error.message : String(error)}. Read the entry again before assuming there are no images.` });
  }
  return result;
}
