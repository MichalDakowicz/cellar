import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  cellarSettingsToRow,
  DEFAULT_CELLAR_SETTINGS,
  normalizeCellarSettings,
  type CellarSettings,
  type CellarSettingsRow,
} from '@/lib/cellarSettings';
import { supabase } from '@/lib/supabase';

/** Cellar's own `public.cellar_settings` row. Owner-only, created on first write. */

function key(userId: string | undefined) {
  return ['cellar-settings', userId] as const;
}

async function fetchCellarSettings(userId: string): Promise<CellarSettings> {
  const { data, error } = await supabase
    .from('cellar_settings')
    .select('show_codes, raw_default, remember_last, default_kind, default_view, notify_questions')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return normalizeCellarSettings(data as CellarSettingsRow | null);
}

export function useCellarSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = key(user?.id);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCellarSettings(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Partial<CellarSettings>) => {
      if (!user) throw new Error('not signed in');
      const row = cellarSettingsToRow(patch);
      if (Object.keys(row).length === 0) return;
      const { error } = await supabase
        .from('cellar_settings')
        .upsert({ user_id: user.id, ...row }, { onConflict: 'user_id' });
      if (error) throw error;
    },
    // Optimistic, because these are all toggles: a switch that waits a round
    // trip to move reads as a switch that did not work.
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<CellarSettings>(queryKey);
      queryClient.setQueryData<CellarSettings>(queryKey, { ...(previous ?? DEFAULT_CELLAR_SETTINGS), ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });

  return {
    settings: query.data ?? DEFAULT_CELLAR_SETTINGS,
    loading: query.isLoading,
    updateSettings: mutation.mutateAsync,
  };
}
