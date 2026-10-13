import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { DEFAULT_PINGS, type PingPreferences } from '@/lib/deskNotificationRouting';

export function usePingPreferences() {
  const { user } = useAuth();
  const client = useQueryClient();
  const key = ['desk', 'ping-preferences', user?.id];
  const query = useQuery({ queryKey: key, enabled: !!user, queryFn: async () => {
    const result = await supabase.from('cellar_notice_preferences').select('preferences').maybeSingle();
    if (result.error) throw result.error; return { ...DEFAULT_PINGS, utcOffset: -new Date().getTimezoneOffset(), ...result.data?.preferences } as PingPreferences;
  } });
  const write = useMutation({ mutationFn: async (preferences: PingPreferences) => {
    if (!user) throw new Error('Sign in first.');
    const result = await supabase.from('cellar_notice_preferences').upsert({ user_id: user.id, preferences: { ...preferences, utcOffset: -new Date().getTimezoneOffset() } });
    if (result.error) throw result.error;
  }, onSuccess: () => void client.invalidateQueries({ queryKey: key }) });
  return { preferences: query.data ?? DEFAULT_PINGS, busy: !query.data || write.isPending, error: query.error?.message ?? write.error?.message ?? null,
    save: (preferences: PingPreferences) => write.mutate(preferences) };
}
