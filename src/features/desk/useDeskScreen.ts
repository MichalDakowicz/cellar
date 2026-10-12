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
  const stop = (run: DeskRun) =>
    runs.stop.mutate(run.id, {
      onSuccess: () => say(`stopped ${run.name}`),
      onError: (error) => say(readError(error)),
    });

  return {
    link,
    runs,
    local,
    forgetPair: () => {
      forgetPair();
      say('this phone forgot the pc');
    },
    stop,
  };
}
