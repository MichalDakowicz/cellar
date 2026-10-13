import { useQuery } from '@tanstack/react-query';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { pagePath } from '@/lib/deskPreview';
import { screenHint, screenStatus, type ScreenLoad, type ScreenMode } from '@/lib/deskScreen';
import { readError } from '@/lib/utils';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskLink } from './useDeskLink';

/**
 * The live pc screen (`Screen.dc.html`): the picture the pc already streams,
 * turned landscape, with the modes drawn ahead of the pc taking input
 * (docs/desk/TASKS.md W18).
 *
 * The phone turns sideways while this screen is open and back when you leave
 * it; leaving also drops the stream, because the page is unmounted with it.
 */
export function useDeskScreenView() {
  const link = useDeskLink();
  const sample = useDeskPrefs((state) => state.sample);
  const calls = link.can.local && !sample ? link.calls : null;
  const [mode, setMode] = useState<ScreenMode>('touch');
  const [load, setLoad] = useState<ScreenLoad>('connecting');

  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const ticket = useQuery({
    queryKey: ['desk', 'screen-ticket'],
    queryFn: () => calls!.ticket({ kind: 'screen' }),
    enabled: calls !== null,
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  const unreachable = !calls
    ? `${link.name} is not on this network — its screen shows over the same wi-fi`
    : ticket.error
      ? readError(ticket.error)
      : null;
  // The stream never finishes loading, so the page's load event may never
  // come: reaching the screen page after the ticket's redirect is "live". The
  // web's iframe cannot read its own address, so there a ticket is enough.
  const shown: ScreenLoad = Platform.OS === 'web' && ticket.data ? 'live' : load;
  const status = screenStatus(sample ? 'live' : unreachable ? 'gone' : shown);

  return {
    name: sample ? 'michu-pc · sample desk' : link.name,
    sample,
    status,
    url: ticket.data ?? null,
    unreachable,
    mode,
    onMode: setMode,
    hint: screenHint(mode, false),
    page: {
      // Starts connecting; a redirect's second start must not undo "live".
      onLoadStart: () => {},
      onLoad: () => setLoad('live'),
      onError: () => setLoad('gone'),
      onUrl: (url: string) => pagePath(url) === '/screen' && setLoad('live'),
    },
  };
}
