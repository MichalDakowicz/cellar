import { usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';

import { RowStyleProvider } from '@/components/cellar/rowStyle';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { rowMetrics, START_TAB_ROUTES } from '@/lib/displayPrefs';

/**
 * The display settings, applied app-wide: how tall an entry row sits and how
 * big its thought reads, for every `EntryCard` under it.
 */
export function CellarDisplay({ children }: { children: ReactNode }) {
  const { settings } = useCellarSettings();
  const value = useMemo(() => rowMetrics(settings.rowDensity, settings.textSize), [settings.rowDensity, settings.textSize]);
  return <RowStyleProvider value={value}>{children}</RowStyleProvider>;
}

/**
 * Where the app opens, when that is not the dump.
 *
 * Once per launch, and only from the index route: a notification that opened
 * an entry, or a link into a project, must land where it pointed, and a tab you
 * went to yourself must never be taken from you by a setting loading late.
 * It waits for the real row rather than the defaults, so it cannot fire on
 * "dump" and then again on what you actually chose.
 */
export function StartTab() {
  const { settings, loading } = useCellarSettings();
  const pathname = usePathname();
  const router = useRouter();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || loading) return;
    done.current = true;
    if (settings.startTab !== 'dump' && pathname === '/') router.replace(START_TAB_ROUTES[settings.startTab] as never);
  }, [loading, settings.startTab, pathname, router]);

  return null;
}
