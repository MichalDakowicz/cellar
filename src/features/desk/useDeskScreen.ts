import { useQuery } from '@tanstack/react-query';

import { useToast } from '@/components/ui/Toast';
import type { DeskRun } from '@/lib/deskProtocol';
import { readError } from '@/lib/utils';
import { useDeskPair } from '@/store/deskPair';

import { useDeskStatus } from './DeskStatusProvider';
import { useDeskLocal } from './useDeskLocal';

/**
 * Everything the pc screen shows, put together so the route only lays it out.
 */
export function useDeskScreen() {
  const { link, runs } = useDeskStatus();
  const local = useDeskLocal(link);
  const forgetPair = useDeskPair((state) => state.forget);
  const { say } = useToast();


  const pairing = useQuery({
    queryKey: ['desk', 'pairing'],
    queryFn: () => link.bridge!.pairing(),
    enabled: link.bridge !== null,
    refetchInterval: 30_000,
  });

  const stop = (run: DeskRun) =>
    runs.stop.mutate(run.id, {
      onSuccess: () => say(`stopped ${run.name}`),
      onError: (error) => say(readError(error)),
    });

  const forgetPhones = async () => {
    await link.bridge?.forgetPhones();
    void pairing.refetch();
    say('every paired phone has to scan again');
  };

  return {
    link,
    runs,
    local,
    pairing: pairing.data ?? null,
    forgetPhones,
    forgetPair: () => {
      forgetPair();
      say('this phone forgot the pc');
    },
    stop,
  };
}
