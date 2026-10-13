import type { SupabaseClient } from '@supabase/supabase-js';

/** PostgREST's default row cap must not silently discard recipients or pending questions. */
export async function readAll(client: SupabaseClient, table: string, columns = '*', pending = false) {
  const data: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select(columns).order('user_id');
    if (!['cellar_notice_preferences', 'cellar_settings'].includes(table)) query = query.order('id');
    if (pending) query = query.is('answered_at', null).is('dismissed_at', null);
    const page = await query.range(offset, offset + pageSize - 1);
    if (page.error) throw page.error;
    data.push(...page.data ?? []);
    if ((page.data?.length ?? 0) < pageSize) return { data, error: null };
  }
}
