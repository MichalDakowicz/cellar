import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline } from '@/components/ui/controls';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { useDeskPrefs } from '@/store/deskPrefs';

/**
 * The frame every later desk screen shares (docs/desk/TASKS.md V16): back, an
 * overline, the title and a line under it, then the body. A screen drawn ahead
 * of its wiring shows its body only on the sample desk, and otherwise says
 * what it waits for — never sample data as if it were yours.
 */
export function LaterScreen({
  name,
  overline,
  title,
  sub,
  sampleOnly,
  waitsOn,
  wide = false,
  plainOverline = false,
  bigTitle = false,
  children,
}: {
  /** What it is, said plainly — the heading while the sample desk is off. */
  name: string;
  overline: string;
  title: string;
  sub: string;
  /** Drawn from the sample desk only, until its wiring task. */
  sampleOnly: boolean;
  /** What it waits for, said when the sample desk is off. */
  waitsOn: string;
  wide?: boolean;
  /** The race board's quiet "project · race · …" line instead of the uppercase overline. */
  plainOverline?: boolean;
  /** The night shift's and the desktop boards' `text-2xl` heading. */
  bigTitle?: boolean;
  children: ReactNode;
}) {
  const sample = useDeskPrefs((state) => state.sample);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  // The sidebar names where you are on the desktop; a back pill there is noise.
  const isDesktop = useIsDesktop();
  const shown = !sampleOnly || sample;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace + 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTop />
        <ContentShell maxWidth={wide ? MAX_W.detail : MAX_W.text}>
          <View className={`gap-5 pt-2 ${gutter}`}>
            <View className="flex-row items-start gap-3">
              {!isDesktop && <ScreenAction />}
              <View className="min-w-0 flex-1 gap-1">
                {plainOverline && shown ? (
                  <Text className="font-sans text-xs text-muted-foreground">{overline}</Text>
                ) : (
                  <Overline>{shown ? overline : 'coming'}</Overline>
                )}
                <Text className={`font-sans font-bold leading-tight text-foreground ${bigTitle ? 'text-2xl tracking-tight' : 'text-xl'}`}>{shown ? title : name}</Text>
                {!!(shown ? sub : waitsOn) && <Text className="font-sans text-xs text-muted-foreground">{shown ? sub : waitsOn}</Text>}
              </View>
            </View>
            {shown ? children : <Text className="font-sans text-xs text-muted-foreground">turn on the sample desk in settings › devices and pairing to see it filled in.</Text>}
          </View>
        </ContentShell>
      </ScrollView>
      <AppChrome />
    </View>
  );
}
