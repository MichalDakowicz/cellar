import { useRouter } from 'expo-router';
import {
  ArrowDownUp,
  ArrowLeft,
  FolderPlus,
  Layers,
  PenLine,
  Rows3,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo } from 'react';

import { isPushedRoute } from '@/components/layout/navDestinations';
import { useCellarPrefs, useCellarSheets } from '@/store/cellarPrefs';

export type NavAction = {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  badge: number;
  /** The alert dot — an action whose effect is currently on. */
  active: boolean;
};

/**
 * The left island: the *one* thing the current screen wants you to do.
 *
 * Every destination gets its own, and they are all different verbs — this is
 * the island that makes the bar feel like it belongs to the screen rather than
 * to the app:
 *
 *   dump      switch between one thought and a raw dump of many
 *   projects  new project on this shelf
 *   inbox     how the pile is sorted
 *   stats     narrow the figures to one shelf
 *   profile   settings
 *
 * On a route pushed out of the tabs it is Back, which is why no pushed screen
 * in this app draws a back button of its own — the bar already has one, in the
 * same place every time.
 */
export function useNavAction(pathname: string, activeTab: string | null): NavAction {
  const router = useRouter();
  const raw = useCellarPrefs((state) => state.raw);
  const setRaw = useCellarPrefs((state) => state.setRaw);
  const sheets = useCellarSheets();

  return useMemo(() => {
    if (activeTab === null || isPushedRoute(pathname)) {
      return {
        Icon: ArrowLeft,
        label: 'back',
        badge: 0,
        active: false,
        onPress: () => (router.canGoBack() ? router.back() : router.navigate('/')),
      };
    }

    switch (activeTab) {
      // The capture mode toggle, not a sheet: it is one bit, it changes what
      // return does, and a sheet between you and a thought you are about to
      // lose is the wrong trade. The glyph shows the mode you are *in*, and the
      // dot marks raw as the non-default one.
      case 'index':
        return {
          Icon: raw ? Rows3 : PenLine,
          label: raw ? 'switch to one thought' : 'switch to a raw dump',
          badge: 0,
          active: raw,
          onPress: () => setRaw(!raw),
        };
      case 'shelf':
        return {
          Icon: FolderPlus,
          label: 'new project',
          badge: 0,
          active: false,
          onPress: () => sheets.newProject?.(null),
        };
      case 'inbox':
        return {
          Icon: ArrowDownUp,
          label: 'sort the inbox',
          badge: 0,
          active: false,
          onPress: () => sheets.inboxSort?.(),
        };
      case 'stats':
        return {
          Icon: Layers,
          label: 'narrow to a shelf',
          badge: 0,
          active: false,
          onPress: () => sheets.statsScope?.(),
        };
      default:
        return {
          Icon: Settings,
          label: 'settings',
          badge: 0,
          active: false,
          onPress: () => router.navigate('/settings'),
        };
    }
  }, [activeTab, pathname, router, raw, setRaw, sheets]);
}
