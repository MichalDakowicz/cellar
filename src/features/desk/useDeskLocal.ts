import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import type { TicketFor } from './deskClient';
import type { DeskLink } from './useDeskLink';

/**
 * The three things only the LAN carries: the pc's local pages, its screen,
 * and the builds it can drop to the phone.
 *
 * Each is opened outside the app — a page and the screen in the in-app browser,
 * a build in the system browser, which downloads it and hands it to Android's
 * installer. The app asks the pc for a one-minute ticket first; the link it
 * opens is worthless to anyone who sees it afterwards.
 */
export function useDeskLocal(link: DeskLink) {
  const calls = link.can.local ? link.calls : null;

  const ports = useQuery({
    queryKey: ['desk', 'ports'],
    queryFn: () => calls!.ports(),
    enabled: calls !== null,
    refetchInterval: 15_000,
    retry: false,
  });

  const apks = useQuery({
    queryKey: ['desk', 'apks'],
    queryFn: () => calls!.apks(),
    enabled: calls !== null,
    staleTime: 30_000,
    retry: false,
  });

  const open = useMutation({
    mutationFn: async (what: TicketFor) => {
      if (!calls) throw new Error(`${link.name} is not on this network`);
      const url = await calls.ticket(what);
      if (what.kind === 'apk') await Linking.openURL(url);
      else await WebBrowser.openBrowserAsync(url);
    },
  });

  return {
    available: calls !== null,
    ports: ports.data ?? [],
    apks: apks.data ?? [],
    open,
  };
}
