import { supabase } from '@/lib/supabase';

export type ArrangeTable = 'cellar_shelves' | 'cellar_projects' | 'cellar_entries';

/**
 * A drop's writes — only the rows whose number moved (`lib/arrange`). One
 * update each, together: there is no bulk upsert that would not also need
 * every other column of the row, and a drag moves a handful of rows at most.
 */
export async function writePositions(table: ArrangeTable, writes: { id: string; position: number }[]): Promise<void> {
  const results = await Promise.all(
    writes.map((row) => supabase.from(table).update({ position: row.position }).eq('id', row.id)),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
