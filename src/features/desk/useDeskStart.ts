import { useCallback, useState } from 'react';

import type { DeskStart } from '@/lib/deskProtocol';
import { readError } from '@/lib/utils';

import { DeskRefusal } from './deskClient';
import type { DeskLink } from './useDeskLink';
import type { useDeskRuns } from './useDeskRuns';

/**
 * Starting something on the pc, with the one refusal that has an answer.
 *
 * When claude has never been trusted in the folder, the pc says which folder
 * and the start is held: the screen asks claude's question, and yes trusts the
 * folder on the pc and sends the same start again. Any other refusal is said
 * where the button is — never only in a toast, which an open sheet hides.
 */
export function useDeskStart(link: DeskLink, runs: ReturnType<typeof useDeskRuns>, onStarted: () => void) {
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<{ start: DeskStart; folder: string } | null>(null);
  const { start, trust } = runs;

  const failed = useCallback(
    (failure: unknown, request: DeskStart) => {
      if (failure instanceof DeskRefusal && failure.untrusted) {
        setHeld({ start: request, folder: failure.untrusted });
        return;
      }
      const said = readError(failure);
      // Through the cellar the refusal arrives as words only, with nothing to answer it with here.
      setError(/not been trusted/.test(said) && link.via === 'cellar' ? `${said} — trust it from here on the pc's wi-fi, or at the pc` : said);
    },
    [link.via],
  );

  const begin = useCallback(
    (request: DeskStart) => {
      setError(null);
      setHeld(null);
      start.mutate(request, { onSuccess: onStarted, onError: (failure) => failed(failure, request) });
    },
    [start, onStarted, failed],
  );

  const trustAndStart = useCallback(() => {
    if (!held) return;
    trust.mutate(held.folder, {
      onSuccess: () => begin(held.start),
      onError: (failure) => setError(readError(failure)),
    });
  }, [held, trust, begin]);

  const reset = useCallback(() => {
    setError(null);
    setHeld(null);
  }, []);

  return {
    begin,
    trustAndStart,
    reset,
    error,
    /** The folder claude wants trusted before this start can run, while the question is open. */
    untrusted: held?.folder ?? null,
    busy: start.isPending || trust.isPending,
    trusting: trust.isPending,
  };
}
