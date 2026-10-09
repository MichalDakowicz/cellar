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
  const [held, setHeld] = useState<{ starts: DeskStart[]; folder: string } | null>(null);
  const { start, trust } = runs;

  const failed = useCallback(
    (failure: unknown, rest: DeskStart[]) => {
      if (failure instanceof DeskRefusal && failure.untrusted) {
        setHeld({ starts: rest, folder: failure.untrusted });
        return;
      }
      const said = readError(failure);
      // Through the cellar the refusal arrives as words only, with nothing to answer it with here.
      setError(/not been trusted/.test(said) && link.via === 'cellar' ? `${said} — trust it from here on the pc's wi-fi, or at the pc` : said);
    },
    [link.via],
  );

  // Several starts go one after another, so a refusal stops the rest with it:
  // the untrusted folder is the same for all of them, and trusting it sends
  // what was left.
  const begin = useCallback(
    (request: DeskStart | DeskStart[]) => {
      const requests = Array.isArray(request) ? request : [request];
      setError(null);
      setHeld(null);
      void (async () => {
        for (let at = 0; at < requests.length; at += 1) {
          try {
            await start.mutateAsync(requests[at]);
          } catch (failure) {
            failed(failure, requests.slice(at));
            return;
          }
        }
        onStarted();
      })();
    },
    [start, onStarted, failed],
  );

  const trustAndStart = useCallback(() => {
    if (!held) return;
    trust.mutate(held.folder, {
      onSuccess: () => begin(held.starts),
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
