import type { SupabaseClient } from '@supabase/supabase-js';
import { readAll } from './scan.ts';

Deno.test('pending scans retain rows beyond the PostgREST page and reapply filters', async () => {
  const rows = Array.from({ length: 1001 }, (_, id) => ({ id }));
  const calls: unknown[][] = [];
  const client = { from(table: string) {
    const filters: string[] = [];
    const query = {
      select() { return query; }, order() { return query; },
      is(column: string) { filters.push(column); return query; },
      range(start: number, end: number) {
        calls.push([table, start, end, ...filters]);
        return Promise.resolve({ data: rows.slice(start, end + 1), error: null });
      },
    };
    return query;
  } } as unknown as SupabaseClient;
  const result = await readAll(client, 'cellar_entry_questions', 'id', true);
  if (result.data.length !== 1001 || calls.length !== 3) throw new Error('Incomplete reconciliation');
  if (calls.some((call) => !call.includes('answered_at') || !call.includes('dismissed_at'))) throw new Error('Missing pending filter');
});
