import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useIsDesktop } from '@/hooks/useResponsive';

/**
 * One settings page (`DeskUsage`/`DeskRecipes`/`DeskHosts`): its title, the
 * line under it, then its sections. On the desktop it sits beside the
 * settings column; on the phone it is pushed from the list.
 */
export function SettingsPage({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  // Beside the settings column there is nowhere to go back to.
  const isDesktop = useIsDesktop();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: navBarSpace + 24 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTop extra={0} />
      <ContentShell maxWidth={MAX_W.text}>
        <View className={`flex-row items-start gap-3 ${gutter}`}>
          {!isDesktop && <ScreenAction />}
          <View className="min-w-0 flex-1 gap-1">
            <Text className="font-sans text-2xl font-bold tracking-tight text-foreground">{title}</Text>
            <Text className="font-sans text-sm text-muted-foreground">{sub}</Text>
          </View>
        </View>
        <View className={gutter}>{children}</View>
      </ContentShell>
    </ScrollView>
  );
}
