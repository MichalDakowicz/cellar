import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useNoticeResponses } from '@/store/noticeResponses';

export function useNoticeReceipts() {
  const { user } = useAuth();
  const responses = useNoticeResponses((s) => s.responses);
  const pending = Object.entries(responses).filter(([key, row]) => key.startsWith(`${user?.id}:`) && row.state === 'pending');
  const ids = pending.map(([, r]) => r.commandId);
  const query = useQuery({ queryKey: ['desk', 'notice-receipts', user?.id, ids], enabled: !!user && ids.length > 0, refetchInterval: 3000, queryFn: async () => {
    const result = await supabase.from('cellar_notice_actions').select('id,receipt').in('id', ids);
    if (result.error) throw result.error;
    return pending.map(([key, row]) => ({ key, commandId: row.commandId, receipt: result.data?.find((r) => r.id === row.commandId)?.receipt ?? null, error: row.error }));
  } });
  return { rows: query.data ?? [], error: query.error?.message ?? null, check: () => void query.refetch() };
}
